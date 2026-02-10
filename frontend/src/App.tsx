import { useEffect, useMemo, useState } from 'react'
import { createPrompt, getPrompt, getPrompts, getVersions, updatePrompt } from './api'
import type { Prompt, Version } from './types'

type Page = 'variants' | 'browse' | 'view' | 'edit' | 'history' | 'docs'
type Variant = 1 | 2 | 3 | 4 | 5

type PromptForm = {
  name: string
  title: string
  category: string
  tags: string
  content: string
  change_note: string
}

type VariantMeta = {
  id: Variant
  name: string
  description: string
  preview: string[]
}

const VARIANTS: VariantMeta[] = [
  { id: 1, name: 'Editorial', description: 'Warm, serif-forward reading experience with refined spacing.', preview: ['#faf8f5', '#b8860b', '#ffffff'] },
  { id: 2, name: 'Warm Earthy', description: 'Soft neutral palette with grounded orange accents.', preview: ['#f8f3ea', '#c46b28', '#fffaf1'] },
  { id: 3, name: 'Clean Light', description: 'Minimal white canvas with calm blue-gray structure.', preview: ['#ffffff', '#4f6b95', '#eef3f9'] },
  { id: 4, name: 'Ledger / Accounting', description: 'Paper-like archive aesthetic with ruled separators.', preview: ['#f5f0e8', '#6d4c34', '#efe4d5'] },
  { id: 5, name: 'Dark Professional', description: 'Dark slate interface with restrained blue-purple highlights.', preview: ['#1a1a2e', '#627dd7', '#252d47'] },
]

const API_ROOT = ''
const INITIAL_FORM: PromptForm = {
  name: '',
  title: '',
  category: '',
  tags: '',
  content: '',
  change_note: '',
}

function extractVariables(content: string): string[] {
  const matches = content.match(/{{\s*([a-zA-Z0-9_\-.]+)\s*}}/g) ?? []
  return [...new Set(matches.map((m) => m.replace(/[{}\s]/g, '')))]
}

