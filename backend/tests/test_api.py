import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_and_root():
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "online"
    assert "Srinivas Kandagatla" in data["candidate"]

    health = client.get("/api/health")
    assert health.status_code == 200
    assert health.json()["status"] == "healthy"


def test_auth_login_demo():
    res = client.post(
        "/api/auth/login",
        json={"email": "srinivas@example.com", "password": "password123"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "srinivas@example.com"


def test_auth_register_and_profile():
    # Register new user
    import uuid
    uid = uuid.uuid4().hex[:6]
    email = f"test_{uid}@example.com"
    reg_res = client.post(
        "/api/auth/register",
        json={
            "name": f"Tester {uid}",
            "email": email,
            "password": "mypassword123",
            "confirm_password": "mypassword123"
        }
    )
    assert reg_res.status_code == 201
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get profile
    prof_res = client.get("/api/profile", headers=headers)
    assert prof_res.status_code == 200
    assert prof_res.json()["email"] == email

    # Update profile
    update_res = client.put(
        "/api/profile",
        json={
            "phone": "+1 555 1234",
            "target_role": "Backend Engineer",
            "skills": ["Python", "FastAPI", "Docker"]
        },
        headers=headers
    )
    assert update_res.status_code == 200
    assert update_res.json()["target_role"] == "Backend Engineer"
    assert "FastAPI" in update_res.json()["skills"]


def test_practice_module():
    login_res = client.post(
        "/api/auth/login",
        json={"email": "srinivas@example.com", "password": "password123"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get practice questions
    q_res = client.get("/api/practice/questions?category=Python", headers=headers)
    assert q_res.status_code == 200
    questions = q_res.json()
    assert len(questions) > 0
    first_q = questions[0]

    # Submit attempt
    attempt_res = client.post(
        f"/api/practice/questions/{first_q['id']}/attempt",
        json={"user_answer": "Lists are mutable and tuples are immutable in Python because lists can be changed in place."},
        headers=headers
    )
    assert attempt_res.status_code == 200
    assert "score" in attempt_res.json()

    # Toggle bookmark
    bm_res = client.post(f"/api/practice/questions/{first_q['id']}/bookmark", headers=headers)
    assert bm_res.status_code == 200
    assert "bookmarked" in bm_res.json()


def test_coding_module():
    login_res = client.post(
        "/api/auth/login",
        json={"email": "srinivas@example.com", "password": "password123"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get coding problems
    p_res = client.get("/api/coding/problems")
    assert p_res.status_code == 200
    problems = p_res.json()
    assert len(problems) > 0
    prob = problems[0]

    # Run code snippet
    run_res = client.post(
        f"/api/coding/problems/{prob['id']}/run",
        json={
            "language": "python",
            "code": "print('Hello from sandbox')",
            "custom_input": ""
        },
        headers=headers
    )
    assert run_res.status_code == 200
    assert "Hello from sandbox" in run_res.json()["stdout"]


def test_interview_flow_and_report():
    login_res = client.post(
        "/api/auth/login",
        json={"email": "srinivas@example.com", "password": "password123"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Start Interview
    create_res = client.post(
        "/api/interviews",
        json={
            "interview_type": "Technical",
            "target_role": "Python Developer",
            "difficulty": "Easy",
            "total_questions": 2,
            "use_resume": False
        },
        headers=headers
    )
    assert create_res.status_code == 200
    interview = create_res.json()
    interview_id = interview["id"]
    assert interview["status"] == "in_progress"

    # Answer Question 1 (evaluation is hidden in-flight)
    ans_res = client.post(
        f"/api/interviews/{interview_id}/answer",
        json={
            "answer": "Lists are mutable because you can append items to them, while tuples cannot be modified.",
            "duration_seconds": 35
        },
        headers=headers
    )
    assert ans_res.status_code == 200
    ans_data = ans_res.json()
    assert ans_data["evaluation"] is None  # In-flight feedback hidden!
    assert ans_data["is_completed"] is False
    assert ans_data["next_question"] is not None

    # Test Heartbeat
    hb_res = client.post(f"/api/interviews/{interview_id}/heartbeat", headers=headers)
    assert hb_res.status_code == 200
    assert hb_res.json()["is_active"] is True

    # Answer Question 2 (completes the interview)
    ans2_res = client.post(
        f"/api/interviews/{interview_id}/answer",
        json={
            "answer": "FastAPI is based on Starlette for web handling and Pydantic for data parsing and serialization.",
            "duration_seconds": 40
        },
        headers=headers
    )
    assert ans2_res.status_code == 200
    ans2_data = ans2_res.json()
    assert ans2_data["is_completed"] is True
    assert ans2_data["evaluation"] is not None
    assert "communication_score" in ans2_data["evaluation"]

    # Check Mistakes Timeline
    timeline_res = client.get(f"/api/interviews/{interview_id}/mistakes", headers=headers)
    assert timeline_res.status_code == 200
    events = timeline_res.json()
    assert len(events) >= 1

    # Check Report
    rep_res = client.get(f"/api/reports/{interview_id}", headers=headers)
    assert rep_res.status_code == 200
    assert "overall_score" in rep_res.json()

    # Download PDF Report
    pdf_res = client.get(f"/api/reports/{interview_id}/pdf", headers=headers)
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert len(pdf_res.content) > 500


def test_analytics():
    login_res = client.post(
        "/api/auth/login",
        json={"email": "srinivas@example.com", "password": "password123"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/analytics", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "interviews_completed" in data
    assert "score_trends" in data
    assert "topic_performance" in data
    assert "skill_breakdown" in data


def test_interview_auto_submit():
    login_res = client.post(
        "/api/auth/login",
        json={"email": "srinivas@example.com", "password": "password123"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Start Interview
    create_res = client.post(
        "/api/interviews",
        json={
            "interview_type": "Technical",
            "target_role": "Python Developer",
            "difficulty": "Easy",
            "total_questions": 3,
            "use_resume": False
        },
        headers=headers
    )
    assert create_res.status_code == 200
    interview_id = create_res.json()["id"]

    # Auto submit directly (e.g. from tab switch limit)
    auto_res = client.post(
        f"/api/interviews/{interview_id}/auto-submit",
        json={"reason": "Terminated: Exceeded tab switch limit (3 tab switch violations detected)"},
        headers=headers
    )
    assert auto_res.status_code == 200
    assert auto_res.json()["status"] == "auto_submitted"

    # Verify Report is immediately available
    rep_res = client.get(f"/api/reports/{interview_id}", headers=headers)
    assert rep_res.status_code == 200
    report_data = rep_res.json()
    assert report_data["interview_id"] == interview_id

    # Verify repeated auto-submit is idempotent and does not error
    repeat_res = client.post(
        f"/api/interviews/{interview_id}/auto-submit",
        json={"reason": "Repeat attempt"},
        headers=headers
    )
    assert repeat_res.status_code == 200
    assert repeat_res.json()["status"] == "auto_submitted"

    # Verify Analytics includes auto-submitted interview
    analytics_res = client.get("/api/analytics", headers=headers)
    assert analytics_res.status_code == 200
    analytics_data = analytics_res.json()
    assert analytics_data["interviews_completed"] >= 1
    trend_ids = [t["id"] for t in analytics_data["score_trends"]]
    assert interview_id in trend_ids

