import os
import json
import re
import signal
import threading
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Try configuring google-generativeai
genai_client = None
if GEMINI_API_KEY:
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        genai_client = genai
    except Exception as e:
        print(f"[Gemini] Error configuring google.generativeai: {e}")


GEMINI_MODEL_CANDIDATES = [
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
]


def _get_gemini_model():
    """Returns an active Gemini model instance, prioritizing working flash models."""
    if not genai_client:
        return None
    for model_name in GEMINI_MODEL_CANDIDATES:
        try:
            return genai_client.GenerativeModel(model_name)
        except Exception:
            continue
    return genai_client.GenerativeModel("gemini-flash-latest")


def _generate_gemini_content(prompt: str, timeout_seconds: int = 12) -> Optional[str]:
    """
    Attempts content generation across candidate models in priority order.
    Each model attempt is limited to timeout_seconds to avoid hanging on Render.
    Automatically catches rate limit (429), not-found (404), or other model errors
    and fails over to the next candidate model before returning None.
    """
    if not genai_client or not GEMINI_API_KEY:
        return None

    last_error = None
    for model_name in GEMINI_MODEL_CANDIDATES:
        result_holder = [None]
        error_holder = [None]

        def _call_model():
            try:
                model = genai_client.GenerativeModel(model_name)
                response = model.generate_content(prompt)
                if response and response.text:
                    result_holder[0] = response.text
            except Exception as e:
                error_holder[0] = e

        thread = threading.Thread(target=_call_model, daemon=True)
        thread.start()
        thread.join(timeout=timeout_seconds)

        if thread.is_alive():
            print(f"[Gemini] Model '{model_name}' timed out after {timeout_seconds}s. Trying next...")
            last_error = TimeoutError(f"{model_name} timed out")
            continue

        if result_holder[0]:
            return result_holder[0]

        if error_holder[0]:
            last_error = error_holder[0]
            print(f"[Gemini] Candidate model '{model_name}' failed: {error_holder[0]}. Trying next candidate...")
            continue

    print(f"[Gemini] All candidate models failed. Last error: {last_error}")
    return None


def _clean_json_response(raw_text: str) -> str:
    """Strip markdown code fences if Gemini wraps JSON in ```json ... ```"""
    raw_text = raw_text.strip()
    if raw_text.startswith("```json"):
        raw_text = raw_text[7:]
    elif raw_text.startswith("```"):
        raw_text = raw_text[3:]
    if raw_text.endswith("```"):
        raw_text = raw_text[:-3]
    return raw_text.strip()


def analyze_communication(user_answer: str, duration_seconds: int = 45) -> Dict[str, Any]:
    """
    Performs communication analysis:
    - Filler words count (um, uh, like, actually, basically, you know, etc.)
    - Answer length & structure
    - Communication score (0 - 100)
    - Actionable suggestions
    """
    answer_clean = user_answer.strip()
    words = re.findall(r"\b[A-Za-z']+\b", answer_clean.lower())
    word_count = len(words)

    filler_terms = ["um", "uh", "like", "actually", "basically", "you know", "sort of", "kind of", "literally", "honestly", "right"]
    filler_counts = {}
    total_fillers = 0

    for term in filler_terms:
        if " " in term:
            count = len(re.findall(r"\b" + re.escape(term) + r"\b", answer_clean.lower()))
        else:
            count = words.count(term)
        if count > 0:
            filler_counts[term] = count
            total_fillers += count

    # Analyze repeated words (immediate repetition like "the the")
    repeated_words = []
    for i in range(len(words) - 1):
        if words[i] == words[i+1] and words[i] not in ["had", "that"]:
            repeated_words.append(words[i])

    # Pacing estimation
    # Normal spoken pace: 120-150 words per minute (~2-2.5 words/sec)
    # In typed interview, 40-150 words is typical.
    if word_count < 15:
        length_penalty = 25
        length_feedback = "Answer is too brief. Provide more technical depth and concrete examples."
    elif word_count > 350:
        length_penalty = 10
        length_feedback = "Answer is slightly verbose. Aim for crisp, focused articulation."
    else:
        length_penalty = 0
        length_feedback = "Good answer length with adequate detail."

    filler_penalty = min(35, total_fillers * 5)
    repetition_penalty = min(15, len(repeated_words) * 5)

    base_score = 95 - filler_penalty - repetition_penalty - length_penalty
    comm_score = max(30.0, min(98.0, float(base_score)))

    suggestions = []
    if total_fillers > 0:
        suggestions.append(f"Reduce filler words ({total_fillers} found: {', '.join(filler_counts.keys())}). Take a brief pause instead.")
    if word_count < 30:
        suggestions.append("Structure answers using the STAR technique (Situation, Task, Action, Result) for stronger impact.")
    if repeated_words:
        suggestions.append(f"Avoid stammering/duplicate words ('{', '.join(set(repeated_words))}').")
    if not suggestions:
        suggestions.append("Great articulation, natural vocabulary, and crisp structure maintained!")

    return {
        "communication_score": round(comm_score, 1),
        "word_count": word_count,
        "duration_seconds": duration_seconds,
        "filler_words_count": total_fillers,
        "filler_breakdown": filler_counts,
        "repeated_words": list(set(repeated_words)),
        "suggestions": suggestions,
        "length_feedback": length_feedback,
    }


