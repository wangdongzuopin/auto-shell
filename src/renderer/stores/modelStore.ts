import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AIModel {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'minimax' | 'glm' | 'ollama' | 'custom';
  apiKey?: string;
  baseUrl?: string;
  modelName: string;
  isDefault: boolean;
}

interface ModelState {
  models: AIModel[];
  activeModelId: string | null;

  // Actions
  addModel: (model: Omit<AIModel, 'id'>) => AIModel;
  updateModel: (id: string, updates: Partial<AIModel>) => void;
  deleteModel: (id: string) => void;
  setDefaultModel: (id: string) => void;
  setActiveModel: (id: string) => void;
  getDefaultModel: () => AIModel | undefined;
  getActiveModel: () => AIModel | undefined;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

export const useModelStore = create<ModelState>()(
  persist(
    (set, get) => ({
      models: [
        {
          id: 'default-sonnet',
          name: 'Sonnet 4',
          provider: 'anthropic',
          modelName: 'claude-sonnet-4-20250514',
          isDefault: true,
        },
        {
          id: 'default-opus',
          name: 'Opus 4',
          provider: 'anthropic',
          modelName: 'claude-opus-4-5-20251114',
          isDefault: false,
        },
        {
          id: 'default-minimax',
          name: 'MiniMax',
          provider: 'minimax',
          modelName: 'MiniMax-Text-01',
          baseUrl: 'https://api.minimaxi.com/v1',
          isDefault: false,
        },
      ],
      activeModelId: 'default-sonnet',

      addModel: (modelData) => {
        const newModel: AIModel = {
          ...modelData,
          id: generateId(),
        };
        set((state) => ({ models: [...state.models, newModel] }));
        return newModel;
      },

      updateModel: (id, updates) => set((state) => ({
        models: state.models.map((m) =>
          m.id === id ? { ...m, ...updates } : m
        ),
      })),

      deleteModel: (id) => set((state) => {
        const newModels = state.models.filter((m) => m.id !== id);
        // If deleted model was default, set a new default
        if (state.models.find((m) => m.id === id)?.isDefault && newModels.length > 0) {
          newModels[0].isDefault = true;
        }
        // If deleted model was active, switch to default
        const activeModelId = state.activeModelId === id
          ? (newModels.find((m) => m.isDefault)?.id || newModels[0]?.id)
          : state.activeModelId;
        return {
          models: newModels,
          activeModelId,
        };
      }),

      setDefaultModel: (id) => set((state) => ({
        models: state.models.map((m) => ({
          ...m,
          isDefault: m.id === id,
        })),
      })),

      setActiveModel: (id) => set({ activeModelId: id }),

      getDefaultModel: () => get().models.find((m) => m.isDefault),

      getActiveModel: () => {
        const state = get();
        return state.models.find((m) => m.id === state.activeModelId) ||
               state.models.find((m) => m.isDefault);
      },
    }),
    {
      name: 'model-storage',
    }
  )
);
