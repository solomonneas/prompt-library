export type Prompt = {
  id: number
  name: string
  title: string
  category: string
  tags: string[]
  content: string
  variables: Array<{ name: string; description?: string } | string>
  current_version: number
  created_at: string
  updated_at: string
}

export type Version = {
  id: number
  prompt_id: number
  version: number
  content: string
  change_note: string
  created_at: string
}