def analyze_resume(resume_text: str) -> Dict[str, Any]:
    """
    Extracts skills, experience, education, projects, strengths, improvements,
    calculates a resume score, and generates interview questions.
    """
    if genai_client and GEMINI_API_KEY:
        try:
            prompt = f"""
            You are an expert technical recruiter and resume reviewer. Analyze the following resume text and provide a comprehensive structured review in valid JSON only.

            RESUME TEXT:
            {resume_text[:4000]}

            Return JSON matching EXACTLY this structure:
            {{
              "score": <integer between 40 and 95>,
              "extracted_skills": ["Skill 1", "Skill 2", ...],
              "technologies": ["Tech 1", "Tech 2", ...],
              "projects": [
                {{"title": "Project name", "description": "Short summary", "technologies": ["Tech1", "Tech2"]}}
              ],
              "education": ["Degree/Institution"],
              "experience": ["Role / Company / Duration"],
              "strengths": ["Strength 1", "Strength 2", ...],
              "improvements": ["Area for improvement 1", "Area for improvement 2", ...],
              "generated_questions": [
                "Question 1 based on their resume projects/skills",
                "Question 2 based on their resume projects/skills",
                "Question 3 based on their resume projects/skills"
              ]
            }}
            """
            response_text = _generate_gemini_content(prompt)
            if response_text:
                clean_json = _clean_json_response(response_text)
                parsed = json.loads(clean_json)
                return parsed
        except Exception as e:
            print(f"[Gemini] Error analyzing resume with API: {e}. Using intelligent fallback parser.")

    # Fallback Parser
    text_lower = resume_text.lower()
    common_skills = [
        "python", "javascript", "typescript", "react", "fastapi", "django", "sql", "postgresql",
        "mongodb", "docker", "aws", "git", "rest api", "html", "css", "node.js", "c++", "java",
        "linux", "graphql", "tailwind css", "machine learning", "data structures", "algorithms"
    ]
    extracted = [s.title() for s in common_skills if s in text_lower]
    if not extracted:
        extracted = ["Python", "SQL", "FastAPI", "React", "Git"]

    techs = [s for s in extracted if s.lower() in ["python", "react", "fastapi", "postgresql", "docker", "aws", "node.js", "git"]]

    projects = []
    if "project" in text_lower:
        projects.append({
            "title": "Full Stack Web Application",
            "description": "Architected end-to-end web platform with REST APIs, authentication, and database optimization.",
            "technologies": extracted[:3]
        })
    else:
        projects.append({
            "title": "AI Interview Simulator",
            "description": "Built full-stack AI interview preparation platform with FastAPI and React.",
            "technologies": ["Python", "FastAPI", "React"]
        })

    education = ["Bachelor of Technology / Computer Science"]
    experience = ["1+ years of software development experience or academic projects"]
    strengths = [
        f"Solid foundation in {', '.join(extracted[:3])}.",
        "Good understanding of modern web application architectures and RESTful conventions.",
        "Demonstrated project building experience with real-world tech stacks."
    ]
    improvements = [
        "Include more quantifiable metrics in project outcomes (e.g., latency reduction, user throughput).",
        "Add system design or cloud deployment details (CI/CD, Docker, AWS).",
        "Highlight unit testing and code quality practices."
    ]
    generated_questions = [
        f"Can you explain how you designed the database schema in your {projects[0]['title']} project?",
        f"How do you handle error states and asynchronous requests when using {extracted[0]}?",
        f"Walk me through how you optimize query performance in PostgreSQL when dealing with large datasets.",
        "Describe a challenging bug you encountered in a recent project and how you diagnosed and resolved it."
    ]

    score = min(92, max(65, 60 + len(extracted) * 3))

    return {
        "score": score,
        "extracted_skills": extracted,
        "technologies": techs if techs else extracted[:4],
        "projects": projects,
        "education": education,
        "experience": experience,
        "strengths": strengths,
        "improvements": improvements,
        "generated_questions": generated_questions,
    }


