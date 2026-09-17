import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routes import (
    auth,
    profile,
    resume,
    practice,
    coding,
    interviews,
    reports,
    analytics,
    admin,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    Base.metadata.create_all(bind=engine)
    try:
        from seed_data import seed_database
        seed_database()
    except Exception as e:
        print(f"[Startup] Seeding notice: {e}")
    yield

app = FastAPI(
    title="AI Interview Simulator API",
    description="Backend API for AI Interview Simulator. Candidate: Srinivas Kandagatla | Batch: PFS-HYD-063",
    version="1.0.0",
    lifespan=lifespan,
)

# Rewrite paths that omit /api prefix (e.g. /auth/login -> /api/auth/login)
@app.middleware("http")
async def auto_api_prefix_middleware(request: Request, call_next):
    path = request.scope.get("path", "")
    if not path.startswith("/api") and not path.startswith("/docs") and not path.startswith("/openapi.json") and path != "/":
        common_prefixes = ["/auth", "/profile", "/resume", "/practice", "/coding", "/interviews", "/reports", "/analytics", "/admin"]
        if any(path.startswith(cp) for cp in common_prefixes):
            new_path = f"/api{path}"
            request.scope["path"] = new_path
            request.scope["raw_path"] = new_path.encode("utf-8")
    return await call_next(request)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(resume.router)
app.include_router(practice.router)
app.include_router(coding.router)
app.include_router(interviews.router)
app.include_router(reports.router)
app.include_router(analytics.router)
app.include_router(admin.router)

@app.get("/")
def root():
    return {
        "app": "AI Interview Simulator API",
        "status": "online",
        "candidate": "Srinivas Kandagatla",
        "batch": "PFS-HYD-063",
        "docs": "/docs",
    }

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "AI Interview Simulator"}
