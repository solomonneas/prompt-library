import json
import sqlite3
from contextlib import closing
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "prompts.db"
SEED_PATH = Path("/home/clawdbot/.openclaw/workspace/variant-gallery/PROMPT_RULES.md")


def utc_now() -> str:
    return datetime.utcnow().isoformat()


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with closing(get_conn()) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS prompts (
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
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS prompt_versions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                prompt_id INTEGER NOT NULL,
                version INTEGER NOT NULL,
                content TEXT NOT NULL,
                change_note TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL,
                FOREIGN KEY(prompt_id) REFERENCES prompts(id),
                UNIQUE(prompt_id, version)
            )
            """
        )
        conn.commit()


def parse_tags(tags: str) -> list[str]:
    return [t.strip() for t in tags.split(",") if t.strip()]


def parse_variables(raw: str) -> Any:
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return []


def row_to_prompt(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "name": row["name"],
        "title": row["title"],
        "category": row["category"],
        "tags": parse_tags(row["tags"]),
        "content": row["content"],
        "variables": parse_variables(row["variables"]),
        "current_version": row["current_version"],
        "is_deleted": bool(row["is_deleted"]),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def seed_prompt_rules() -> None:
    if not SEED_PATH.exists():
        return
    content = SEED_PATH.read_text(encoding="utf-8")
    now = utc_now()
    with closing(get_conn()) as conn:
        existing = conn.execute(
            "SELECT id FROM prompts WHERE name = ?", ("variant-design-rules",)
        ).fetchone()
        if existing:
            return
        cur = conn.execute(
            """
            INSERT INTO prompts (name, title, category, tags, content, variables, current_version, is_deleted, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
            """,
            (
                "variant-design-rules",
                "Variant Design Rules",
                "design-rules",
                "variants, ui, design, security-tools",
                content,
                json.dumps([]),
                now,
                now,
            ),
        )
        prompt_id = cur.lastrowid
        conn.execute(
            """
            INSERT INTO prompt_versions (prompt_id, version, content, change_note, created_at)
            VALUES (?, 1, ?, ?, ?)
            """,
            (prompt_id, content, "Initial import from PROMPT_RULES.md", now),
        )
        conn.commit()


class PromptCreate(BaseModel):
    name: str = Field(min_length=1)
    title: str = Field(min_length=1)
    category: str
    tags: list[str] = []
    content: str
    variables: list[dict[str, Any] | str] = []
    change_note: str = "Initial version"


class PromptUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[list[str]] = None
    content: Optional[str] = None
    variables: Optional[list[dict[str, Any] | str]] = None
    change_note: str = "Updated prompt"


app = FastAPI(title="Prompt Library API", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    init_db()
    seed_prompt_rules()


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/prompts")
def list_prompts(
    category: Optional[str] = Query(default=None),
    tag: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
) -> dict[str, Any]:
    query = "SELECT * FROM prompts WHERE is_deleted = 0"
    params: list[Any] = []
    if category:
        query += " AND category = ?"
        params.append(category)
    if tag:
        query += " AND tags LIKE ?"
        params.append(f"%{tag}%")
    if search:
        query += " AND (name LIKE ? OR title LIKE ? OR content LIKE ? OR tags LIKE ?)"
        wildcard = f"%{search}%"
        params.extend([wildcard, wildcard, wildcard, wildcard])
    query += " ORDER BY updated_at DESC"

    with closing(get_conn()) as conn:
        rows = conn.execute(query, params).fetchall()
        prompts = [row_to_prompt(r) for r in rows]
    return {"prompts": prompts}


@app.get("/api/prompts/{prompt_id}")
def get_prompt(prompt_id: int) -> dict[str, Any]:
    with closing(get_conn()) as conn:
        row = conn.execute(
            "SELECT * FROM prompts WHERE id = ? AND is_deleted = 0", (prompt_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Prompt not found")
        return row_to_prompt(row)


@app.get("/api/prompts/by-name/{name}")
def get_prompt_by_name(name: str) -> dict[str, Any]:
    with closing(get_conn()) as conn:
        row = conn.execute(
            "SELECT * FROM prompts WHERE name = ? AND is_deleted = 0", (name,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Prompt not found")
        return row_to_prompt(row)


@app.get("/api/prompts/{prompt_id}/versions")
def get_versions(prompt_id: int) -> dict[str, Any]:
    with closing(get_conn()) as conn:
        prompt = conn.execute("SELECT id FROM prompts WHERE id = ?", (prompt_id,)).fetchone()
        if not prompt:
            raise HTTPException(status_code=404, detail="Prompt not found")
        rows = conn.execute(
            "SELECT id, prompt_id, version, content, change_note, created_at FROM prompt_versions WHERE prompt_id = ? ORDER BY version DESC",
            (prompt_id,),
        ).fetchall()
    return {"versions": [dict(r) for r in rows]}


@app.get("/api/prompts/{prompt_id}/versions/{version}")
def get_specific_version(prompt_id: int, version: int) -> dict[str, Any]:
    with closing(get_conn()) as conn:
        row = conn.execute(
            "SELECT id, prompt_id, version, content, change_note, created_at FROM prompt_versions WHERE prompt_id = ? AND version = ?",
            (prompt_id, version),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Version not found")
    return dict(row)


@app.post("/api/prompts/{prompt_id}/restore/{version}")
def restore_version(prompt_id: int, version: int) -> dict[str, Any]:
    with closing(get_conn()) as conn:
        # Get the prompt
        prompt_row = conn.execute(
            "SELECT * FROM prompts WHERE id = ? AND is_deleted = 0", (prompt_id,)
        ).fetchone()
        if not prompt_row:
            raise HTTPException(status_code=404, detail="Prompt not found")
        
        # Get the version to restore
        version_row = conn.execute(
            "SELECT content FROM prompt_versions WHERE prompt_id = ? AND version = ?",
            (prompt_id, version),
        ).fetchone()
        if not version_row:
            raise HTTPException(status_code=404, detail="Version not found")
        
        # Create new version with restored content
        next_version = int(prompt_row["current_version"]) + 1
        now = utc_now()
        restored_content = version_row["content"]
        
        conn.execute(
            """
            UPDATE prompts
            SET content = ?, current_version = ?, updated_at = ?
            WHERE id = ?
            """,
            (restored_content, next_version, now, prompt_id),
        )
        conn.execute(
            "INSERT INTO prompt_versions (prompt_id, version, content, change_note, created_at) VALUES (?, ?, ?, ?, ?)",
            (prompt_id, next_version, restored_content, f"Restored from version {version}", now),
        )
        conn.commit()
    return get_prompt(prompt_id)


@app.post("/api/prompts")
def create_prompt(payload: PromptCreate) -> dict[str, Any]:
    now = utc_now()
    tags = ", ".join(payload.tags)
    vars_json = json.dumps(payload.variables)
    with closing(get_conn()) as conn:
        try:
            cur = conn.execute(
                """
                INSERT INTO prompts (name, title, category, tags, content, variables, current_version, is_deleted, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
                """,
                (payload.name, payload.title, payload.category, tags, payload.content, vars_json, now, now),
            )
        except sqlite3.IntegrityError:
            raise HTTPException(status_code=409, detail="Prompt name already exists")
        prompt_id = cur.lastrowid
        conn.execute(
            "INSERT INTO prompt_versions (prompt_id, version, content, change_note, created_at) VALUES (?, 1, ?, ?, ?)",
            (prompt_id, payload.content, payload.change_note, now),
        )
        conn.commit()
    return get_prompt(prompt_id)


@app.put("/api/prompts/{prompt_id}")
def update_prompt(prompt_id: int, payload: PromptUpdate) -> dict[str, Any]:
    with closing(get_conn()) as conn:
        row = conn.execute("SELECT * FROM prompts WHERE id = ? AND is_deleted = 0", (prompt_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Prompt not found")

        title = payload.title if payload.title is not None else row["title"]
        category = payload.category if payload.category is not None else row["category"]
        tags = ", ".join(payload.tags) if payload.tags is not None else row["tags"]
        content = payload.content if payload.content is not None else row["content"]
        variables = json.dumps(payload.variables) if payload.variables is not None else row["variables"]

        next_version = int(row["current_version"]) + 1
        now = utc_now()

        conn.execute(
            """
            UPDATE prompts
            SET title = ?, category = ?, tags = ?, content = ?, variables = ?, current_version = ?, updated_at = ?
            WHERE id = ?
            """,
            (title, category, tags, content, variables, next_version, now, prompt_id),
        )
        conn.execute(
            "INSERT INTO prompt_versions (prompt_id, version, content, change_note, created_at) VALUES (?, ?, ?, ?, ?)",
            (prompt_id, next_version, content, payload.change_note, now),
        )
        conn.commit()
    return get_prompt(prompt_id)


@app.delete("/api/prompts/{prompt_id}")
def delete_prompt(prompt_id: int) -> dict[str, bool]:
    with closing(get_conn()) as conn:
        row = conn.execute("SELECT id FROM prompts WHERE id = ? AND is_deleted = 0", (prompt_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Prompt not found")
        conn.execute("UPDATE prompts SET is_deleted = 1, updated_at = ? WHERE id = ?", (utc_now(), prompt_id))
        conn.commit()
    return {"ok": True}


@app.get("/api/categories")
def list_categories() -> dict[str, Any]:
    with closing(get_conn()) as conn:
        rows = conn.execute(
            "SELECT category, COUNT(*) as count FROM prompts WHERE is_deleted = 0 GROUP BY category ORDER BY category"
        ).fetchall()
    return {"categories": [dict(r) for r in rows]}
