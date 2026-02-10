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
│ - Themes            │         │ - Variable Subst.    │
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
| `POST` | `/api/prompts/{id}/restore` | Restore from previous version |

### Database Schema

#### `prompts` Table
```sql
CREATE TABLE prompts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  tags TEXT,  -- JSON array stored as string
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  current_version INTEGER DEFAULT 1,
  deleted BOOLEAN DEFAULT 0
);
```

#### `prompt_versions` Table
```sql
CREATE TABLE prompt_versions (
  id TEXT PRIMARY KEY,
  prompt_id TEXT NOT NULL FOREIGN KEY,
  version_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  changed_at TIMESTAMP,
  UNIQUE(prompt_id, version_number)
);
```

### Variable Substitution

Prompts can contain variables in the format `{{variable_name}}`. The backend provides a substitution endpoint:

```
POST /api/prompts/substitute
{
  "prompt_id": "uuid",
  "variables": {
    "variable_name": "value",
    "another_var": "another_value"
  }
}
```

Frontend renders live preview as user types variable values.

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
- API CORS enabled for frontend (configurable in `backend/main.py`)
- No auth/permissions layer (internal use, add as needed)
