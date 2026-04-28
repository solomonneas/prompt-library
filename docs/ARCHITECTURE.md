# Architecture

## Overview

Prompt Library is a full-stack application split into independent frontend and backend services communicating via REST API.

```
┌─────────────────────┐         ┌──────────────────────┐
│   React Frontend    │         │   FastAPI Backend    │
│  (Port 5201)        │────────→│   (Port 5202)        │
│                     │         │                      │
│ - UI Components     │         │ - REST API           │
│ - Search/Filter     │         │ - Version History    │
│ - Themes            │         │ - Semantic Search    │
│ - Copy-to-Clipboard │         │ - SQLite DB          │
└─────────────────────┘         └──────────────────────┘
```

## Frontend Architecture

**Stack:** React 18 + TypeScript + Vite

### Key Components
- **PromptCard**: Expandable prompt display with copy button
- **PromptSearch**: Full-text search with real-time filtering
- **CategoryFilter**: Filter by categories and tags
- **VariablePreview**: Live variable substitution preview
- **ThemeSelector**: Switch between 5 visual variants
- **VersionHistory**: View and restore previous prompt versions

### State Management
- React Context API for theme selection
- Local state for search/filter inputs
- Component-level state for expanded cards

## Backend Architecture

**Stack:** FastAPI + SQLite + Pydantic

### Core Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/prompts` | List all prompts (supports ?search, ?category, ?tags) |
| `GET` | `/api/prompts/{id}` | Get single prompt with version history |
| `POST` | `/api/prompts` | Create new prompt |
| `PUT` | `/api/prompts/{id}` | Update prompt (creates new version) |
| `DELETE` | `/api/prompts/{id}` | Soft delete prompt |
| `GET` | `/api/prompts/{id}/versions` | List all versions of a prompt |
| `GET` | `/api/prompts/{id}/versions/{version_num}` | Get specific version |
| `POST` | `/api/prompts/{id}/restore/{version_num}` | Restore from previous version |
| `GET` | `/api/prompts/by-name/{name}` | Fetch a prompt by stable slug |
| `GET` | `/api/categories` | List categories and counts |
| `GET` | `/api/health` | Health, embedding model, and prompt counts |
| `POST` | `/api/prompts/search/semantic` | Semantic prompt search through Ollama embeddings |
| `POST` | `/api/prompts/embeddings/rebuild` | Rebuild stored prompt embeddings |

### Database Schema

#### `prompts` Table
```sql
CREATE TABLE prompts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  variables TEXT NOT NULL DEFAULT '[]',
  current_version INTEGER NOT NULL DEFAULT 1,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

#### `prompt_versions` Table
```sql
CREATE TABLE prompt_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prompt_id INTEGER NOT NULL,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  change_note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY(prompt_id) REFERENCES prompts(id),
  UNIQUE(prompt_id, version)
);
```

#### `prompt_embeddings` Table
```sql
CREATE TABLE prompt_embeddings (
  prompt_id INTEGER PRIMARY KEY,
  embedding BLOB NOT NULL,
  content_hash TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(prompt_id) REFERENCES prompts(id)
);
```

### Variable Substitution

Prompts can contain variables in the format `{{variable_name}}`. Variables are stored on each prompt as a JSON array and rendered in the frontend for live preview and copy workflows.

### Write Protection

If `PROMPT_LIBRARY_API_KEY` is set, mutating routes require the key through the `X-API-Key` header or `token` query parameter. Read routes remain public by default for local dashboard and agent access.

### Semantic Search

Semantic search uses an Ollama-compatible embeddings endpoint. The default model is `qwen3-embedding:8b`, configurable with `PROMPT_EMBED_MODEL`.

## Theme System

5 CSS-based theme variants stored as context:

1. **Editorial** - Bold serif, high contrast, professional
2. **Warm Earthy** - Warm neutrals, comfortable, inviting
3. **Clean Light** - Minimal, bright, modern
4. **Ledger** - Monospace, ledger-paper aesthetic
5. **Dark Pro** - High contrast dark mode, coding-friendly

Theme is persisted to localStorage and applied via CSS class root.

## Data Flow

```
User Action
    ↓
Frontend Component
    ↓
API Call (fetch to localhost:5202/api/...)
    ↓
FastAPI Route Handler
    ↓
SQLite Query
    ↓
Response JSON
    ↓
Frontend Update + UI Render
```

## Version Control

- Every edit to a prompt triggers creation of new `prompt_versions` row
- Original content remains in `prompts.content` with `current_version` bumped
- Old versions immutable - deleted prompts soft-deleted (not removed from DB)
- Restore operation: create new version from old content

## Deployment Notes

- Frontend and backend run independently - can be deployed separately
- Database file gitignored; seed script generates fresh prompts on startup
- API CORS enabled for configured origins
- Optional API key protection for mutating routes
