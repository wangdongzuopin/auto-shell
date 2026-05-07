import { create } from "zustand";
import { projectIpc, chatIpc } from "@/lib/ipc";

export interface Project {
  id: string;
  name: string;
  path?: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Conversation {
  id: string;
  projectId: string;
  title: string;
  mode?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function toFrontendProject(p: { id: string; name: string; path: string; description?: string; created_at: number; updated_at: number }): Project {
  return { id: p.id, name: p.name, path: p.path, description: p.description, createdAt: p.created_at, updatedAt: p.updated_at };
}

function toFrontendConv(c: { id: string; project_id: string; title: string; mode?: string; created_at: number; updated_at: number }): Conversation {
  return { id: c.id, projectId: c.project_id, title: c.title, mode: c.mode, createdAt: c.created_at, updatedAt: c.updated_at };
}

function toFrontendMsg(m: { id: string; conversation_id: string; role: string; content: string; timestamp: number }): Message {
  return { id: m.id, conversationId: m.conversation_id, role: m.role as "user" | "assistant", content: m.content, timestamp: m.timestamp };
}

interface ProjectState {
  projects: Project[];
  conversations: Conversation[];
  messages: Message[];
  currentProjectId: string | null;
  currentConversationId: string | null;
  expandedProjects: Record<string, boolean>;
  isLoaded: boolean;

  loadFromBackend: () => Promise<void>;

  addProject: (name: string, path?: string) => Promise<string>;
  removeProject: (id: string) => Promise<void>;
  renameProject: (id: string, name: string) => Promise<void>;
  setCurrentProject: (id: string | null) => void;

  addConversation: (projectId: string, title?: string) => Promise<string>;
  removeConversation: (id: string) => Promise<void>;
  setCurrentConversation: (id: string | null) => void;

  addMessage: (conversationId: string, role: "user" | "assistant", content: string) => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  getMessages: (conversationId: string) => Message[];

  toggleProjectExpanded: (id: string) => void;
  isProjectExpanded: (id: string) => boolean;

  getProjectConversations: (projectId: string) => Conversation[];
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  conversations: [],
  messages: [],
  currentProjectId: null,
  currentConversationId: null,
  expandedProjects: {},
  isLoaded: false,

  loadFromBackend: async () => {
    try {
      const backendProjects = await projectIpc.list();
      const projects = backendProjects.map(toFrontendProject);

      const allConvs: Conversation[] = [];
      for (const p of backendProjects) {
        const backendConvs = await chatIpc.listConversations(p.id);
        allConvs.push(...backendConvs.map(toFrontendConv));
      }

      set({ projects, conversations: allConvs, isLoaded: true });
    } catch (e) {
      console.error("Failed to load from backend:", e);
      set({ isLoaded: true });
    }
  },

  addProject: async (name, path) => {
    const id = genId();
    if (!path) path = "";
    try {
      const p = await projectIpc.create({ name, path });
      const project = toFrontendProject(p);
      set((s) => ({
        projects: [...s.projects, project],
        currentProjectId: id,
        expandedProjects: { ...s.expandedProjects, [id]: true },
      }));
    } catch {
      // Fallback: add locally if backend unavailable
      const now = Date.now();
      const project: Project = { id, name, path, createdAt: now, updatedAt: now };
      set((s) => ({
        projects: [...s.projects, project],
        currentProjectId: id,
        expandedProjects: { ...s.expandedProjects, [id]: true },
      }));
    }
    return id;
  },

  removeProject: async (id) => {
    try { await projectIpc.delete(id); } catch { /* ignore */ }
    set((s) => {
      const convIds = s.conversations.filter((c) => c.projectId === id).map((c) => c.id);
      return {
        projects: s.projects.filter((p) => p.id !== id),
        conversations: s.conversations.filter((c) => c.projectId !== id),
        messages: s.messages.filter((m) => !convIds.includes(m.conversationId)),
        currentProjectId: s.currentProjectId === id ? null : s.currentProjectId,
        currentConversationId: s.currentProjectId === id ? null : s.currentConversationId,
      };
    });
  },

  renameProject: async (id, name) => {
    try { await projectIpc.update({ id, name }); } catch { /* ignore */ }
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === id ? { ...p, name, updatedAt: Date.now() } : p
      ),
    }));
  },

  setCurrentProject: (id) => {
    set({ currentProjectId: id, currentConversationId: null });
  },

  addConversation: async (projectId, title) => {
    const id = genId();
    try {
      const c = await chatIpc.createConversation({
        project_id: projectId,
        title: title || `对话 ${new Date().toLocaleDateString("zh-CN")}`,
      });
      const conv = toFrontendConv(c);
      set((s) => ({
        conversations: [...s.conversations, conv],
        currentConversationId: id,
      }));
    } catch {
      const now = Date.now();
      const conv: Conversation = {
        id,
        projectId,
        title: title || `对话 ${new Date(now).toLocaleDateString("zh-CN")}`,
        createdAt: now,
        updatedAt: now,
      };
      set((s) => ({
        conversations: [...s.conversations, conv],
        currentConversationId: id,
      }));
    }
    return id;
  },

  removeConversation: async (id) => {
    try { await chatIpc.deleteConversation(id); } catch { /* ignore */ }
    set((s) => ({
      conversations: s.conversations.filter((c) => c.id !== id),
      messages: s.messages.filter((m) => m.conversationId !== id),
      currentConversationId: s.currentConversationId === id ? null : s.currentConversationId,
    }));
  },

  setCurrentConversation: (id) => {
    const conv = get().conversations.find((c) => c.id === id);
    set({
      currentConversationId: id,
      currentProjectId: conv ? conv.projectId : get().currentProjectId,
    });
  },

  addMessage: async (conversationId, role, content) => {
    const msg: Message = { id: genId(), conversationId, role, content, timestamp: Date.now() };
    set((s) => ({ messages: [...s.messages, msg] }));
    try {
      await chatIpc.addMessage({
        conversation_id: conversationId,
        role,
        content,
      });
    } catch { /* ignore */ }
  },

  loadMessages: async (conversationId) => {
    try {
      const backendMsgs = await chatIpc.listMessages(conversationId);
      const msgs = backendMsgs.map(toFrontendMsg);
      set((s) => ({
        messages: [...s.messages.filter((m) => m.conversationId !== conversationId), ...msgs],
      }));
    } catch { /* ignore */ }
  },

  getMessages: (conversationId) => {
    return get().messages.filter((m) => m.conversationId === conversationId);
  },

  toggleProjectExpanded: (id) => {
    set((s) => ({
      expandedProjects: { ...s.expandedProjects, [id]: !s.expandedProjects[id] },
    }));
  },

  isProjectExpanded: (id) => {
    return get().expandedProjects[id] ?? true;
  },

  getProjectConversations: (projectId) => {
    return get().conversations.filter((c) => c.projectId === projectId);
  },
}));
