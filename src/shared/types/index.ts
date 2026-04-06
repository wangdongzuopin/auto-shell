// Thread / 对话
export interface Thread {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  model?: string;
  knowledgeIds?: string[];
}

// Message / 消息
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  artifacts?: Artifact[];
  timestamp: number;
}

// Artifact / 生成物
export interface Artifact {
  id: string;
  type: 'code' | 'document' | 'image';
  title: string;
  content: string;
  language?: string;
  createdAt: number;
}

// Knowledge / 知识库
export interface Knowledge {
  id: string;
  name: string;
  description?: string;
  files: KnowledgeFile[];
  createdAt: number;
  updatedAt: number;
}

export interface KnowledgeFile {
  id: string;
  name: string;
  type: string;
  size: number;
  content?: string;
}

// Skill / 技能
export interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  enabled: boolean;
}

// Project / 项目
export interface Project {
  id: string;
  name: string;
  description?: string;
  threadIds: string[];
  knowledgeIds: string[];
  createdAt: number;
  updatedAt: number;
}

// User / 用户
export interface User {
  id: string;
  name: string;
  avatar?: string;
}

// Permission Mode
export type PermissionMode =
  | 'acceptEdits'
  | 'bypassPermissions'
  | 'default'
  | 'dontAsk'
  | 'plan';
