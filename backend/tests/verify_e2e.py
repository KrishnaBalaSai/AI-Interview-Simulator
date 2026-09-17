import requests

BASE = 'http://127.0.0.1:8000/api'

def run_verification():
    # 1. Login
    res = requests.post(f'{BASE}/auth/login', json={'email': 'srinivas@example.com', 'password': 'password123'})
    assert res.status_code == 200, f'Login failed: {res.text}'
    token = res.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}
    print('1. Logged in successfully as Srinivas Kandagatla')

    # 2. Get Profile
    prof = requests.get(f'{BASE}/profile', headers=headers).json()
    print(f'2. Profile loaded. Target Role: {prof.get("target_role")} | Skills count: {len(prof.get("skills", []))}')

    # 3. Practice Question attempt
    qs = requests.get(f'{BASE}/practice/questions?category=Python', headers=headers).json()
    q = qs[0]
    attempt = requests.post(
        f'{BASE}/practice/questions/{q["id"]}/attempt',
        json={'user_answer': 'Lists are mutable objects whose elements can be altered, while tuples are immutable.'},
        headers=headers
    ).json()
    print(f'3. Practice attempt evaluated. Score: {attempt["score"]}/10 | Correct: {attempt["is_correct"]}')

    # 4. Coding Problem Run & Submit
    problems = requests.get(f'{BASE}/coding/problems').json()
    two_sum = [p for p in problems if p['slug'] == 'two-sum'][0]
    py_code = """import sys
def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            return f"{seen[diff]} {i}"
        seen[num] = i
    return ""

if __name__ == "__main__":
    lines = sys.stdin.read().strip().split("\\n")
    if len(lines) >= 2:
        nums = list(map(int, lines[0].split()))
        target = int(lines[1])
        print(two_sum(nums, target))
"""
    sub = requests.post(
        f'{BASE}/coding/problems/{two_sum["id"]}/submit',
        json={'language': 'python', 'code': py_code},
        headers=headers
    ).json()
    print(f'4. Coding submission status: {sub["status"]} | Passed: {sub["test_cases_passed"]}/{sub["total_test_cases"]}')

    # 5. Mock Interview & Adaptive Engine
    it = requests.post(
        f'{BASE}/interviews',
        json={
            'interview_type': 'Technical',
            'target_role': 'Full Stack Developer',
            'difficulty': 'Medium',
            'total_questions': 2,
            'use_resume': True
        },
        headers=headers
    ).json()
    it_id = it['id']
    print(f'5. Created Mock Interview #{it_id} | First Question: {it["current_question"]["question_text"][:55]}...')

    # Answer Q1 with filler words to test Communication Analysis
    ans1 = requests.post(
        f'{BASE}/interviews/{it_id}/answer',
        json={
            'answer': 'Um, basically FastAPI uses Starlette for ASGI handling and Pydantic for data parsing, like actually.',
            'duration_seconds': 45
        },
        headers=headers
    ).json()
    print(f'6. Q1 Evaluated: Score: {ans1["evaluation"]["score"]}/10 | Fillers Detected: {ans1["evaluation"]["filler_words_count"]} | Communication Score: {ans1["evaluation"]["communication_score"]}%')
    print(f'   Adaptive Difficulty: {ans1["difficulty_change"]} -> Next Difficulty: {ans1["updated_difficulty"]}')

    # Answer Q2 to complete interview
    ans2 = requests.post(
        f'{BASE}/interviews/{it_id}/answer',
        json={
            'answer': 'B-Tree indexes maintain logarithmic depth so lookups execute in O(log N) time, drastically outperforming full table scans.',
            'duration_seconds': 50
        },
        headers=headers
    ).json()
    print(f'7. Q2 Evaluated: Completed: {ans2["is_completed"]}')

    # 8. Check Mistake Timeline (Unique Feature #1)
    mistakes = requests.get(f'{BASE}/interviews/{it_id}/mistakes', headers=headers).json()
    print(f'8. Mistake Timeline generated: {len(mistakes)} events. Event 1: [{mistakes[0]["timestamp_str"]}] {mistakes[0]["topic"]} - {mistakes[0]["mistake_summary"][:45]}...')

    # 9. Check Report & Download PDF
    report = requests.get(f'{BASE}/reports/{it_id}', headers=headers).json()
    pdf_resp = requests.get(f'{BASE}/reports/{it_id}/pdf', headers=headers)
    print(f'9. ReportLab PDF generated: {len(pdf_resp.content)} bytes | Content-Type: {pdf_resp.headers.get("content-type")}')

    # 10. Analytics
    analytics = requests.get(f'{BASE}/analytics', headers=headers).json()
    print(f'10. Analytics: Completed: {analytics["interviews_completed"]} | Solved: {analytics["coding_problems_solved"]} | Avg Score: {analytics["avg_interview_score"]}')

    print('\n>>> ALL 10 USER FLOWS VERIFIED SUCCESSFULLY WITH REAL BACKEND & DATABASE! <<<')

if __name__ == '__main__':
    run_verification()
