"""
Seed the Prompt Library with demo/filler prompts.
Run this on fresh installs or when no prompts.db exists.

Usage: python seed_demo.py
"""
import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "prompts.db")

DEMO_PROMPTS = [
    {
        "name": "Code Review Checklist",
        "title": "Code Review Checklist",
        "category": "development",
        "tags": '["code-review", "quality", "checklist"]',
        "content": """# Code Review Checklist

Review the following code for:

## Security
- Input validation and sanitization
- Authentication/authorization checks
- No hardcoded secrets or credentials

## Quality
- Clear naming conventions
- DRY principles followed
- Error handling present
- Edge cases covered

## Performance
- No unnecessary loops or allocations
- Database queries optimized
- Caching where appropriate

Provide feedback as actionable items with line references.""",
    },
    {
        "name": "API Documentation Generator",
        "title": "API Documentation Generator",
        "category": "documentation",
        "tags": '["api", "docs", "openapi"]',
        "content": """# API Documentation Generator

Given an API endpoint or codebase, generate documentation including:

1. **Endpoint Summary**: Method, path, description
2. **Parameters**: Query params, path params, request body schema
3. **Response**: Status codes, response body schema, examples
4. **Authentication**: Required auth method
5. **Error Handling**: Common error responses

Format as OpenAPI-compatible markdown.""",
    },
    {
        "name": "Git Commit Message",
        "title": "Git Commit Message",
        "category": "development",
        "tags": '["git", "commits", "conventional"]',
        "content": """# Git Commit Message Generator

Write a conventional commit message for the given changes.

Format:
```
<type>(<scope>): <subject>

<body>
```

Types: feat, fix, docs, style, refactor, perf, test, chore
- Subject: imperative, lowercase, no period, max 50 chars
- Body: explain what and why (not how), wrap at 72 chars""",
    },
    {
        "name": "Bug Report Template",
        "title": "Bug Report Template",
        "category": "project-management",
        "tags": '["bugs", "reporting", "template"]',
        "content": """# Bug Report

## Environment
- OS:
- Browser/Runtime:
- Version:

## Description
Brief description of the issue.

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
What should happen.

## Actual Behavior
What actually happens.

## Screenshots/Logs
Attach relevant evidence.

## Severity
- [ ] Critical (system down)
- [ ] High (major feature broken)
- [ ] Medium (workaround exists)
- [ ] Low (cosmetic/minor)""",
    },
    {
        "name": "README Scaffold",
        "title": "README Scaffold",
        "category": "documentation",
        "tags": '["readme", "scaffold", "open-source"]',
        "content": """# Project README Generator

Generate a README.md with:

## Sections
1. **Title + Badge row** (build, license, version)
2. **One-line description**
3. **Screenshot/demo GIF** placeholder
4. **Features** (bullet list)
5. **Quick Start** (install + run in <5 steps)
6. **Configuration** (env vars, config files)
7. **Architecture** (brief, with diagram placeholder)
8. **Contributing** (link to CONTRIBUTING.md)
9. **License**

Keep it scannable. No walls of text.""",
    },
    {
        "name": "Unit Test Generator",
        "title": "Unit Test Generator",
        "category": "development",
        "tags": '["testing", "unit-tests", "tdd"]',
        "content": """# Unit Test Generator

Given a function or module, generate comprehensive unit tests covering:

1. **Happy path**: Normal expected inputs
2. **Edge cases**: Empty inputs, boundary values, null/undefined
3. **Error cases**: Invalid inputs, thrown exceptions
4. **Type checking**: Wrong types passed to parameters

Use descriptive test names: `should [expected behavior] when [condition]`

Include setup/teardown where needed. Mock external dependencies.""",
    },
    {
        "name": "Security Audit Prompt",
        "title": "Security Audit Prompt",
        "category": "security",
        "tags": '["security", "audit", "vulnerabilities"]',
        "content": """# Security Audit

Review the provided code/configuration for:

## OWASP Top 10
- Injection (SQL, XSS, Command)
- Broken authentication
- Sensitive data exposure
- XML external entities
- Broken access control
- Security misconfiguration
- Cross-site scripting
- Insecure deserialization
- Known vulnerable components
- Insufficient logging

## Infrastructure
- Exposed ports/services
- Default credentials
- Unencrypted traffic
- Missing rate limiting

Rate each finding: Critical / High / Medium / Low / Info""",
    },
    {
        "name": "Database Schema Review",
        "title": "Database Schema Review",
        "category": "development",
        "tags": '["database", "schema", "review"]',
        "content": """# Database Schema Review

Analyze the provided schema for:

1. **Normalization**: Is it properly normalized? Over-normalized?
2. **Indexing**: Are queries covered by indexes?
3. **Naming**: Consistent conventions (snake_case, singular/plural)
4. **Constraints**: Foreign keys, NOT NULL, CHECK, UNIQUE
5. **Data Types**: Appropriate sizes, avoiding TEXT for everything
6. **Scalability**: Will this hold up at 10x, 100x current volume?

Provide recommendations with SQL migration snippets.""",
    },
]


def seed():
    db_exists = os.path.exists(DB_PATH)
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Create table if needed (matches app.py schema)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS prompts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            title TEXT NOT NULL,
            category TEXT DEFAULT 'general',
            tags TEXT DEFAULT '[]',
            content TEXT NOT NULL,
            variables TEXT DEFAULT '[]',
            current_version INTEGER DEFAULT 1,
            is_deleted INTEGER DEFAULT 0,
            created_at TEXT,
            updated_at TEXT
        )
    """)
    
    cur.execute("""
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
    """)

    # Only seed if empty
    count = cur.execute("SELECT COUNT(*) FROM prompts").fetchone()[0]
    if count > 0:
        print(f"Database already has {count} prompts. Skipping seed.")
        conn.close()
        return

    now = datetime.utcnow().isoformat()
    for p in DEMO_PROMPTS:
        cur.execute(
            """INSERT INTO prompts (name, title, category, tags, content, variables, current_version, is_deleted, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, '[]', 1, 0, ?, ?)""",
            (p["name"], p["title"], p["category"], p["tags"], p["content"], now, now),
        )

    conn.commit()
    conn.close()
    print(f"Seeded {len(DEMO_PROMPTS)} demo prompts.")


if __name__ == "__main__":
    seed()