function interpolate(content: string, values: Record<string, string>): string {
  return content.replace(/{{\s*([a-zA-Z0-9_\-.]+)\s*}}/g, (_, key: string) => values[key] || `{{${key}}}`)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getPreview(content: string): string {
  return content.split('\n').slice(0, 2).join('\n')
}

function buildDiff(base: string, current: string): Array<{ type: 'same' | 'add' | 'remove'; text: string }> {
  const a = base.split('\n')
  const b = current.split('\n')
  const out: Array<{ type: 'same' | 'add' | 'remove'; text: string }> = []
  const max = Math.max(a.length, b.length)

  for (let i = 0; i < max; i += 1) {
    const left = a[i]
    const right = b[i]
    if (left === right && left !== undefined) {
      out.push({ type: 'same', text: `  ${left}` })
    } else {
      if (left !== undefined) out.push({ type: 'remove', text: `- ${left}` })
      if (right !== undefined) out.push({ type: 'add', text: `+ ${right}` })
    }
  }

  return out
}

function getStoredVariant(): Variant {
  const raw = Number(localStorage.getItem('prompt-library-variant'))
  if (raw >= 1 && raw <= 5) return raw as Variant
  return 1
}

export default function App() {
  const [page, setPage] = useState<Page>('variants')
  const [variant, setVariant] = useState<Variant>(getStoredVariant())

  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState<string>('all')

  const [selected, setSelected] = useState<Prompt | null>(null)
  const [versions, setVersions] = useState<Version[]>([])
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null)

  const [form, setForm] = useState<PromptForm>(INITIAL_FORM)
  const [variableValues, setVariableValues] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set())

  function toggleCard(id: number) {
    setExpandedCards((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  useEffect(() => {
    document.body.className = `variant-${variant}`
    localStorage.setItem('prompt-library-variant', String(variant))
  }, [variant])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === '0') {
        setPage('variants')
        return
      }

      const target = event.target as HTMLElement | null
      const isTypingField = Boolean(
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable),
      )

      if (isTypingField) return

      if (/^[1-5]$/.test(event.key)) {
        setVariant(Number(event.key) as Variant)
        setPage((prev) => (prev === 'variants' ? 'browse' : prev))
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    void loadPrompts()
    void loadCategories()
  }, [])

  async function loadPrompts(searchValue = search) {
    const rows = await getPrompts(searchValue)
    setPrompts(rows)
  }

  async function loadCategories() {
    try {
      const res = await fetch(`${API_ROOT}/api/categories`)
      const data = await res.json()
      const raw = Array.isArray(data.categories) ? data.categories : []
      const list: string[] = raw.map((c: string | { category: string }) => typeof c === 'string' ? c : c.category)
      setCategories(list)
    } catch {
      setCategories([])
    }
  }

  const availableTags = useMemo(() => {
    const tags = new Set<string>()
    prompts.forEach((p) => p.tags.forEach((t) => tags.add(t)))
    return [...tags]
  }, [prompts])

  const filteredPrompts = useMemo(() => {
    return prompts.filter((p) => {
      const categoryOk = selectedCategory === 'all' || p.category === selectedCategory
      const tagOk = activeTag === 'all' || p.tags.includes(activeTag)
      return categoryOk && tagOk
    })
  }, [prompts, selectedCategory, activeTag])

  const detectedVariables = useMemo(() => extractVariables(selected?.content ?? ''), [selected?.content])
  const renderedVariablePreview = useMemo(() => {
    if (!selected) return ''
    return interpolate(selected.content, variableValues)
  }, [selected, variableValues])

  const editPreview = useMemo(() => interpolate(form.content, variableValues), [form.content, variableValues])

  const ledgerLabels = variant === 4
    ? {
        browse: 'Prompt Archive',
        categories: 'Category Index',
        history: 'Version Ledger',
      }
    : {
        browse: 'Browse',
        categories: 'All categories',
        history: 'Version history',
      }

  async function openPrompt(id: number) {
    const p = await getPrompt(id)
    setSelected(p)
    setVariableValues({})
    setPage('view')
  }

  async function openHistory(id: number) {
    const [promptData, versionsData] = await Promise.all([getPrompt(id), getVersions(id)])
    setSelected(promptData)
    setVersions(versionsData)
    setSelectedVersion(versionsData[0] ?? null)
    setPage('history')
  }

  function openCreate() {
    setSelected(null)
    setForm({ ...INITIAL_FORM, category: categories[0] ?? '' })
    setVariableValues({})
    setPage('edit')
  }

  function openEdit(prompt: Prompt) {
    setSelected(prompt)
    setForm({
      name: prompt.name,
      title: prompt.title,
      category: prompt.category,
      tags: prompt.tags.join(', '),
      content: prompt.content,
      change_note: '',
    })
    setVariableValues({})
    setPage('edit')
  }

  async function savePrompt() {
    const variables = extractVariables(form.content)
    const payload = {
      name: form.name.trim(),
      title: form.title.trim(),
      category: form.category,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      content: form.content,
      variables,
      change_note: form.change_note.trim() || (selected ? 'Updated prompt' : 'Created prompt'),
    }

    setIsSaving(true)
    try {
      if (selected) {
        await updatePrompt(selected.id, payload)
        setNotice('Prompt updated successfully.')
      } else {
        await createPrompt(payload)
        setNotice('Prompt created successfully.')
      }
      await loadPrompts()
      setPage('browse')
      setSelected(null)
      setForm(INITIAL_FORM)
    } finally {
      setIsSaving(false)
      setTimeout(() => setNotice(''), 1800)
    }
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text)
    setNotice('Copied to clipboard.')
    setTimeout(() => setNotice(''), 1400)
  }

  const diffRows = useMemo(() => {
    if (!selected || !selectedVersion) return []
    return buildDiff(selectedVersion.content, selected.content)
  }, [selected, selectedVersion])

  return (
    <div className="app-shell">
      <header className="app-header">
        <button className="brand" onClick={() => setPage('browse')}>Prompt Library</button>

        <nav className="main-nav">
          {page !== 'variants' && (
            <button className="variant-link" onClick={() => setPage('variants')}>← Variants</button>
          )}
          <button className={page === 'browse' ? 'active' : ''} onClick={() => setPage('browse')}>{ledgerLabels.browse}</button>
          <button className={page === 'edit' && !selected ? 'active' : ''} onClick={openCreate}>New</button>
          <button className={page === 'docs' ? 'active' : ''} onClick={() => setPage('docs')}>API Docs</button>
        </nav>
      </header>

      {notice && <p className="notice">{notice}</p>}

      <main>
        {page === 'variants' && (
          <section className="variants-home">
            <h1>Prompt Library</h1>
            <p>Choose your experience</p>
            <div className="variant-grid">
              {VARIANTS.map((item) => (
                <button
                  key={item.id}
                  className={variant === item.id ? 'variant-card active' : 'variant-card'}
                  onClick={() => {
                    setVariant(item.id)
                    setPage('browse')
                  }}
                >
                  <span className="variant-number">Variant {item.id}</span>
                  <strong>{item.name}</strong>
                  <span className="variant-desc">{item.description}</span>
                  <span className="variant-preview" aria-hidden>
                    {item.preview.map((color) => <i key={color} style={{ backgroundColor: color }} />)}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {page === 'browse' && (
          <section className="stack-lg">
            <div className="search-row">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search prompts by title, name, or content"
              />
              <button onClick={() => void loadPrompts(search)}>Search</button>
            </div>

            <div className="pill-row">
              <button className={selectedCategory === 'all' ? 'pill active' : 'pill'} onClick={() => setSelectedCategory('all')}>{ledgerLabels.categories}</button>
              {categories.map((c) => (
                <button key={c} className={selectedCategory === c ? 'pill active' : 'pill'} onClick={() => setSelectedCategory(c)}>{c}</button>
              ))}
            </div>

            {availableTags.length > 0 && (
              <div className="pill-row compact">
                <button className={activeTag === 'all' ? 'pill active' : 'pill'} onClick={() => setActiveTag('all')}>All tags</button>
                {availableTags.map((tag) => (
                  <button key={tag} className={activeTag === tag ? 'pill active' : 'pill'} onClick={() => setActiveTag(tag)}>#{tag}</button>
                ))}
              </div>
            )}

            <div className="prompt-grid">
              {filteredPrompts.map((p) => {
                const isExpanded = expandedCards.has(p.id)
                return (
                  <article key={p.id} className={`prompt-card${isExpanded ? ' expanded' : ''}`}>
                    <div className="card-top" onClick={() => toggleCard(p.id)}>
                      <div className="card-title-row">
                        <h3>{p.title}</h3>
                        <span className="expand-icon">{isExpanded ? '▾' : '▸'}</span>
                      </div>
                      <p className="category-badge">{p.category}</p>
                      <div className="tag-wrap">{p.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}</div>
                      {!isExpanded && <pre className="card-preview">{getPreview(p.content)}</pre>}
                      <p className="muted">v{p.current_version} · Updated {formatDate(p.updated_at)}</p>
                    </div>

                    {isExpanded && (
                      <div className="card-expanded">
                        <pre className="code-block">{p.content}</pre>
                        <div className="card-actions">
                          <button className="copy-btn" onClick={(e) => { e.stopPropagation(); void copy(p.content) }}>
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M5 11H3.5A1.5 1.5 0 012 9.5v-7A1.5 1.5 0 013.5 1h7A1.5 1.5 0 0112 2.5V5"/></svg>
                            Copy
                          </button>
                          <button className="ghost-edit" onClick={(e) => { e.stopPropagation(); openEdit(p) }}>Edit</button>
                          <button className="ghost-edit" onClick={(e) => { e.stopPropagation(); void openHistory(p.id) }}>History</button>
                          <button className="ghost-edit" onClick={(e) => { e.stopPropagation(); void openPrompt(p.id) }}>Details</button>
                        </div>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          </section>
        )}

        {page === 'view' && selected && (
          <section className="stack-lg">
            <div className="panel">
              <div className="between">
                <div>
                  <h2>{selected.title}</h2>
                  <p className="muted">{selected.name} · v{selected.current_version} · Updated {formatDate(selected.updated_at)}</p>
                </div>
                <div className="actions">
                  <button onClick={() => void copy(selected.content)}>Copy Prompt</button>
                  <button onClick={() => void openHistory(selected.id)}>View History</button>
                  <button onClick={() => openEdit(selected)}>Edit</button>
                </div>
              </div>

              <pre className="code-block">{selected.content}</pre>
            </div>

            {detectedVariables.length > 0 && (
              <div className="panel stack">
                <h3>Variable substitution</h3>
                <div className="form-grid variable-grid">
                  {detectedVariables.map((name) => (
                    <label key={name}>
                      {name}
                      <input
                        value={variableValues[name] ?? ''}
                        onChange={(e) => setVariableValues((prev) => ({ ...prev, [name]: e.target.value }))}
                        placeholder={`Value for ${name}`}
                      />
                    </label>
                  ))}
                </div>
                <pre className="code-block preview">{renderedVariablePreview}</pre>
              </div>
            )}
          </section>
        )}

        {page === 'edit' && (
          <section className="edit-layout">
            <div className="panel stack">
              <h2>{selected ? 'Edit prompt' : 'Create prompt'}</h2>
              <div className="form-grid">
                <label>
                  Slug name
                  <input
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. design-review"
                    disabled={Boolean(selected)}
                  />
                </label>

                <label>
                  Title
                  <input
                    value={form.title}
                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Prompt title"
                  />
                </label>

                <label>
                  Category
                  <select value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}>
                    <option value="">Select category</option>
                    {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </label>

                <label>
                  Tags (comma-separated)
                  <input
                    value={form.tags}
                    onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
                    placeholder="writing, analysis, product"
                  />
                </label>
              </div>

              <label>
                Prompt content
                <textarea
                  rows={16}
                  value={form.content}
                  onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                  placeholder="Write your prompt using {{variables}} where needed"
                />
              </label>

              <label>
                Change note
                <input
                  value={form.change_note}
                  onChange={(e) => setForm((prev) => ({ ...prev, change_note: e.target.value }))}
                  placeholder="Describe what changed"
                />
              </label>

              <button className="save" onClick={() => void savePrompt()} disabled={isSaving}>{isSaving ? 'Saving…' : 'Save prompt'}</button>
            </div>

            <aside className="panel stack">
              <h3>Live preview</h3>
              <pre className="code-block preview">{editPreview || 'Preview appears as you type.'}</pre>
            </aside>
          </section>
        )}

        {page === 'history' && selected && (
          <section className="history-layout">
            <aside className="panel stack version-list">
              <h2>{ledgerLabels.history}</h2>
              {versions.map((v) => (
                <button key={v.id} className={selectedVersion?.id === v.id ? 'version-item active' : 'version-item'} onClick={() => setSelectedVersion(v)}>
                  <strong>v{v.version}</strong>
                  <span>{v.change_note || 'No note'}</span>
                  <small>{formatDate(v.created_at)}</small>
                </button>
              ))}
            </aside>

            <div className="panel stack">
              <div className="between">
                <h3>Diff vs current</h3>
                <button onClick={() => setPage('view')}>Back to prompt</button>
              </div>
              <pre className="diff-block">
                {diffRows.map((row, idx) => <div key={`${row.text}-${idx}`} className={`diff-line ${row.type}`}>{row.text}</div>)}
              </pre>
            </div>
          </section>
        )}

        {page === 'docs' && (
          <section className="panel stack docs">
            <h2>API reference</h2>
            <div className="docs-grid">
              {[
                'GET  /api/prompts?search=&category=&tag=',
                'GET  /api/prompts/{id}',
                'GET  /api/prompts/{id}/versions',
                'GET  /api/prompts/{id}/versions/{version}',
                'GET  /api/prompts/by-name/{name}',
                'POST /api/prompts',
                'PUT  /api/prompts/{id}',
                'DELETE /api/prompts/{id}',
                'GET  /api/categories',
                'GET  /api/health',
              ].map((endpoint) => <code key={endpoint}>{endpoint}</code>)}
            </div>

            <h3>Example curl commands</h3>
            {[
              `curl -s ${API_ROOT}/api/prompts`,
              `curl -s ${API_ROOT}/api/prompts/1`,
              `curl -X POST ${API_ROOT}/api/prompts \\\n  -H "Content-Type: application/json" \\\n  -d '{"name":"new-prompt","title":"New Prompt","category":"general","tags":["draft"],"content":"Hello {{name}}","variables":["name"],"change_note":"initial"}'`,
            ].map((example) => (
              <div key={example} className="curl-row">
                <pre className="code-block">{example}</pre>
                <button onClick={() => void copy(example)}>Copy</button>
              </div>
            ))}
          </section>
        )}
      </main>

      <div className="variant-switcher" aria-label="Variant switcher">
        {VARIANTS.map((item) => (
          <button
            key={item.id}
            className={variant === item.id ? 'active' : ''}
            onClick={() => setVariant(item.id)}
            title={`${item.id}: ${item.name}`}
          >
            {item.id}
          </button>
        ))}
      </div>
    </div>
  )
}
