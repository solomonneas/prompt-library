# Prompt Library

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.9+](https://img.shields.io/badge/Python-3.9%2B-blue)](https://www.python.org/downloads/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue)](https://www.typescriptlang.org/)
[![React 18+](https://img.shields.io/badge/React-18%2B-61dafb)](https://react.dev/)

Your source of truth for prompt management. Browse, version, and share prompts with built-in variable substitution, instant copy-to-clipboard, and full search capabilities.

> [Screenshot placeholder: expandable prompt cards with copy buttons, search bar, theme selector]

## Quick Start

```bash
# Clone the repo
git clone https://github.com/solomonneas/prompt-library.git
cd prompt-library

# Backend setup
cd backend
pip install -r requirements.txt
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
- **5 Visual Themes** - Editorial, Warm Earthy, Clean Light, Ledger, Dark Pro
- **REST API** - Programmatic access for sub-agents and integrations
- **Demo Data** - 8 seed prompts for fresh installs, real database gitignored

## Documentation

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Frontend/backend design, database schema, API endpoints, theming |
| [CONFIGURATION.md](docs/CONFIGURATION.md) | Environment variables, port config, data setup |

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** FastAPI + SQLite + Pydantic
- **Storage:** SQLite (prompts + versions, gitignored)

## License

MIT - See LICENSE file for details
