import { create } from 'zustand';
import type { Thread, Message, Artifact } from '../../shared/types';

interface ChatState {
  threads: Thread[];
  currentThreadId: string | null;
  currentThread: Thread | null;
  isLoading: boolean;

  createThread: (title?: string) => Thread;
  deleteThread: (id: string) => void;
  updateThread: (id: string, updates: Partial<Thread>) => void;
  setCurrentThread: (id: string | null) => void;
  getThread: (id: string) => Thread | undefined;

  addMessage: (threadId: string, message: Message) => void;
  updateMessage: (threadId: string, messageId: string, updates: Partial<Message>) => void;
  clearMessages: (threadId: string) => void;

  addArtifact: (threadId: string, artifact: Artifact) => void;

  setLoading: (loading: boolean) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

export const useChatStore = create<ChatState>()((set, get) => ({
  threads: [],
  currentThreadId: null,
  currentThread: null,
  isLoading: false,

  createThread: (title) => {
    const now = Date.now();
    const thread: Thread = {
      id: generateId(),
      title: title || '新对话',
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({ threads: [thread, ...state.threads] }));
    return thread;
  },

  deleteThread: (id) => set((state) => ({
    threads: state.threads.filter((t) => t.id !== id),
    currentThreadId: state.currentThreadId === id ? null : state.currentThreadId,
    currentThread: state.currentThreadId === id ? null : state.currentThread,
  })),

  updateThread: (id, updates) => set((state) => ({
    threads: state.threads.map((t) =>
      t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t
    ),
    currentThread: state.currentThreadId === id
      ? { ...state.currentThread!, ...updates, updatedAt: Date.now() }
      : state.currentThread,
  })),

  setCurrentThread: (id) => set((state) => ({
    currentThreadId: id,
    currentThread: id ? state.threads.find((t) => t.id === id) || null : null,
  })),

  getThread: (id) => get().threads.find((t) => t.id === id),

  addMessage: (threadId, message) => set((state) => ({
    threads: state.threads.map((t) =>
      t.id === threadId
        ? { ...t, messages: [...t.messages, message], updatedAt: Date.now() }
        : t
    ),
    currentThread: state.currentThreadId === threadId
      ? { ...state.currentThread!, messages: [...state.currentThread.messages, message] }
      : state.currentThread,
  })),

  updateMessage: (threadId, messageId, updates) => set((state) => ({
    threads: state.threads.map((t) =>
      t.id === threadId
        ? {
            ...t,
            messages: t.messages.map((m) =>
              m.id === messageId ? { ...m, ...updates } : m
            ),
          }
        : t
    ),
    currentThread: state.currentThreadId === threadId
      ? {
          ...state.currentThread!,
          messages: state.currentThread.messages.map((m) =>
            m.id === messageId ? { ...m, ...updates } : m
          ),
        }
      : state.currentThread,
  })),

  clearMessages: (threadId) => set((state) => ({
    threads: state.threads.map((t) =>
      t.id === threadId ? { ...t, messages: [] } : t
    ),
    currentThread: state.currentThreadId === threadId
      ? { ...state.currentThread!, messages: [] }
      : state.currentThread,
  })),

  addArtifact: (threadId, artifact) => set((state) => ({
    threads: state.threads.map((t) =>
      t.id === threadId
        ? {
            ...t,
            messages: t.messages.map((m) =>
              m.role === 'assistant'
                ? { ...m, artifacts: [...(m.artifacts || []), artifact] }
                : m
            ),
          }
        : t
    ),
  })),

  setLoading: (loading) => set({ isLoading: loading }),
}));
