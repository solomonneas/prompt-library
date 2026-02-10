# Configuration

## Environment Variables

### Backend (FastAPI)

Create `.env` in the `backend/` directory:

```bash
# Server
HOST=0.0.0.0
PORT=5202
DEBUG=false

# Database
DATABASE_URL=sqlite:///./prompts.db

# CORS (allow frontend to call API)
CORS_ORIGINS=http://localhost:5201,http://localhost:3000

# Seed on startup
AUTO_SEED=true
```

#### Variable Details

| Variable | Default | Purpose |
|----------|---------|---------|
| `HOST` | `0.0.0.0` | Bind address for FastAPI server |
| `PORT` | `5202` | Backend API port |
| `DEBUG` | `false` | Enable debug logging and hot-reload |
| `DATABASE_URL` | `sqlite:///./prompts.db` | SQLite connection string |
| `CORS_ORIGINS` | `http://localhost:5201` | Comma-separated allowed origins for frontend |
| `AUTO_SEED` | `true` | Auto-generate 8 demo prompts on first run |

### Frontend (React + Vite)

Create `.env` in the `frontend/` directory:

```bash
# API endpoint
VITE_API_URL=http://localhost:5202/api

# App title (shown in browser tab)
VITE_APP_TITLE=Prompt Library
```

#### Variable Details

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_API_URL` | `http://localhost:5202/api` | Backend API base URL |
| `VITE_APP_TITLE` | `Prompt Library` | Browser tab title |

## Port Configuration

### Default Ports

- **Frontend:** `http://localhost:5201`
- **Backend:** `http://localhost:5202`

### Custom Ports

To change ports:

1. **Backend:** Edit `backend/.env` and set `PORT=5999`
2. **Frontend:** Update `frontend/.env` to point to new backend:
   ```bash
   VITE_API_URL=http://localhost:5999/api
   ```

## Database Setup

### Fresh Install (Demo Data)

On first run, the backend auto-seeds 8 generic prompts if `AUTO_SEED=true`:

```bash
cd backend
python backend/seed_demo.py
```

Database file created at `backend/prompts.db` (gitignored).

### Reset to Demo Data

To wipe and regenerate demo data:

```bash
# Stop backend server
cd backend

# Delete database
rm prompts.db

# Restart backend (will auto-seed)
python -m uvicorn main:app --reload
```

### Use Real Data

If using production data from another source:

1. Stop the backend
2. Copy your `prompts.db` to `backend/prompts.db`
3. Set `AUTO_SEED=false` in `.env` to prevent overwriting
4. Restart backend

### Database Schema

Prompt Library creates two tables automatically on first run:

- `prompts` - Main prompt records
- `prompt_versions` - Immutable version history

See [ARCHITECTURE.md](ARCHITECTURE.md#database-schema) for full schema details.

## Running in Production

### Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 5202 --workers 4
```

### Frontend

```bash
cd frontend
npm install
npm run build
npm run preview  # or serve dist/ with nginx/apache
```

### Environment for Production

Set these in `.env`:

**Backend:**
```bash
DEBUG=false
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
AUTO_SEED=false
```

**Frontend:**
```bash
VITE_API_URL=https://yourdomain.com/api
```

## Troubleshooting

### Backend won't start on port 5202

- Check if port in use: `lsof -i :5202`
- Change `PORT` in `.env`
- Check `DATABASE_URL` is accessible

### Frontend can't reach API

- Verify backend is running: `curl http://localhost:5202/api/prompts`
- Check `VITE_API_URL` in frontend `.env`
- Check backend `CORS_ORIGINS` includes frontend URL

### Database file not created

- Ensure `backend/` directory is writable
- Check `DATABASE_URL` in `.env` (default uses relative path)
- Manually run seed: `python backend/seed_demo.py`

### Themes not persisting

- Check browser localStorage enabled
- Clear localStorage and reload: `localStorage.clear()`
- Theme selection is per-browser, not synced across devices
