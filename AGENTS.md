# AGENTS.md

## Project
- **Name:** Prompt Library
- **Stack:** React 18, TypeScript, Vite frontend plus FastAPI, SQLite backend
- **Ports:** frontend `5201`, backend `5202`

## Architecture
- Frontend: `frontend/`
- Backend: `backend/`
- Docs: `docs/`
- Seed/demo helper: `backend/seed_demo.py`

## Build & Verify
```bash
# frontend
cd frontend && npm install && npm run build

# backend
cd backend && pip install -r requirements.txt
uvicorn app:app --reload --host 0.0.0.0 --port 5202
```

For frontend changes, run the frontend build. For backend changes, smoke test the affected API paths.

## Key Rules
- This repo is the source of truth for prompt management. Do not treat demo data as production state.
- Preserve version history and variable substitution behavior.
- Keep the frontend/backend contract aligned.
- Real database files should stay gitignored.

## Style Guide
- No em dashes. Ever.
- Keep the UX practical and fast. Avoid overdesigned fluff.

## Git Rules
- Use conventional commits.
- Never add `Co-Authored-By` lines.
- Never mention AI tools or vendors in commit messages.
