import os
import json
from sqlalchemy.orm import Session
from app.database import engine, SessionLocal, Base
from app.models import User, Profile, PracticeQuestion, CodingProblem, Interview, InterviewQuestion, InterviewResponse, AIEvaluation, InterviewEvent, Report
from app.auth import get_password_hash
from datetime import datetime, timedelta

def seed_database():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # Check if already seeded
        if db.query(PracticeQuestion).count() > 0:
            print("[Seed] Database already seeded.")
            return

        print("[Seed] Seeding initial data...")

        # 1. Create Default Demo User
        demo_user = db.query(User).filter(User.email == "srinivas@example.com").first()
        if not demo_user:
            demo_user = User(
                name="Srinivas Kandagatla",
                email="srinivas@example.com",
                hashed_password=get_password_hash("password123")
            )
            db.add(demo_user)
            db.commit()
            db.refresh(demo_user)

            demo_profile = Profile(
                user_id=demo_user.id,
                phone="+91 98765 43210",
                education="B.Tech in Computer Science, 2024",
                experience_level="Mid-level",
                target_role="Full Stack Developer",
                skills=["Python", "FastAPI", "React", "TypeScript", "PostgreSQL", "Docker", "SQL", "Tailwind CSS"],
                projects=[
                    {
                        "title": "AI Interview Simulator",
                        "description": "Full-stack AI mock interview platform featuring adaptive question flows, ReportLab PDF reporting, and Judge0 coding sandbox.",
                        "technologies": ["React", "FastAPI", "PostgreSQL", "Gemini API", "Judge0"]
                    },
                    {
                        "title": "Real-time Collaboration Platform",
                        "description": "WebSocket-driven interactive workspace with document state synchronization.",
                        "technologies": ["Python", "WebSockets", "Redis", "React"]
                    }
                ]
            )
            db.add(demo_profile)
            db.commit()

        # 2. Seed Practice Questions
        practice_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app", "data", "practice_questions.json")
        if os.path.exists(practice_file):
            with open(practice_file, "r", encoding="utf-8") as f:
                practice_data = json.load(f)
        else:
            practice_data = [
            # Python
            {
                "category": "Python",
                "difficulty": "Easy",
                "title": "Mutable vs Immutable Types",
                "question_text": "What is the difference between mutable and immutable data types in Python? Provide examples of each.",
                "explanation": "Mutable objects can be modified in-place after creation (e.g. lists, dicts, sets). Immutable objects cannot be altered after creation (e.g. ints, floats, strings, tuples). Modifying an immutable object creates a new object in memory.",
                "sample_answer": "In Python, mutable objects like lists (`[1, 2]`) and dictionaries (`{'a': 1}`) allow their values or size to change without altering their memory identity (`id()`). Immutable objects such as tuples (`(1, 2)`), strings, and integers cannot be changed; any modification creates a new object.",
                "tags": ["python", "basics", "memory"]
            },
            {
                "category": "Python",
                "difficulty": "Medium",
                "title": "Generators & Yield Keyword",
                "question_text": "How do generators work in Python, and how does `yield` differ from `return`? When should you prefer generators?",
                "explanation": "`yield` suspends the function execution and returns a value to the caller, preserving its state (local variables) for when `next()` is called again. Generators yield items lazily, saving memory when processing massive streams or files.",
                "sample_answer": "Generators produce values on the fly instead of constructing full collections in RAM. When a generator encounters `yield`, it returns the current value and pauses state. This achieves O(1) memory complexity for large streams.",
                "tags": ["python", "generators", "memory-optimization"]
            },
            {
                "category": "Python",
                "difficulty": "Hard",
                "title": "Global Interpreter Lock (GIL) & Concurrency",
                "question_text": "Explain Python's Global Interpreter Lock (GIL). What are its implications on CPU-bound vs I/O-bound tasks, and how can one bypass it?",
                "explanation": "The GIL is a mutex protecting access to Python objects, preventing multiple native threads from executing Python bytecode simultaneously. For I/O-bound tasks, `asyncio` or `threading` release the GIL during network/disk calls. For CPU-bound tasks, `multiprocessing` or native C extensions bypass the GIL.",
                "sample_answer": "The GIL ensures thread-safety for CPython's reference counting memory management. It limits CPU-bound multithreading to a single core. To bypass it for CPU-heavy tasks, use `multiprocessing` or sub-interpreters in Python 3.12+.",
                "tags": ["python", "concurrency", "gil", "architecture"]
            },

            # Java
            {
                "category": "Java",
                "difficulty": "Easy",
                "title": "equals() vs == Operator",
                "question_text": "What is the difference between the `==` operator and the `.equals()` method in Java?",
                "explanation": "`==` checks for reference equality (whether both references point to the exact same memory address). `.equals()` checks for value/state equality as defined by the class implementation.",
                "sample_answer": "`==` tests reference identity (memory address equality), whereas `equals()` tests semantic or logical equality between objects (e.g. comparing the characters of two String instances).",
                "tags": ["java", "oop", "basics"]
            },
            {
                "category": "Java",
                "difficulty": "Medium",
                "title": "HashMap Internal Working",
                "question_text": "How does Java HashMap work internally in Java 8+? Explain hashing, collision handling, and treeification.",
                "explanation": "HashMap uses an array of Node buckets. Key hash is computed and mapped to an index. Collisions use linked lists. In Java 8, when a bucket exceeds 8 nodes and array capacity is >= 64, it treeifies into a Red-Black Tree for O(log n) lookup.",
                "sample_answer": "Java HashMap hashes keys to determine bucket indices. In Java 8, hash collisions initially form singly linked lists. Once a bucket's size hits 8, it converts to a Red-Black Tree, reducing worst-case lookup from O(N) to O(log N).",
                "tags": ["java", "collections", "hashmap", "data-structures"]
            },

            # JavaScript
            {
                "category": "JavaScript",
                "difficulty": "Easy",
                "title": "var vs let vs const",
                "question_text": "Explain the differences between `var`, `let`, and `const` in modern JavaScript with respect to scoping and hoisting.",
                "explanation": "`var` is function-scoped and hoisted with undefined. `let` and `const` are block-scoped and hoisted into the Temporal Dead Zone (TDZ). `const` prevents reassignment of the variable identifier.",
                "sample_answer": "`var` is function-scoped and hoists to `undefined`. `let` and `const` have block scope `{}` and cannot be accessed before declaration due to the Temporal Dead Zone. `const` also requires immediate initialization and cannot be reassigned.",
                "tags": ["javascript", "es6", "scoping"]
            },
            {
                "category": "JavaScript",
                "difficulty": "Medium",
                "title": "Event Loop & Microtask Queue",
                "question_text": "How does the JavaScript Event Loop work? What is the execution priority between Call Stack, Microtasks (Promises), and Macrotasks (setTimeout)?",
                "explanation": "Synchronous code on the Call Stack executes first. When the stack is empty, all queued Microtasks (Promise.then, queueMicrotask) are drained before the next Macrotask (setTimeout, setInterval, I/O) is processed.",
                "sample_answer": "JavaScript runs on a single-threaded event loop. Execution order is: 1) Synchronous Call Stack, 2) Complete Microtask queue (Promises, MutationObserver), 3) One Macrotask from Task Queue (setTimeout, I/O), repeating cyclically.",
                "tags": ["javascript", "async", "event-loop"]
            },

            # React
            {
                "category": "React",
                "difficulty": "Easy",
                "title": "Virtual DOM and Reconciliation",
                "question_text": "What is the Virtual DOM in React, and how does the reconciliation algorithm update the browser UI efficiently?",
                "explanation": "The Virtual DOM is a lightweight in-memory representation of real DOM nodes. On state change, React creates a new tree, diffs it against previous tree using heuristic O(N) algorithm, and batches minimal mutations to the real DOM.",
                "sample_answer": "The Virtual DOM is an abstraction of the browser DOM. When component state changes, React generates a new VDOM, compares it with the previous snapshot (diffing), and performs batch updates to the real DOM only where changes occurred.",
                "tags": ["react", "virtual-dom", "rendering"]
            },
            {
                "category": "React",
                "difficulty": "Medium",
                "title": "useEffect Hook Dependencies & Cleanup",
                "question_text": "Explain how `useEffect` works in React. Why is the dependency array important, and when does the cleanup function execute?",
                "explanation": "`useEffect` lets functional components perform side effects. Omitted dependency array runs after every render; empty array `[]` runs on mount; specified dependencies run when values change. Cleanup runs prior to component unmount or before re-running the effect.",
                "sample_answer": "`useEffect` manages lifecycle side-effects (subscriptions, DOM mutations, data fetching). The dependency array ensures the effect only re-executes when specified values change. Returning a cleanup function cancels timers or WebSocket subscriptions before unmounting or re-running.",
                "tags": ["react", "hooks", "lifecycle"]
            },

            # FastAPI
            {
                "category": "FastAPI",
                "difficulty": "Easy",
                "title": "Pydantic Validation in FastAPI",
                "question_text": "How does FastAPI utilize Pydantic models for request validation and serialization?",
                "explanation": "FastAPI uses Pydantic models in route parameters. Incoming JSON requests are automatically parsed, type-checked, and validated. Invalid inputs return standard 422 Unprocessable Entity errors with detailed validation traces.",
                "sample_answer": "Pydantic provides declarative data schemas using Python type annotations. FastAPI validates incoming payloads against these schemas automatically, parses query/body params, and formats outbound responses according to `response_model`.",
                "tags": ["fastapi", "pydantic", "validation"]
            },
            {
                "category": "FastAPI",
                "difficulty": "Medium",
                "title": "Dependency Injection with Depends",
                "question_text": "Explain FastAPI's Dependency Injection system (`Depends`). How does it facilitate database sessions and security checks?",
                "explanation": "`Depends` allows modular sharing of logic like database sessions, authentication, and permission checks. Dependencies can be nested and support yield for automatic teardown (closing DB connections).",
                "sample_answer": "FastAPI's `Depends` resolves shared parameters before executing route handlers. For database sessions, a dependency yields a session and guarantees its closure in a `finally` block, ensuring zero connection leaks and clean separation of concerns.",
                "tags": ["fastapi", "dependency-injection", "architecture"]
            },

            # SQL
            {
                "category": "SQL",
                "difficulty": "Easy",
                "title": "SQL Joins: INNER, LEFT, RIGHT, FULL",
                "question_text": "Differentiate between INNER JOIN, LEFT JOIN, RIGHT JOIN, and FULL OUTER JOIN with real-world examples.",
                "explanation": "INNER JOIN returns records with matching keys in both tables. LEFT JOIN returns all records from left table and matched from right. RIGHT JOIN returns all from right. FULL OUTER returns all records when there is a match in either table.",
                "sample_answer": "INNER JOIN yields rows matching both tables. LEFT JOIN preserves every row from the left table, filling right table columns with NULL if no match exists. FULL OUTER JOIN retains all records from both tables regardless of match.",
                "tags": ["sql", "joins", "queries"]
            },
            {
                "category": "SQL",
                "difficulty": "Medium",
                "title": "Indexes & Performance Optimization",
                "question_text": "What are B-Tree indexes in relational databases, and what are the trade-offs of adding multiple indexes on a table?",
                "explanation": "B-Tree indexes maintain sorted tree structures providing O(log n) lookups and range scans. Trade-off: indexes speed up SELECT queries but add write latency to INSERT, UPDATE, and DELETE operations while consuming disk space.",
                "sample_answer": "B-Tree indexes allow the query planner to binary search records instead of performing costly full table scans. While drastically improving read latency on filtered columns, they introduce write overhead on every INSERT/UPDATE/DELETE and consume storage.",
                "tags": ["sql", "indexing", "performance"]
            },

            # DSA
            {
                "category": "DSA",
                "difficulty": "Easy",
                "title": "Array vs Linked List Complexity",
                "question_text": "Compare Arrays and Singly Linked Lists regarding access, search, insertion, and deletion time complexities.",
                "explanation": "Arrays provide O(1) random access by index, but O(N) insertion/deletion (due to element shifting). Linked Lists require O(N) access/search, but O(1) insertion/deletion once the pointer to the target node is known.",
                "sample_answer": "Arrays offer O(1) random memory access but O(N) arbitrary insertions due to element shifts. Singly Linked Lists offer O(1) head insertion/deletion but require O(N) sequential traversal to access arbitrary elements.",
                "tags": ["dsa", "arrays", "linked-lists"]
            },
            {
                "category": "DSA",
                "difficulty": "Medium",
                "title": "Cycle Detection in Linked Lists",
                "question_text": "How do you detect a cycle in a linked list in O(N) time and O(1) auxiliary memory? Explain the algorithm.",
                "explanation": "Floyd's Cycle-Finding Algorithm (Tortoise and Hare) uses two pointers: slow moves 1 step, fast moves 2 steps. If a cycle exists, fast will eventually lap and meet slow.",
                "sample_answer": "Use Floyd's Tortoise and Hare algorithm. Initialize slow and fast pointers at the head. Advance slow by 1 node and fast by 2 nodes per iteration. If fast reaches NULL, there is no cycle. If fast and slow collide, a cycle exists.",
                "tags": ["dsa", "pointers", "algorithms"]
            },

            # DBMS
            {
                "category": "DBMS",
                "difficulty": "Medium",
                "title": "ACID Properties in Relational Databases",
                "question_text": "Explain the ACID properties of database transactions and why each is essential for financial or critical applications.",
                "explanation": "Atomicity (all or nothing), Consistency (preserves schema constraints), Isolation (concurrent transactions execute independently without dirty reads), Durability (committed changes persist even during system crashes).",
                "sample_answer": "ACID guarantees transactional integrity. Atomicity ensures all operations succeed or roll back entirely. Consistency enforces integrity rules. Isolation prevents concurrent conflicts (e.g. dirty reads). Durability guarantees committed data survives server crashes.",
                "tags": ["dbms", "acid", "transactions"]
            },

            # HR
            {
                "category": "HR",
                "difficulty": "Easy",
                "title": "Tell Me About Yourself",
                "question_text": "How do you structure your answer to the common opening interview prompt: 'Tell me about yourself'?",
                "explanation": "Use the Present-Past-Future framework: Briefly mention your current role and strengths, touch upon key past achievements and projects, and explain why you are excited for this specific opportunity.",
                "sample_answer": "Structure using Present, Past, Future: 1) Who you are today and core focus, 2) Key past milestones, technical problem solved, and experience gained, 3) Why this specific position aligns with your trajectory and how you can add immediate value.",
                "tags": ["hr", "behavioral", "introduction"]
            },
            {
                "category": "HR",
                "difficulty": "Medium",
                "title": "Conflict Resolution in Engineering Teams",
                "question_text": "Describe how you approach a situation where you and a senior engineer disagree on a technical design or technology choice.",
                "explanation": "Use the STAR method (Situation, Task, Action, Result). Focus on objective data, benchmarks, trade-offs, respectful communication, alignment with product goals, and disagreeing & committing.",
                "sample_answer": "I focus on objective trade-offs rather than opinions. I evaluate both options using measurable criteria (latency, developer ergonomics, maintenance cost), build a quick prototype or benchmark if needed, and align with the team's overarching mission.",
                "tags": ["hr", "behavioral", "teamwork"]
            }
        ]

        for p in practice_data:
            q = PracticeQuestion(
                category=p["category"],
                difficulty=p["difficulty"],
                title=p["title"],
                question_text=p["question_text"],
                explanation=p["explanation"],
                sample_answer=p["sample_answer"],
                tags=p["tags"]
            )
            db.add(q)
        db.commit()
        print(f"[Seed] Successfully seeded {len(practice_data)} practice questions.")

        # 3. Seed LeetCode-Style Coding Problems
        coding_data = [
            {
                "title": "Two Sum",
                "slug": "two-sum",
                "difficulty": "Easy",
                "category": "Arrays & Hashing",
                "description": "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nOutput the indices separated by a space.",
                "constraints": "• 2 <= nums.length <= 10^4\n• -10^9 <= nums[i] <= 10^9\n• Only one valid answer exists.",
                "examples": [
                    {"input": "2 7 11 15\n9", "output": "0 1", "explanation": "nums[0] + nums[1] == 9, so return 0 1."},
                    {"input": "3 2 4\n6", "output": "1 2", "explanation": "nums[1] + nums[2] == 6, so return 1 2."}
                ],
                "starter_templates": {
                    "python": "import sys\n\ndef two_sum(nums, target):\n    # Write your solution here\n    seen = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in seen:\n            return f\"{seen[diff]} {i}\"\n        seen[num] = i\n    return \"\"\n\nif __name__ == '__main__':\n    lines = sys.stdin.read().strip().split('\\n')\n    if len(lines) >= 2:\n        nums = list(map(int, lines[0].split()))\n        target = int(lines[1])\n        print(two_sum(nums, target))\n",
                    "javascript": "const fs = require('fs');\n\nfunction twoSum(nums, target) {\n    const map = new Map();\n    for (let i = 0; i < nums.length; i++) {\n        const complement = target - nums[i];\n        if (map.has(complement)) {\n            return `${map.get(complement)} ${i}`;\n        }\n        map.set(nums[i], i);\n    }\n    return '';\n}\n\nconst input = fs.readFileSync(0, 'utf-8').trim().split('\\n');\nif (input.length >= 2) {\n    const nums = input[0].split(' ').map(Number);\n    const target = Number(input[1]);\n    console.log(twoSum(nums, target));\n}\n",
                    "java": "import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextLine()) {\n            String[] parts = sc.nextLine().split(\" \");\n            int target = sc.nextInt();\n            Map<Integer, Integer> map = new HashMap<>();\n            for (int i = 0; i < parts.length; i++) {\n                int num = Integer.parseInt(parts[i]);\n                int diff = target - num;\n                if (map.containsKey(diff)) {\n                    System.out.println(map.get(diff) + \" \" + i);\n                    return;\n                }\n                map.put(num, i);\n            }\n        }\n    }\n}\n"
                },
                "test_cases": [
                    {"input": "2 7 11 15\n9", "expected_output": "0 1", "is_hidden": False},
                    {"input": "3 2 4\n6", "expected_output": "1 2", "is_hidden": False},
                    {"input": "3 3\n6", "expected_output": "0 1", "is_hidden": True}
                ]
            },
            {
                "title": "Valid Palindrome",
                "slug": "valid-palindrome",
                "difficulty": "Easy",
                "category": "Two Pointers",
                "description": "A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.\n\nGiven a string `s`, return `true` if it is a palindrome, or `false` otherwise.",
                "constraints": "• 1 <= s.length <= 2 * 10^5\n• `s` consists only of printable ASCII characters.",
                "examples": [
                    {"input": "A man, a plan, a canal: Panama", "output": "true", "explanation": "\"amanaplanacanalpanama\" is a palindrome."},
                    {"input": "race a car", "output": "false", "explanation": "\"raceacar\" is not a palindrome."}
                ],
                "starter_templates": {
                    "python": "import sys, re\n\ndef is_palindrome(s: str) -> bool:\n    clean = re.sub(r'[^a-zA-Z0-9]', '', s).lower()\n    return clean == clean[::-1]\n\nif __name__ == '__main__':\n    line = sys.stdin.read().strip()\n    print(\"true\" if is_palindrome(line) else \"false\")\n",
                    "javascript": "const fs = require('fs');\nconst s = fs.readFileSync(0, 'utf-8').trim();\nconst clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');\nconsole.log(clean === clean.split('').reverse().join('') ? 'true' : 'false');\n",
                    "java": "import java.util.*;\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String s = sc.nextLine().replaceAll(\"[^a-zA-Z0-9]\", \"\").toLowerCase();\n        String rev = new StringBuilder(s).reverse().toString();\n        System.out.println(s.equals(rev) ? \"true\" : \"false\");\n    }\n}\n"
                },
                "test_cases": [
                    {"input": "A man, a plan, a canal: Panama", "expected_output": "true", "is_hidden": False},
                    {"input": "race a car", "expected_output": "false", "is_hidden": False},
                    {"input": "Was it a car or a cat I saw?", "expected_output": "true", "is_hidden": True}
                ]
            },
            {
                "title": "Maximum Subarray",
                "slug": "maximum-subarray",
                "difficulty": "Medium",
                "category": "Dynamic Programming",
                "description": "Given an integer array `nums`, find the subarray with the largest sum, and return its sum (Kadane's Algorithm).",
                "constraints": "• 1 <= nums.length <= 10^5\n• -10^4 <= nums[i] <= 10^4",
                "examples": [
                    {"input": "-2 1 -3 4 -1 2 1 -5 4", "output": "6", "explanation": "Subarray [4,-1,2,1] has the largest sum 6."}
                ],
                "starter_templates": {
                    "python": "import sys\n\ndef max_sub_array(nums):\n    max_sum = current_sum = nums[0]\n    for x in nums[1:]:\n        current_sum = max(x, current_sum + x)\n        max_sum = max(max_sum, current_sum)\n    return max_sum\n\nif __name__ == '__main__':\n    line = sys.stdin.read().strip()\n    if line:\n        nums = list(map(int, line.split()))\n        print(max_sub_array(nums))\n",
                    "javascript": "const fs = require('fs');\nconst line = fs.readFileSync(0, 'utf-8').trim();\nconst nums = line.split(' ').map(Number);\nlet max = nums[0], curr = nums[0];\nfor (let i = 1; i < nums.length; i++) {\n    curr = Math.max(nums[i], curr + nums[i]);\n    max = Math.max(max, curr);\n}\nconsole.log(max);\n",
                    "java": "import java.util.*;\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String[] parts = sc.nextLine().split(\" \");\n        int max = Integer.parseInt(parts[0]);\n        int curr = max;\n        for (int i = 1; i < parts.length; i++) {\n            int x = Integer.parseInt(parts[i]);\n            curr = Math.max(x, curr + x);\n            max = Math.max(max, curr);\n        }\n        System.out.println(max);\n    }\n}\n"
                },
                "test_cases": [
                    {"input": "-2 1 -3 4 -1 2 1 -5 4", "expected_output": "6", "is_hidden": False},
                    {"input": "1", "expected_output": "1", "is_hidden": False},
                    {"input": "5 4 -1 7 8", "expected_output": "23", "is_hidden": True}
                ]
            },
            {
                "title": "Contains Duplicate",
                "slug": "contains-duplicate",
                "difficulty": "Easy",
                "category": "Arrays & Hashing",
                "description": "Given an integer array `nums`, return `true` if any value appears at least twice in the array, and return `false` if every element is distinct.",
                "constraints": "• 1 <= nums.length <= 10^5\n• -10^9 <= nums[i] <= 10^9",
                "examples": [
                    {"input": "1 2 3 1", "output": "true", "explanation": "1 appears twice."},
                    {"input": "1 2 3 4", "output": "false", "explanation": "All elements distinct."}
                ],
                "starter_templates": {
                    "python": "import sys\n\ndef contains_duplicate(nums):\n    return len(nums) != len(set(nums))\n\nif __name__ == '__main__':\n    line = sys.stdin.read().strip()\n    nums = list(map(int, line.split())) if line else []\n    print(\"true\" if contains_duplicate(nums) else \"false\")\n",
                    "javascript": "const fs = require('fs');\nconst line = fs.readFileSync(0, 'utf-8').trim();\nconst nums = line.split(' ').map(Number);\nconst set = new Set(nums);\nconsole.log(set.size !== nums.length ? 'true' : 'false');\n",
                    "java": "import java.util.*;\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String[] parts = sc.nextLine().split(\" \");\n        Set<String> set = new HashSet<>(Arrays.asList(parts));\n        System.out.println(set.size() != parts.length ? \"true\" : \"false\");\n    }\n}\n"
                },
                "test_cases": [
                    {"input": "1 2 3 1", "expected_output": "true", "is_hidden": False},
                    {"input": "1 2 3 4", "expected_output": "false", "is_hidden": False}
                ]
            }
        ]

        coding_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app", "data", "coding_problems.json")
        if os.path.exists(coding_file):
            with open(coding_file, "r", encoding="utf-8") as f:
                coding_data = json.load(f)

        for c in coding_data:
            prob = CodingProblem(
                title=c["title"],
                slug=c["slug"],
                difficulty=c["difficulty"],
                category=c["category"],
                pattern=c.get("pattern"),
                strategy=c.get("strategy"),
                identification=c.get("identification"),
                reference=c.get("reference"),
                leetcode_url=c.get("leetcode_url"),
                gfg_url=c.get("gfg_url"),
                youtube_url=c.get("youtube_url"),
                companies=c.get("companies", []),
                description=c["description"],
                constraints=c["constraints"],
                examples=c.get("examples", []),
                starter_templates=c.get("starter_templates", {}),
                test_cases=c.get("test_cases", [])
            )
            db.add(prob)
        db.commit()
        print(f"[Seed] Successfully seeded {len(coding_data)} coding problems.")

        # 4. Seed a sample completed mock interview session for Demo user so Dashboard & Mistake Timeline & Report show rich data on first launch!
        sample_interview = Interview(
            user_id=demo_user.id,
            interview_type="Technical",
            target_role="Full Stack Developer",
            initial_difficulty="Medium",
            current_difficulty="Hard",
            total_questions=3,
            status="completed",
            overall_score=8.2,
            created_at=datetime.utcnow() - timedelta(days=1),
            completed_at=datetime.utcnow() - timedelta(days=1, minutes=-15),
        )
        db.add(sample_interview)
        db.commit()
        db.refresh(sample_interview)

        q1 = InterviewQuestion(
            interview_id=sample_interview.id,
            question_order=1,
            category="Python",
            difficulty="Medium",
            question_text="How do generators work in Python, and how does yield differ from return?",
            expected_points=["Yield returns a generator object", "Saves state between iterations", "Memory efficient"]
        )
        db.add(q1)
        db.commit()
        db.refresh(q1)

        r1 = InterviewResponse(
            interview_id=sample_interview.id,
            question_id=q1.id,
            user_answer="Generators use the yield keyword to produce values lazily. Instead of loading an entire list into memory, it keeps local variable state intact and resumes when next() is called.",
            duration_seconds=50
        )
        db.add(r1)
        db.commit()
        db.refresh(r1)

        e1 = AIEvaluation(
            response_id=r1.id,
            score=8.5,
            technical_correctness=9.0,
            relevance=9.0,
            completeness=8.0,
            strengths=["Clear articulation of lazy evaluation", "Accurately noted state preservation between calls"],
            weaknesses=["Could mention StopIteration exception handling"],
            better_answer="Generators produce an iterator that yields one item at a time lazily. When yield is executed, the function's state (frames, variables) is frozen and handed back to caller until next() or __next__() is invoked.",
            improvement_suggestion="Reference the underlying Iterator Protocol and StopIteration exception.",
            filler_words_count=1,
            communication_score=88.0,
            communication_feedback=["Clear cadence and strong technical precision."]
        )
        db.add(e1)

        ev1 = InterviewEvent(
            interview_id=sample_interview.id,
            question_id=q1.id,
            timestamp_str="00:50",
            topic="Python",
            score=8.5,
            mistake_summary="Good explanation of generators; missed StopIteration exception detail",
            missing_concepts=["StopIteration protocol"],
            better_answer=e1.better_answer,
            improvement_tip=e1.improvement_suggestion
        )
        db.add(ev1)

        q2 = InterviewQuestion(
            interview_id=sample_interview.id,
            question_order=2,
            category="SQL",
            difficulty="Medium",
            question_text="What is the difference between INNER JOIN, LEFT JOIN, and how do database indexes optimize them?",
            expected_points=["INNER vs LEFT join behavior", "B-Tree indexing on join keys"]
        )
        db.add(q2)
        db.commit()
        db.refresh(q2)

        r2 = InterviewResponse(
            interview_id=sample_interview.id,
            question_id=q2.id,
            user_answer="Um, INNER JOIN gives matching rows, while LEFT JOIN gives all left rows. Indexes like B-Trees help find keys faster so it doesn't do a full scan, like actually.",
            duration_seconds=65
        )
        db.add(r2)
        db.commit()
        db.refresh(r2)

        e2 = AIEvaluation(
            response_id=r2.id,
            score=6.8,
            technical_correctness=7.0,
            relevance=7.5,
            completeness=6.5,
            strengths=["Correctly distinguished INNER vs LEFT JOIN semantics"],
            weaknesses=["Weak explanation of join algorithms (Nested Loop, Hash Join, Merge Join)", "Used filler words"],
            better_answer="INNER JOIN filters for matching keys across tables, while LEFT JOIN preserves all left table tuples with NULL padding for non-matches. B-Tree indexes on foreign keys transform O(N*M) Cartesian comparisons into O(N log M) index lookups.",
            improvement_suggestion="Discuss join algorithms like Hash Join and Nested Loop Join when indexes are absent.",
            filler_words_count=3,
            communication_score=72.0,
            communication_feedback=["Reduce filler words ('um', 'like', 'actually')."]
        )
        db.add(e2)

        ev2 = InterviewEvent(
            interview_id=sample_interview.id,
            question_id=q2.id,
            timestamp_str="01:55",
            topic="SQL",
            score=6.8,
            mistake_summary="Weak explanation of index mechanics on JOIN algorithms",
            missing_concepts=["Hash Join vs Nested Loop Join", "Index Seek vs Scan"],
            better_answer=e2.better_answer,
            improvement_tip=e2.improvement_suggestion
        )
        db.add(ev2)

        q3 = InterviewQuestion(
            interview_id=sample_interview.id,
            question_order=3,
            category="DSA",
            difficulty="Hard",
            question_text="How would you detect a cycle in a singly linked list in O(1) space?",
            expected_points=["Floyd's Cycle Algorithm", "Slow & Fast pointer math"]
        )
        db.add(q3)
        db.commit()
        db.refresh(q3)

        r3 = InterviewResponse(
            interview_id=sample_interview.id,
            question_id=q3.id,
            user_answer="Use two pointers, slow moves one node, fast moves two nodes. If they meet, there is a cycle. Time is O(N) and space is O(1).",
            duration_seconds=40
        )
        db.add(r3)
        db.commit()
        db.refresh(r3)

        e3 = AIEvaluation(
            response_id=r3.id,
            score=9.2,
            technical_correctness=9.5,
            relevance=9.5,
            completeness=9.0,
            strengths=["Concise, accurate explanation of Floyd's Tortoise and Hare algorithm"],
            weaknesses=["Could briefly mention mathematical proof of convergence"],
            better_answer="Initialize slow and fast pointers at head. Advance slow by 1 step and fast by 2 steps. If fast or fast.next reaches null, no cycle exists. When fast and slow meet, a loop is proven in O(N) time and O(1) space.",
            improvement_suggestion="Elaborate on how to locate the exact entry point of the cycle.",
            filler_words_count=0,
            communication_score=94.0,
            communication_feedback=["Extremely crisp and structured explanation."]
        )
        db.add(e3)

        ev3 = InterviewEvent(
            interview_id=sample_interview.id,
            question_id=q3.id,
            timestamp_str="02:35",
            topic="DSA",
            score=9.2,
            mistake_summary="Strong answer; could explain finding the cycle start node",
            missing_concepts=["Cycle entry point derivation"],
            better_answer=e3.better_answer,
            improvement_tip=e3.improvement_suggestion
        )
        db.add(ev3)

        # Create Report for sample interview
        rep = Report(
            interview_id=sample_interview.id,
            user_id=demo_user.id,
            overall_score=8.2,
            technical_score=8.5,
            communication_score=84.7,
            relevance_score=8.7,
            completeness_score=7.8,
            strengths=[
                "Strong conceptual foundation in Python generators and memory efficiency.",
                "Accurate, crisp understanding of Floyd's cycle detection algorithm.",
                "Good technical vocabulary and problem decomposition."
            ],
            weaknesses=[
                "Expand on relational database join execution plans (Hash vs Merge Join).",
                "Reduce filler words ('um', 'actually') during technical explanations."
            ],
            mistakes=[
                "SQL index explanation lacked detail on join algorithms.",
                "Python explanation omitted the Iterator Protocol exception mechanics."
            ],
            ai_summary="Srinivas demonstrated solid senior software engineering competency with an 8.2/10 overall score. Technical accuracy and algorithm fundamentals were high (8.5/10), with clear articulation and concise answers. Expanding deeper into query optimizer internals will make interviews stand out further.",
            recommended_topics=["Database Internals & Join Plans", "System Design Patterns", "Advanced Concurrency"]
        )
        db.add(rep)
        db.commit()
        print("[Seed] Seeded sample completed interview session for demo user.")

    except Exception as e:
        db.rollback()
        print(f"[Seed] Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