def generate_interview_question(
    role: str,
    difficulty: str,
    interview_type: str,
    question_number: int,
    total_questions: int,
    skills: List[str] = None,
    resume_context: str = "",
    projects: List[Any] = None,
    previous_qa: List[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Generates an interview question dynamically according to target role, difficulty,
    interview type, user skills, resume context, candidate projects, and previous answers.
    """
    # Parse structured project items
    project_items = []
    if projects:
        for p in projects:
            if isinstance(p, dict):
                p_t = p.get("title") or "Full Stack Application"
                p_d = p.get("description") or ""
                p_tech = ", ".join(p.get("technologies", [])) if p.get("technologies") else ""
                tech_str = f" using {p_tech}" if p_tech else ""
                project_items.append({
                    "title": p_t,
                    "tech": p_tech,
                    "desc": p_d,
                    "summary": f"'{p_t}'{tech_str}: {p_d}",
                })
            elif isinstance(p, str) and p.strip():
                project_items.append({
                    "title": p.strip(),
                    "tech": "",
                    "desc": "",
                    "summary": f"'{p.strip()}'",
                })

    project_summary_str = "\n".join([f"- {pi['summary']}" for pi in project_items]) if project_items else "No specific projects listed."

    if genai_client and GEMINI_API_KEY:
        try:
            model = _get_gemini_model()
            prev_summary = ""
            if previous_qa:
                lines = []
                for i, qa in enumerate(previous_qa[-3:], 1):
                    q_t = qa.get("question", "")
                    ans_t = qa.get("answer", "")
                    weak_t = ", ".join(qa.get("weaknesses", []))
                    lines.append(
                        f"Round {i}:\n  Interviewer: {q_t}\n  Candidate Answer: \"{ans_t}\"\n  Areas for follow-up: {weak_t if weak_t else 'Good response'}"
                    )
                prev_summary = "\n".join(lines)

            if question_number == 1:
                proj_mention = f" and key projects ({', '.join(pi['title'] for pi in project_items[:2])})" if project_items else ""
                q_directive = f"""
                1. THIS IS QUESTION 1 (THE OPENING GREETING & RESUME INTRODUCTION):
                   - Warmly greet the candidate and welcome them to their interview for the {role} position.
                   - Explicitly acknowledge that you have reviewed their background, skills ({', '.join(skills[:5]) if skills else 'Software Engineering'}), and uploaded resume projects{proj_mention}.
                   - Invite them to introduce themselves, walk through their technical journey, and highlight key projects they've built.
                   - Do not jump into narrow trivia yet; establish rapport and let them present their background!
                """
            elif question_number == 2 and project_items:
                primary_proj = project_items[0]
                q_directive = f"""
                1. THIS IS QUESTION 2 (PROJECT ARCHITECTURE & CHALLENGES DEEP DIVE):
                   - Focus SPECIFICALLY on the candidate's real project: '{primary_proj["title"]}' (Tech: {primary_proj["tech"] if primary_proj["tech"] else 'their chosen stack'}).
                   - Ask a detailed engineering question about how they architected this project, why they picked this tech stack, and what critical technical challenge, bottleneck, or bug they encountered and how they resolved it.
                   - Explicitly mention the project title '{primary_proj["title"]}' in your question!
                """
            else:
                q_directive = f"""
                1. THIS IS QUESTION {question_number} OF {total_questions} (CORE / ADAPTIVE FOLLOW-UP):
                   - Act like a real interviewer listening attentively to the candidate's last answer.
                   - Acknowledge or probe deeper into what the candidate just explained or missed in their previous response.
                   - Connect your question to the candidate's projects ({project_summary_str}) or pivot to another critical pillar for {role} at {difficulty} difficulty.
                """

            prompt = f"""
            You are a senior hiring manager and lead engineer conducting a realistic live technical interview.
            Candidate Target Role: {role}
            Interview Type: {interview_type} (Technical, HR, or Mixed)
            Current Difficulty Level: {difficulty} (Easy, Medium, Hard)
            Question Number: {question_number} of {total_questions}
            Candidate Skills: {', '.join(skills or ['Python', 'SQL', 'FastAPI', 'React'])}
            Resume Context: {resume_context[:300] if resume_context else 'None'}
            Candidate Resume Projects:
            {project_summary_str}

            PREVIOUS CONVERSATION CONTEXT:
            {prev_summary if prev_summary else 'This is the opening question of the interview.'}

            INSTRUCTIONS FOR THE QUESTION:
            {q_directive}
            2. Make the question sound natural and conversational when spoken aloud by Text-to-Speech.
            3. Return valid JSON only with this structure:
            {{
              "category": "<e.g. Project Architecture, Python, System Design, SQL, FastAPI, DSA, React, Behavioral>",
              "difficulty": "{difficulty}",
              "question_text": "<The engaging, conversational question ready to be spoken aloud>",
              "expected_points": ["Key expected concept 1", "Key concept 2", "Key concept 3"]
            }}
            """
            response_text = _generate_gemini_content(prompt)
            if response_text:
                clean_json = _clean_json_response(response_text)
                return json.loads(clean_json)
        except Exception as e:
            print(f"[Gemini] Error generating question with API: {e}. Using conversational smart pool fallback.")

    # Question #1 for any interview: Warm greeting + Resume walkthrough + Introduction!
    if question_number == 1:
        skill_str = ", ".join(skills[:3]) if skills else "modern software engineering"
        proj_str = f" and projects like '{project_items[0]['title']}'" if project_items else ""
        if resume_context:
            resume_intro = f"I've reviewed your uploaded resume and noticed your background in {resume_context}."
        else:
            resume_intro = f"I've reviewed your profile and see your foundation in {skill_str}{proj_str}."

        return {
            "category": "Introduction & Resume Walkthrough",
            "difficulty": difficulty,
            "question_text": (
                f"Hello and welcome to your interview for the {role} position! {resume_intro} "
                f"To start us off, could you please introduce yourself, walk me through your technical journey, "
                f"and highlight a major project you've worked on and the challenges you tackled?"
            ),
            "expected_points": [
                "Clear professional introduction",
                "Overview of technical stack & journey",
                "Deep dive into a real-world project",
                "Architectural decisions & challenges solved",
            ],
        }

    # Question #2: Dedicated Project Deep Dive when projects are provided!
    if question_number == 2 and project_items:
        primary_proj = project_items[0]
        p_title = primary_proj["title"]
        p_tech = primary_proj["tech"] if primary_proj["tech"] else "your chosen technical stack"
        return {
            "category": "Project Architecture & Deep Dive",
            "difficulty": difficulty,
            "question_text": (
                f"In your resume, you highlighted your project '{p_title}'. Could you walk me through "
                f"the architectural design and component flow of this project? Specifically, what was the most difficult "
                f"technical challenge or performance bottleneck you faced while building it with {p_tech}, and how did you resolve it?"
            ),
            "expected_points": [
                f"High-level architecture and system flow of {p_title}",
                f"Rationale for architectural decisions and trade-offs using {p_tech}",
                "Concrete engineering challenge (e.g., concurrency, DB indexing, state management, latency)",
                "Systematic troubleshooting, solution implementation, and measurable results",
            ],
        }

    # Fallback question bank tailored by role, difficulty, and type for subsequent questions
    role_lower = role.lower()
    if interview_type == "HR" or (interview_type == "Mixed" and question_number == total_questions):
        hr_pool = {
            "Easy": [
                {
                    "category": "HR",
                    "difficulty": "Easy",
                    "question_text": "Tell me about yourself and what motivated you to pursue a career in software development.",
                    "expected_points": ["Educational background", "Passion for coding", "Key projects", "Career goals"]
                },
                {
                    "category": "HR",
                    "difficulty": "Easy",
                    "question_text": "How do you handle deadlines and prioritize tasks when you have multiple competing assignments?",
                    "expected_points": ["Time management tools", "Communication with stakeholders", "Breaking tasks down"]
                }
            ],
            "Medium": [
                {
                    "category": "HR",
                    "difficulty": "Medium",
                    "question_text": "Describe a situation where you had a disagreement with a team member or teammate. How did you resolve it?",
                    "expected_points": ["STAR method", "Professionalism", "Active listening", "Focus on shared goals"]
                },
                {
                    "category": "HR",
                    "difficulty": "Medium",
                    "question_text": "Tell me about a time you made a mistake on a project or feature. How did you handle the aftermath and what did you learn?",
                    "expected_points": ["Accountability", "Swift mitigation", "Root cause analysis", "Preventative measures"]
                }
            ],
            "Hard": [
                {
                    "category": "HR",
                    "difficulty": "Hard",
                    "question_text": "Describe a project where requirements changed drastically mid-way through development. How did you pivot and maintain code quality under pressure?",
                    "expected_points": ["Adaptability", "Impact analysis", "Refactoring strategy", "Delivering MVP first"]
                }
            ]
        }
        pool = hr_pool.get(difficulty, hr_pool["Medium"])
        idx = (question_number - 1) % len(pool)
        return pool[idx]

    # Technical Questions Pool
    tech_pool = {
        "Easy": [
            {
                "category": "Python",
                "difficulty": "Easy",
                "question_text": "Explain the difference between mutable and immutable types in Python with examples, and how they behave when passed to functions.",
                "expected_points": ["Lists/dicts are mutable, tuples/strings/ints are immutable", "Call by object reference", "Side effects of mutating arguments"]
            },
            {
                "category": "SQL",
                "difficulty": "Easy",
                "question_text": "What is the difference between INNER JOIN, LEFT JOIN, and FULL OUTER JOIN in relational databases?",
                "expected_points": ["Matching records only in INNER", "All left rows plus matching right in LEFT", "All rows from both with NULLs in FULL OUTER"]
            },
            {
                "category": "React",
                "difficulty": "Easy",
                "question_text": "What is the Virtual DOM in React, and how does reconciliation work to optimize UI rendering?",
                "expected_points": ["In-memory representation of real DOM", "Diffing algorithm", "Batching DOM updates for performance"]
            }
        ],
        "Medium": [
            {
                "category": "FastAPI",
                "difficulty": "Medium",
                "question_text": "How does FastAPI handle asynchronous requests with async def vs regular def, and how does it leverage Starlette and Pydantic under the hood?",
                "expected_points": ["Event loop for async def", "Threadpool executor for def", "Data validation via Pydantic", "High throughput concurrency"]
            },
            {
                "category": "SQL & DBMS",
                "difficulty": "Medium",
                "question_text": "Explain database indexing. What data structure is commonly used for B-Tree indexes, and when might an index degrade performance?",
                "expected_points": ["B-Tree / B+Tree structure", "O(log n) lookup vs O(n) table scan", "Write overhead on INSERT/UPDATE/DELETE", "Covering indexes"]
            },
            {
                "category": "DSA",
                "difficulty": "Medium",
                "question_text": "How would you detect a cycle in a singly linked list with O(1) auxiliary space? Explain the time and space complexity.",
                "expected_points": ["Floyd's Tortoise and Hare algorithm", "Slow and fast pointers", "O(N) time complexity", "O(1) space complexity"]
            },
            {
                "category": "Backend",
                "difficulty": "Medium",
                "question_text": "Explain how JWT (JSON Web Token) authentication works, including its three parts, verification process, and how you prevent token tampering.",
                "expected_points": ["Header, Payload, Signature", "HMAC/RSA cryptographic signing", "Stateless auth", "Short expiration + refresh tokens"]
            }
        ],
        "Hard": [
            {
                "category": "System Design",
                "difficulty": "Hard",
                "question_text": "How would you design a distributed rate limiter that can handle 50,000 requests per second across multiple application server instances?",
                "expected_points": ["Token bucket or sliding window log algorithm", "Redis or Memcached with Lua scripts for atomicity", "Handling clock skew and race conditions", "Fail-open vs fail-closed strategies"]
            },
            {
                "category": "Architecture & Concurrency",
                "difficulty": "Hard",
                "question_text": "Explain the Python Global Interpreter Lock (GIL). How does it affect CPU-bound vs I/O-bound concurrency, and how can you bypass it in Python 3.12+ or using multiprocessing?",
                "expected_points": ["Mutex preventing simultaneous native threads executing Python bytecode", "Multiprocessing vs Asyncio vs C extensions", "Sub-interpreters and free-threaded Python"]
            }
        ]
    }

    pool = tech_pool.get(difficulty, tech_pool["Medium"])
    idx = (question_number - 1) % len(pool)
    return pool[idx]


def evaluate_answer(
    question_text: str,
    category: str,
    difficulty: str,
    user_answer: str,
    role: str = "Software Engineer",
    duration_seconds: int = 45,
    sample_answer: str = "",
    explanation: str = "",
) -> Dict[str, Any]:
    """
    Evaluates user interview answer.
    Returns:
    - score (1-10)
    - technical_correctness (1-10)
    - relevance (1-10)
    - completeness (1-10)
    - strengths (list)
    - weaknesses (list)
    - better_answer (str)
    - improvement_suggestion (str)
    - filler_words_count (int)
    - communication_score (float)
    - communication_feedback (list)
    """
    comm_analysis = analyze_communication(user_answer, duration_seconds)

    if genai_client and GEMINI_API_KEY:
        try:
            ref_info = ""
            if sample_answer:
                ref_info += f"\nREFERENCE / SAMPLE ANSWER:\n{sample_answer}"
            if explanation:
                ref_info += f"\nCONCEPT EXPLANATION & KEY CONCEPTS:\n{explanation}"

            prompt = f"""
            You are a senior technical interviewer for a {role} position.
            Evaluate the candidate's answer to the following practice interview question.

            QUESTION ({category}, Difficulty: {difficulty}):
            "{question_text}"
            {ref_info}

            CANDIDATE ANSWER:
            "{user_answer}"

            Evaluation Guidelines:
            1. Assess technical accuracy, conceptual correctness, and relevance.
            2. If reference / sample answer is provided, check whether the candidate captures the key points or core concepts.
            3. DO NOT penalize conciseness! A clear, concise, accurate answer (even 1-2 sentences) SHOULD receive a high score (8.0 to 10.0).
            4. If the candidate correctly states the difference, definition, or premise, score MUST be >= 7.5.
            5. Only assign a low or failing score (< 6.5) if the answer is factually incorrect, completely irrelevant, or severely misleading.

            Evaluate thoroughly and return valid JSON ONLY with this exact schema:
            {{
              "score": <float between 1.0 and 10.0, where >= 6.5 is passing/correct>,
              "technical_correctness": <float between 1.0 and 10.0>,
              "relevance": <float between 1.0 and 10.0>,
              "completeness": <float between 1.0 and 10.0>,
              "strengths": ["Clear strength 1", "Strength 2"],
              "weaknesses": ["Weakness or missing concept 1"],
              "better_answer": "A concise, industry-standard model answer that scores 10/10.",
              "improvement_suggestion": "Actionable advice on how to improve this answer."
            }}
            """
            response_text = _generate_gemini_content(prompt)
            if response_text:
                clean_json = _clean_json_response(response_text)
                eval_data = json.loads(clean_json)

                # Merge communication analysis and ensure valid numeric types
                raw_score = float(eval_data.get("score", 7.5))
                eval_data["score"] = round(raw_score, 1)
                eval_data["technical_correctness"] = round(float(eval_data.get("technical_correctness", raw_score)), 1)
                eval_data["relevance"] = round(float(eval_data.get("relevance", 8.0)), 1)
                eval_data["completeness"] = round(float(eval_data.get("completeness", 7.5)), 1)
                eval_data["strengths"] = eval_data.get("strengths") or ["Accurately identified core technical principles."]
                eval_data["weaknesses"] = eval_data.get("weaknesses") or ["Could expand on low-level memory mechanics or trade-offs."]
                eval_data["better_answer"] = eval_data.get("better_answer") or sample_answer or "A concise, accurate answer."
                eval_data["improvement_suggestion"] = eval_data.get("improvement_suggestion") or "Great answer; consider providing concrete examples."
                eval_data["filler_words_count"] = comm_analysis["filler_words_count"]
                eval_data["communication_score"] = comm_analysis["communication_score"]
                eval_data["communication_feedback"] = comm_analysis["suggestions"]
                return eval_data
        except Exception as e:
            print(f"[Gemini] Error evaluating answer with API: {e}. Using intelligent semantic fallback evaluator.")

    # Simple fallback — Gemini is the primary evaluator; if it fails, give a fair default
    # instead of the harsh algorithmic evaluator
    print(f"[Evaluate] Gemini unavailable, using fair default score for practice.")
    better_answer = sample_answer if sample_answer else (
        f"A comprehensive response should explain the core concept clearly with examples."
    )

    return {
        "score": 7.0,
        "technical_correctness": 7.0,
        "relevance": 7.0,
        "completeness": 7.0,
        "strengths": ["Answer submitted successfully."],
        "weaknesses": ["AI evaluation temporarily unavailable — please retry for detailed feedback."],
        "better_answer": better_answer,
        "improvement_suggestion": "Try again in a moment for AI-powered detailed feedback.",
        "filler_words_count": comm_analysis["filler_words_count"],
        "communication_score": comm_analysis["communication_score"],
        "communication_feedback": comm_analysis["suggestions"],
    }


def generate_interview_summary(
    role: str,
    questions_and_evals: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Summarizes the entire mock interview, aggregating scores and providing
    actionable study topics, strengths, and weaknesses.
    """
    if not questions_and_evals:
        return {
            "overall_score": 7.0,
            "technical_score": 7.0,
            "communication_score": 75.0,
            "relevance_score": 7.5,
            "completeness_score": 7.0,
            "strengths": ["Completed mock interview session."],
            "weaknesses": ["More practice needed."],
            "mistakes": [],
            "ai_summary": "Session completed.",
            "recommended_topics": ["General Revision"]
        }

    total = len(questions_and_evals)
    avg_overall = sum(q["score"] for q in questions_and_evals) / total
    avg_tech = sum(q.get("technical_correctness", q["score"]) for q in questions_and_evals) / total
    avg_relevance = sum(q.get("relevance", q["score"]) for q in questions_and_evals) / total
    avg_completeness = sum(q.get("completeness", q["score"]) for q in questions_and_evals) / total
    avg_comm = sum(q.get("communication_score", 75.0) for q in questions_and_evals) / total

    all_strengths = []
    all_weaknesses = []
    all_mistakes = []
    all_topics = []

    for q in questions_and_evals:
        all_topics.append(q.get("category", "Technical"))
        for s in q.get("strengths", []):
            if s not in all_strengths:
                all_strengths.append(s)
        for w in q.get("weaknesses", []):
            if w not in all_weaknesses:
                all_weaknesses.append(w)
        if q.get("score", 10) < 7.0:
            all_mistakes.append(f"Difficulty with {q.get('category', 'topic')}: {q.get('weaknesses', ['Needs review'])[0]}")

    recommended_topics = list(set([f"Advanced {t}" if avg_tech >= 7.5 else f"Fundamentals of {t}" for t in all_topics]))[:4]

    summary_text = (
        f"The candidate demonstrated a { 'solid' if avg_overall >= 7.5 else 'developing' } grasp of core competencies "
        f"for the {role} role with an overall score of {round(avg_overall, 1)}/10. Communication was rated at "
        f"{round(avg_comm, 1)}%. Key strengths included strong clarity on fundamental concepts, while areas for growth "
        f"include expanding on internal implementation mechanics and edge cases."
    )

    return {
        "overall_score": round(avg_overall, 1),
        "technical_score": round(avg_tech, 1),
        "communication_score": round(avg_comm, 1),
        "relevance_score": round(avg_relevance, 1),
        "completeness_score": round(avg_completeness, 1),
        "strengths": all_strengths[:5],
        "weaknesses": all_weaknesses[:5],
        "mistakes": all_mistakes[:5],
        "ai_summary": summary_text,
        "recommended_topics": recommended_topics,
    }
