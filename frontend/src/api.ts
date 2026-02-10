import type { Prompt, Version } from './types'

const API_BASE = '/api'

export async function getPrompts(search = ''): Promise<Prompt[]> {
  const q = search ? `?search=${encodeURIComponent(search)}` : ''
  const res = await fetch(`${API_BASE}/prompts${q}`)
  const data = await res.json()
  return data.prompts
}

export async function getPrompt(id: number): Promise<Prompt> {
  const res = await fetch(`${API_BASE}/prompts/${id}`)
  return await res.json()
}

export async function createPrompt(payload: Record<string, unknown>): Promise<Prompt> {
  const res = await fetch(`${API_BASE}/prompts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return await res.json()
}

export async function updatePrompt(id: number, payload: Record<string, unknown>): Promise<Prompt> {
  const res = await fetch(`${API_BASE}/prompts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return await res.json()
}

export async function getVersions(id: number): Promise<Version[]> {
  const res = await fetch(`${API_BASE}/prompts/${id}/versions`)
  const data = await res.json()
  return data.versions
}
