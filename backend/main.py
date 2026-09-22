import os\n\nfrom fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.ocr import router as ocr_router
from api.patients import router as patients_router
from api.screening import router as screening_router
from api.referrals import router as referrals_router
from api.users import router as users_router

app = FastAPI(
    title="PRANA – Rural Health Risk Assessment Platform API",
    version="0.3.1",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(patients_router, prefix="/api")
app.include_router(screening_router, prefix="/api")
app.include_router(referrals_router, prefix="/api")
app.include_router(ocr_router, prefix="/api")
app.include_router(users_router, prefix="/api")


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "prana-api"}


@app.get("/api")
def api_root():
    return {
        "service": "PRANA",
        "version": app.version,
        "modules": ["patients", "screening", "referrals", "ocr", "users"],
        "note": "Supabase persistence is used when configured; local development uses an explicit in-memory fallback. OCR demo mode is available for workflow testing; validated disease-assessment services remain an integration point until a clinically validated model is connected.",
    }
