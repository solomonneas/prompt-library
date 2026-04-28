<p align="center">
  <img src="docs/assets/prompt-library-banner.jpg" alt="Prompt Library banner">
</p>

<h1 align="center">Prompt Library</h1>

<p align="center">
  <strong>Your source of truth for prompt management, versioning, search, and reuse.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.9%2B-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python 3.9+">
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI 0.115">
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript 5.7">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=0f172a" alt="React 18">
  <img src="https://img.shields.io/badge/SQLite-prompt_store-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite prompt store">
  <img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="MIT license">
</p>

Your source of truth for prompt management. Browse, version, and share prompts with built-in variable substitution, instant copy-to-clipboard, and full search capabilities.

## Quick Start

```bash
# Clone the repo
git clone https://github.com/solomonneas/prompt-library.git
cd prompt-library

# Backend setup
cd backend
pip install -r requirements.txt
uvicorn app:app --reload --host 0.0.0.0 --port 5202
cd ..

# Frontend setup
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5201` | Backend API on `http://localhost:5202`

## Features

- **Expandable Cards** - View full prompts inline, no click-through needed
- **Copy-to-Clipboard** - One-click copy on every prompt
- **Version Control** - Immutable history on every edit, view or restore any version
- **Variable Substitution** - Use `{{variables}}` in prompts with live preview
- **Smart Filtering** - Categories, tags, and full-text search
- **Semantic Search** - Optional Ollama embeddings with `qwen3-embedding:8b` by default
- **5 Visual Themes** - Editorial, Warm Earthy, Clean Light, Ledger, Dark Pro
- **REST API** - Programmatic access for sub-agents and integrations
- **Write Protection** - Optional API key requirement for create, update, delete, restore, and embedding rebuild routes
- **Demo Data** - 8 seed prompts for fresh installs, real database gitignored

## Documentation

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Frontend/backend design, database schema, API endpoints, theming |
| [CONFIGURATION.md](docs/CONFIGURATION.md) | Environment variables, port config, data setup |

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** FastAPI + SQLite + Pydantic
- **Embeddings:** Ollama-compatible embeddings API
- **Storage:** SQLite (prompts, versions, and embeddings, gitignored)

## License

MIT - See LICENSE file for details
