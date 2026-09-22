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
│   │   ├── ocr.py
│   │   ├── referrals.py
│   │   └── users.py
│   └── services/
│       ├── ocr_service.py
│       ├── risk_service.py
│       └── supabase_service.py
└── README.md
```

## Current implementation status

The repository contains the application shell, role-based navigation, Supabase-aware authentication/API integration, patient registration/search flow, screening data-entry flow, medical-report OCR integration boundary, referral creation/listing, patient screening history retrieval, and role-specific PHC doctor/admin areas.

Supabase persistence and authenticated API access are implemented when the required environment variables are configured. Medical reports are stored in a private Supabase Storage bucket, verified report values can be applied to health-data records with an explicit `ocr_verified` source, and the admin area is protected by backend role checks plus Supabase RLS policies. Manual health-data entries made offline are queued in IndexedDB and synchronized when connectivity returns. Clinical OCR extraction and validated disease-risk models remain integration points: the current OCR endpoint reports that it is not configured, and the screening API explicitly skips or marks assessments unavailable rather than inventing clinical risk scores. Full offline medical-report capture/synchronization and production teleconsultation infrastructure remain integration points.

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
