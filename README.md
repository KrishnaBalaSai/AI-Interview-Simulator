# AI Interview Simulator
**Project:** AI Interview Simulator — Full-Stack Web Application

---

## 🎯 Project Overview

**AI Interview Simulator** is an AI-powered interview preparation platform designed to help software engineers and technical candidates practice technical and HR questions, solve LeetCode-style coding challenges in a real-time sandbox, analyze PDF resumes, and take live adaptive AI mock interviews.

### ✨ Key Features
1. **JWT Authentication & Security:** User registration, password hashing with bcrypt, protected route guards, and session management.
2. **Dynamic Dashboard:** Real-time metrics on completed interviews, coding problems solved, average interview score, score progression trend line, and topic proficiency bars.
3. **User Profile Management:** Target role selection, experience level, interactive skills chips, and project portfolio manager.
4. **AI Resume Module:** PDF upload, text extraction with `pypdf`, Gemini AI analysis (extracting skills, projects, strengths, improvement areas), and custom interview question generation based on resume contents.
5. **Practice Question Bank:** Browse and filter across 9 categories (*Python, Java, JavaScript, React, FastAPI, SQL, DSA, DBMS, HR*) and 3 difficulty levels (*Easy, Medium, Hard*) with bookmarks, explanations, model answers, and attempt tracking.
6. **LeetCode-Style Coding Sandbox:** Monaco code editor supporting Python, JavaScript, and Java with test case execution and submission history powered by Judge0 API (with built-in safe local runner fallback).
7. **Adaptive Mock Interview Engine:** Dynamic interview generation tailored to target role, difficulty, user skills, and resume. Real-time adaptive difficulty scaling:
   - **Score $\ge$ 8:** Increases difficulty level
   - **Score 5–7:** Maintains difficulty level
   - **Score < 5:** Decreases difficulty level
8. **🌟 UNIQUE FEATURE #1 — Interview Mistake Timeline:** Chronological, interactive timeline displaying timestamps, topic, score, mistakes, missing concepts, model answers, and coaching recommendations.
9. **🌟 UNIQUE FEATURE #2 — Communication Analysis:** Detects filler words (*um, uh, like, actually, basically*), evaluates articulation pacing, word count, and provides actionable communication coaching.
10. **ReportLab PDF Generation:** Generates downloadable, styled PDF scorecard reports complete with performance tables, AI executive summary, and recommendations.
11. **Comprehensive Analytics:** Recharts visualizations of score trajectories, 4-dimensional competency radar matrix, topic breakdowns, and weak area practice suggestions.

---

## 🏗️ Tech Stack

### Frontend
- **Framework:** React.js 18 + TypeScript + Vite
- **Styling:** Tailwind CSS (modern SaaS light theme with indigo and purple accents)
- **Routing:** React Router v6
- **Code Editor:** Monaco Editor (`@monaco-editor/react`)
- **Charts:** Recharts (Line, Bar, Radar)
- **Icons:** Lucide React
- **HTTP Client:** Axios (with Bearer token interceptor and proxy configuration)

### Backend
- **Framework:** Python 3.12 + FastAPI
- **Database & ORM:** PostgreSQL + SQLAlchemy 2.0 (`psycopg2-binary`)
- **Validation:** Pydantic v2
- **Auth:** Python-Jose (JWT) + bcrypt
- **PDF Engine:** ReportLab
- **PDF Parser:** pypdf
- **AI Integration:** Google Gemini API (`google-generativeai`)
- **Coding Engine:** Judge0 API (with local subprocess fallback)
- **Testing:** Pytest + HTTPX

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.10+
- PostgreSQL 14+ (running on localhost:5432)
- Node.js 18+ and npm

### 2. Backend Setup
```bash
cd backend

# Create & activate virtual environment (optional)
# python -m venv venv
# source venv/bin/activate (Linux/Mac) or venv\Scripts\activate (Windows)

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
# Copy .env.example to .env and adjust if needed:
# DATABASE_URL=postgresql://postgres:root@localhost:5432/ai_interview_sim
# GEMINI_API_KEY=your_gemini_api_key_here

# Seed initial practice questions, coding problems, and demo user
python seed_data.py

# Run tests
python -m pytest -v

# Start FastAPI server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation will be available at `http://127.0.0.1:8000/docs`.

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Build for production
npm run build

# Start development server
npm run dev
```
Open `http://127.0.0.1:5173` in your browser.



---

## 📁 Project Structure
```
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI entry point & CORS
│   │   ├── database.py         # SQLAlchemy engine & session
│   │   ├── models.py           # Database models (13 tables)
│   │   ├── schemas.py          # Pydantic schemas
│   │   ├── auth.py             # Password hashing & JWT
│   │   ├── dependencies.py     # Auth dependencies
│   │   ├── routes/             # API routers
│   │   │   ├── auth.py
│   │   │   ├── profile.py
│   │   │   ├── resume.py
│   │   │   ├── practice.py
│   │   │   ├── coding.py
│   │   │   ├── interviews.py
│   │   │   ├── reports.py
│   │   │   └── analytics.py
│   │   └── services/           # Core business logic
│   │       ├── gemini.py       # AI generation, evaluation, communication
│   │       ├── resume.py       # PDF text extraction
│   │       ├── coding.py       # Judge0 & local execution
│   │       └── pdf_report.py   # ReportLab PDF generator
│   ├── tests/
│   │   ├── test_api.py         # Automated pytest suite
│   │   └── verify_e2e.py       # Full integration flow test
│   ├── seed_data.py            # Initial questions & demo seeds
│   ├── requirements.txt
│   ├── .env.example
│   └── .env
└── frontend/
    ├── src/
    │   ├── components/         # Navbar, Sidebar, MetricCard, Toast, Spinner
    │   ├── contexts/           # AuthContext
    │   ├── layouts/            # AppLayout
    │   ├── pages/              # 15 React pages
    │   ├── services/           # Axios API client
    │   ├── types/              # TypeScript interfaces
    │   ├── App.tsx             # Routes & route protection
    │   └── main.tsx
    ├── package.json
    ├── vite.config.ts
    └── tailwind.config.js
```

---

## 🧪 Testing
Run backend unit & integration tests:
```bash
cd backend
python -m pytest -v
python tests/verify_e2e.py
```
All tests verify authentication, profile updates, question attempts, code execution, adaptive mock interview flow, mistake timeline extraction, ReportLab PDF streaming, and analytics aggregation.
