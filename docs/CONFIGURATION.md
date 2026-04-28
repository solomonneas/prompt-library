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
CORS_ORIGINS=http://localhost:5201,http://localhost:5173,http://localhost:8005

# Optional source Markdown file to import on startup
SEED_PATH=

# Optional API key for mutating routes
PROMPT_LIBRARY_API_KEY=

# Embeddings
OLLAMA_EMBEDDINGS_URL=http://localhost:11434/api/embeddings
PROMPT_EMBED_MODEL=qwen3-embedding:8b
```

#### Variable Details

| Variable | Default | Purpose |
|----------|---------|---------|
| `HOST` | `0.0.0.0` | Bind address for FastAPI server |
| `PORT` | `5202` | Backend API port |
| `DEBUG` | `false` | Enable debug logging and hot-reload |
| `DATABASE_URL` | `sqlite:///./prompts.db` | SQLite connection string |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:8005,http://localhost:5201` | Comma-separated allowed origins |
| `SEED_PATH` | unset | Optional Markdown file imported as `variant-design-rules` on first startup |
| `PROMPT_LIBRARY_API_KEY` | unset | If set, required on mutating routes as `X-API-Key` header or `token` query param |
| `OLLAMA_EMBEDDINGS_URL` | `http://localhost:11434/api/embeddings` | Ollama-compatible embeddings endpoint |
| `PROMPT_EMBED_MODEL` | `qwen3-embedding:8b` | Embedding model sent to Ollama |

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

To seed 8 generic prompts into a fresh database:

```bash
cd backend
python seed_demo.py
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
python seed_demo.py
python -m uvicorn app:app --reload --host 0.0.0.0 --port 5202
```

### Use Real Data

If using production data from another source:

1. Stop the backend
2. Copy your `prompts.db` to `backend/prompts.db`
3. Keep `SEED_PATH` unset unless you intentionally want to import a Markdown seed file
4. Restart backend

### Database Schema

Prompt Library creates three tables automatically on first run:

- `prompts` - Main prompt records
- `prompt_versions` - Immutable version history
- `prompt_embeddings` - Packed embedding vectors for semantic search

See [ARCHITECTURE.md](ARCHITECTURE.md#database-schema) for full schema details.

## Running in Production

### Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app:app --host 0.0.0.0 --port 5202 --workers 4
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
PROMPT_LIBRARY_API_KEY=generate-a-long-random-value
PROMPT_EMBED_MODEL=qwen3-embedding:8b
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
