import { create } from 'zustand';
import type { Thread, Message, Artifact } from '../../shared/types';

interface ChatState {
  threads: Thread[];
  currentThreadId: string | null;
  currentThread: Thread | null;
  isLoading: boolean;
  initialized: boolean;

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
  loadSessionsFromDisk: () => Promise<void>;
  saveThread: (thread: Thread) => void;
  removeThreadFile: (threadId: string) => Promise<void>;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

// Helper to save a thread to disk
const saveThreadToDisk = (thread: Thread) => {
  if (window.api?.saveSession) {
    window.api.saveSession(thread.id, thread).catch(console.error);
  }
};

// Helper to delete a thread file from disk
const deleteThreadFromDisk = (threadId: string) => {
  if (window.api?.deleteSession) {
    window.api.deleteSession(threadId).catch(console.error);
  }
};

// Track if thread has been added to list (has messages)
const threadHasMessages = new Set<string>();

export const useChatStore = create<ChatState>()((set, get) => ({
  threads: [],
  currentThreadId: null,
  currentThread: null,
  isLoading: false,
  initialized: false,

  createThread: (title) => {
    const now = Date.now();
    const thread: Thread = {
      id: generateId(),
      title: title || '新对话',
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    // Don't add to threads list yet - only set as current
    set({ currentThreadId: thread.id, currentThread: thread });
    return thread;
  },

  deleteThread: (id) => {
    const state = get();
    const thread = state.threads.find((t) => t.id === id);
    if (thread) {
      deleteThreadFromDisk(id);
    }
    threadHasMessages.delete(id);
    set((state) => ({
      threads: state.threads.filter((t) => t.id !== id),
      currentThreadId: state.currentThreadId === id ? null : state.currentThreadId,
      currentThread: state.currentThreadId === id ? null : state.currentThread,
    }));
  },

  updateThread: (id, updates) => set((state) => {
    const updatedThreads = state.threads.map((t) =>
      t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t
    );
    const updatedThread = updatedThreads.find((t) => t.id === id);
    if (updatedThread) {
      saveThreadToDisk(updatedThread);
    }
    return {
      threads: updatedThreads,
      currentThread: state.currentThreadId === id
        ? { ...state.currentThread!, ...updates, updatedAt: Date.now() }
        : state.currentThread,
    };
  }),

  setCurrentThread: (id) => set((state) => {
    if (id === null) {
      return { currentThreadId: null, currentThread: null };
    }
    // If thread exists in threads, use it; otherwise check currentThread
    const thread = state.threads.find((t) => t.id === id) ||
      (state.currentThread?.id === id ? state.currentThread : null);
    return { currentThreadId: id, currentThread: thread };
  }),

  getThread: (id) => get().threads.find((t) => t.id === id),

  addMessage: (threadId, message) => set((state) => {
    const isFirstMessage = !threadHasMessages.has(threadId);
    threadHasMessages.add(threadId);

    // Find or create the thread
    let thread = state.threads.find((t) => t.id === threadId);
    if (!thread) {
      // Create thread entry if it's first message and thread doesn't exist yet
      if (isFirstMessage) {
        thread = {
          id: threadId,
          title: '新对话',
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
      } else {
        thread = state.currentThread;
      }
    }

    if (!thread) return state;

    const updatedThread = {
      ...thread,
      messages: [...thread.messages, message],
      updatedAt: Date.now(),
    };

    // Update title from first user message if it's still the default
    if (isFirstMessage && message.role === 'user' && thread.title === '新对话') {
      const title = message.content.slice(0, 30) + (message.content.length > 30 ? '...' : '');
      updatedThread.title = title || '新对话';
    }

    // Save to disk
    saveThreadToDisk(updatedThread);

    // Build new threads array
    let newThreads: Thread[];
    if (isFirstMessage && message.role === 'user') {
      // Add to beginning of threads list
      newThreads = [updatedThread, ...state.threads.filter((t) => t.id !== threadId)];
    } else {
      // Update existing
      newThreads = state.threads.map((t) => (t.id === threadId ? updatedThread : t));
    }

    return {
      threads: newThreads,
      currentThread: state.currentThreadId === threadId ? updatedThread : state.currentThread,
    };
  }),

  updateMessage: (threadId, messageId, updates) => set((state) => {
    const updatedThreads = state.threads.map((t) =>
      t.id === threadId
        ? {
            ...t,
            messages: t.messages.map((m) =>
              m.id === messageId ? { ...m, ...updates } : m
            ),
          }
        : t
    );
    const updatedThread = updatedThreads.find((t) => t.id === threadId);
    if (updatedThread) {
      saveThreadToDisk(updatedThread);
    }
    return {
      threads: updatedThreads,
      currentThread: state.currentThreadId === threadId
        ? {
            ...state.currentThread!,
            messages: state.currentThread.messages.map((m) =>
              m.id === messageId ? { ...m, ...updates } : m
            ),
          }
        : state.currentThread,
    };
  }),

  clearMessages: (threadId) => set((state) => {
    const updatedThreads = state.threads.map((t) =>
      t.id === threadId ? { ...t, messages: [], updatedAt: Date.now() } : t
    );
    const updatedThread = updatedThreads.find((t) => t.id === threadId);
    if (updatedThread) {
      saveThreadToDisk(updatedThread);
    }
    threadHasMessages.delete(threadId);
    return {
      threads: updatedThreads,
      currentThread: state.currentThreadId === threadId
        ? { ...state.currentThread!, messages: [] }
        : state.currentThread,
    };
  }),

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

  loadSessionsFromDisk: async () => {
    if (!window.api?.listAllSessions) return;
    try {
      const sessions = await window.api.listAllSessions();
      if (sessions && sessions.length > 0) {
        const sorted = sessions
          .filter((s: Thread) => s && s.id && s.messages && s.messages.length > 0)
          .sort((a: Thread, b: Thread) => (b.updatedAt || 0) - (a.updatedAt || 0))
          .slice(0, 50);
        // Mark all loaded threads as having messages
        sorted.forEach((t: Thread) => threadHasMessages.add(t.id));
        set({ threads: sorted, initialized: true });
      } else {
        set({ initialized: true });
      }
    } catch (error) {
      console.error('Failed to load sessions from disk:', error);
      set({ initialized: true });
    }
  },

  saveThread: (thread) => {
    saveThreadToDisk(thread);
  },

  removeThreadFile: async (threadId) => {
    threadHasMessages.delete(threadId);
    if (window.api?.deleteSession) {
      await window.api.deleteSession(threadId);
    }
  },
}));
