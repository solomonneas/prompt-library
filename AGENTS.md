# AGENTS.md

## Definition of Done

A change is done only when this passes from the repo root:

```bash
./scripts/verify
```

It runs the backend syntax gate (`python3 -m py_compile` on `backend/app.py` and
`backend/seed_demo.py`) and the frontend type check plus production build
(`tsc -b && vite build`). There is no test suite yet, so these are the smallest
real checks that exist. Report the actual result, paste failures verbatim, and
never claim a pass you did not observe.

## Project

- Prompt Library: prompt management with version history and variable substitution.
- Frontend: React 18, TypeScript, Vite, in `frontend/` (dev server port 5201).
- Backend: FastAPI plus SQLite, single file `backend/app.py`, served on port 5202.
  `init_db()` runs on startup; the DB lives at `backend/prompts.db`.
- Seed helper: `backend/seed_demo.py` writes demo prompts straight into
  `backend/prompts.db` via sqlite, for fresh installs only.
- `start.sh` boots both for local dev: creates `backend/venv`, runs uvicorn on
  5202 and the Vite dev server on 5201.

## Live Service Protection

- A separate checkout of this repo serves the live local Prompt Library API on
  port 5202. It holds real private prompts.
- During development or review, never call state-changing endpoints (POST, PUT,
  PATCH, DELETE) on the live 5202 service. Read-only GETs such as
  `GET /api/health` are fine for smoke checks.
- To exercise backend changes, run your own instance from this checkout on a
  free port with a fresh scratch DB instead:
  `cd backend && python3 -m venv venv && venv/bin/pip install -r requirements.txt && venv/bin/uvicorn app:app --port 5277`

## Rules

- When a verify gate fails: fix the cause. Never delete, skip, or loosen a
  failing check to get green. If genuinely blocked, stop and report the exact
  failing command plus its verbatim output.
- When you need a command not listed here: confirm it exists in
  `frontend/package.json` scripts, `start.sh`, or `scripts/verify` before
  running it. Never invent commands or flags.
- When changing API request or response shapes in `backend/app.py`: update
  `frontend/src/types.ts` and `frontend/src/api.ts` in the same change so the
  frontend/backend contract stays aligned.
- When touching the database: `backend/prompts.db` (and its journal/wal files)
  holds private prompts and is gitignored. Never commit it and never point
  scripts at the live service's copy; use a scratch DB in this checkout.
- When reading demo data: treat `seed_demo.py` output as filler, never as
  production state.

## Git

- Conventional commits. Never add Co-Authored-By lines. Never mention AI tools
  or vendors in commit messages.
- `core.hooksPath` is `hooks/`. `hooks/pre-push` scans the working tree with
  content-guard against its public-repo policy. Never push with `--no-verify`.
  If the hook blocks a push, fix the leak or add the inline allow tag the hook
  prints, then push again.

## Style

- No em dashes, anywhere, including docs and commit messages.
- Keep the UX practical and fast. Avoid overdesigned fluff.

## Memory Handoff

At the end of any substantial task, write durable findings (decisions, root
causes, gotchas) to `.claude/memory-handoffs/`, following the structure in
`.claude/memory-handoffs/TEMPLATE.md`. Do not skip this on multi-step work.
