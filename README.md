# PRANA – Rural Health Risk Assessment Platform

PRANA is a web application for rural health workers and PHC teams to register patients, collect health information, process medical reports, perform applicable disease-risk assessments, explain results, and connect patients requiring further evaluation to PHC doctors.

The implementation follows the project's SRS, HLD/UML models and product presentation.

## Defined workflow

1. User login and role identification
2. Register / search patient
3. Enter health data or upload/capture a medical report
4. OCR extraction
5. Verify / edit extracted data
6. Check required data
7. Run applicable assessments for:
   - Diabetes
   - Cardiovascular disease
   - Hypertension
   - Anaemia
8. Display risk results and understandable explanations
9. Provide referral guidance
10. Request teleconsultation / appointment
11. Store screening and referral records
12. Support offline capture and synchronization
13. Provide role-specific PHC doctor and admin workflows

## User roles

- ASHA / ANM Worker
- PHC Staff
- PHC Doctor
- Admin

## Repository structure

```
prana-health-platform/
├── frontend/                 # React + Vite client
│   └── src/
├── backend/                  # FastAPI API
│   ├── api/
│   │   ├── patients.py
│   │   ├── screening.py
│   │   └── referrals.py
│   └── services/
│       ├── ocr_service.py
│       └── risk_service.py
└── README.md
```

## Current implementation status

The repository contains the application shell, role-based navigation, patient registration/search flow, screening data-entry flow, medical-report upload UI, referral/teleconsultation areas, patient-history area, admin users/roles area, and backend API boundaries.

Clinical OCR extraction, validated disease-risk models, Supabase persistence/authentication, teleconsultation infrastructure and production offline synchronization are intentionally integration points. The application does **not** invent clinical risk scores when those services are not connected.

## Run locally

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
python -m venv .venv
# Windows
.venv\\Scripts\\activate
# macOS/Linux
# source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload
```

Backend health endpoint:

```
GET /api/health
```

## Important

PRANA is a screening and referral support platform. Screening output is not a diagnosis. Production deployment must use validated assessment services/models, secure authentication and authorization, encrypted health-record storage, and appropriate clinical governance.
