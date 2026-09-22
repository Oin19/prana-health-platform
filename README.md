# PRANA — Health Risk Platform

PRANA is a clean-slate health risk assessment and population health platform.

## Project structure

- `frontend/` — React + Vite web application
- `backend/` — FastAPI backend
- `ml/` — machine-learning models and utilities
- `database/` — database/schema documentation

## Development

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
# Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

## Principle

Build incrementally, keep the data flow explicit, and avoid hard-coded health statistics in the UI.
