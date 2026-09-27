from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import session, dream, brain

app = FastAPI(
    title="Dr. Wolf Brain API",
    description="Server-authoritative AI chess coach backend",
    version="0.1.0",
)

origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(session.router)
app.include_router(dream.router)
app.include_router(brain.router)

@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "Dr. Wolf Brain"}
