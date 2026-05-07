import { invoke } from '@tauri-apps/api/core'
import type {
  Project, CreateProjectPayload, UpdateProjectPayload,
  Conversation, CreateConversationPayload,
  Message, AddMessagePayload,
  FileContent, DirectoryListing,
  KnowledgeEntry, CreateKnowledgePayload, UpdateKnowledgePayload,
  Skill, CreateSkillPayload, UpdateSkillPayload,
  SearchResult,
} from '@/types/commands'

// ===== Projects =====
export const projectIpc = {
  list: () => invoke<Project[]>('list_projects'),
  get: (id: string) => invoke<Project>('get_project', { id }),
  create: (payload: CreateProjectPayload) => invoke<Project>('create_project', { payload }),
  update: (payload: UpdateProjectPayload) => invoke<Project>('update_project', { payload }),
  delete: (id: string) => invoke<void>('delete_project', { id }),
}

// ===== Files =====
export const fileIpc = {
  read: (path: string) => invoke<FileContent>('read_file', { path }),
  write: (path: string, content: string) => invoke<void>('write_file', { path, content }),
  listDir: (path: string) => invoke<DirectoryListing>('list_directory', { path }),
  search: (query: string, projectId?: string) => invoke<SearchResult[]>('search_files', { query, projectId }),
}

// ===== Conversations =====
export const chatIpc = {
  listConversations: (projectId: string) => invoke<Conversation[]>('list_conversations', { projectId }),
  createConversation: (payload: CreateConversationPayload) => invoke<Conversation>('create_conversation', { payload }),
  deleteConversation: (id: string) => invoke<void>('delete_conversation', { id }),
  listMessages: (conversationId: string) => invoke<Message[]>('list_messages', { conversationId }),
  addMessage: (payload: AddMessagePayload) => invoke<Message>('add_message', { payload }),
}

// ===== Knowledge =====
export const knowledgeIpc = {
  list: () => invoke<KnowledgeEntry[]>('list_knowledge'),
  get: (id: string) => invoke<KnowledgeEntry>('get_knowledge', { id }),
  create: (payload: CreateKnowledgePayload) => invoke<KnowledgeEntry>('create_knowledge', { payload }),
  update: (payload: UpdateKnowledgePayload) => invoke<KnowledgeEntry>('update_knowledge', { payload }),
  delete: (id: string) => invoke<void>('delete_knowledge', { id }),
  search: (query: string) => invoke<KnowledgeEntry[]>('search_knowledge', { query }),
}

// ===== Skills =====
export const skillIpc = {
  list: () => invoke<Skill[]>('list_skills'),
  listEnabled: () => invoke<Skill[]>('list_enabled_skills'),
  get: (id: string) => invoke<Skill>('get_skill', { id }),
  create: (payload: CreateSkillPayload) => invoke<Skill>('create_skill', { payload }),
  update: (payload: UpdateSkillPayload) => invoke<Skill>('update_skill', { payload }),
  toggle: (id: string) => invoke<Skill>('toggle_skill', { id }),
  delete: (id: string) => invoke<void>('delete_skill', { id }),
}

// ===== Settings =====
export const settingsIpc = {
  get: (key: string) => invoke<string | null>('get_setting', { key }),
  set: (key: string, value: string) => invoke<void>('set_setting', { key, value }),
}

// ===== All IPC =====
export const ipc = {
  projects: projectIpc,
  files: fileIpc,
  chat: chatIpc,
  knowledge: knowledgeIpc,
  skills: skillIpc,
  settings: settingsIpc,
}
