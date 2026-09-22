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

Supabase persistence and authenticated API access are implemented when the required environment variables are configured. Medical reports are stored in a private Supabase Storage bucket, verified report values can be applied to health-data records with an explicit `ocr_verified` source, and the admin area is protected by backend role checks plus Supabase RLS policies. Manual health-data entries and medical reports captured offline are queued in IndexedDB and synchronized when connectivity returns. A clearly labelled deterministic demo OCR mode is available for local workflow testing; production OCR still requires connecting a real medical-document OCR service. Verified OCR values are persisted and can be applied to health-data records. Local development mode also persists demo patients, reports, health data, screenings, referrals and demo user-role records in memory so the complete workflow can be exercised without Supabase. Disease-risk calculations remain intentionally unimplemented until validated clinical models/services and their approved inputs, thresholds and explainability outputs are supplied. Teleconsultation currently represents the referral/appointment request and doctor-advice workflow; a live video/telemedicine provider is not included.

## Environment configuration

### Frontend

Copy `frontend/.env.example` to `.env` and set:

- `VITE_API_BASE_URL` — the deployed FastAPI `/api` base URL
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key

If the Supabase values are omitted, the UI explicitly enters local development mode and must not be used with real patient information.

### Backend

Copy `backend/.env.example` to `.env` and set:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_MEDICAL_REPORTS_BUCKET=medical-reports`
- `CORS_ORIGINS` — comma-separated frontend origins, including the deployed frontend URL
- `PRANA_DEMO_OCR=true` only for demonstrations/testing

Run `supabase/schema.sql` in the target Supabase project before enabling authenticated persistence.

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

## Deployment

The repository now includes deployment configuration for a static Vite frontend and a FastAPI backend:

- `vercel.json` — deploy the repository root as the frontend on Vercel.
- `render.yaml` — deploy the FastAPI backend on Render.
- `backend/Dockerfile` — portable container build for the API.
- `frontend/vercel.json` — SPA fallback when deploying the `frontend/` directory directly.

Set these production values:

**Frontend**
- `VITE_API_BASE_URL=https://<your-api-host>/api`
- `VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co`
- `VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>`

**Backend**
- `SUPABASE_URL=https://<your-project-ref>.supabase.co`
- `SUPABASE_ANON_KEY=<your-supabase-anon-key>`
- `SUPABASE_MEDICAL_REPORTS_BUCKET=medical-reports`
- `CORS_ORIGINS=https://<your-frontend-host>`
- `PRANA_DEMO_OCR=false`

Never put a Supabase service-role key in the frontend or repository.

## Production completion checklist

Before handling real patient information:

1. Configure Supabase Auth and create a `user_profiles` row for every authorized user.
2. Apply `supabase/schema.sql`, including its repeatable RLS policies, database integrity triggers and private `medical-reports` storage bucket.
3. Configure the deployed frontend API URL and backend CORS origin.
4. Keep `PRANA_DEMO_OCR=false` and connect a real medical-report OCR service.
5. Connect validated disease-specific assessment services/models and their approved SHAP/explanation outputs.
6. Define the final patient-assignment/access policy and replace the current role-wide PHC access with assignment-scoped RLS before clinical deployment.
7. Add a production telemedicine provider only if live video consultation is required.
8. Complete security, privacy, clinical validation and operational review appropriate to the deployment environment.

## Important

PRANA is a screening and referral support platform. Screening output is not a diagnosis. Production deployment must use validated assessment services/models, secure authentication and authorization, encrypted health-record storage, and appropriate clinical governance.
