import { create } from 'zustand';
import { ErrorContext } from '../../ai/provider';

export interface ErrorAnalysis {
  reason: string;
  fixes: { description: string; command: string }[];
}

interface AIState {
  // Error card
  errorCardOpen: boolean;
  currentError: ErrorContext | null;
  errorAnalysis: ErrorAnalysis | null;
  errorLoading: boolean;
  errorStreaming: string;

  // Natural language
  nlMode: boolean;
  nlSuggestion: string;
  nlLoading: boolean;

  // Explain tooltip
  explainPopup: { text: string; x: number; y: number } | null;
  explainResult: ErrorAnalysis | null;
  explainLoading: boolean;

  // Actions
  setErrorCard: (open: boolean, error?: ErrorContext | null) => void;
  setErrorAnalysis: (analysis: ErrorAnalysis | null) => void;
  appendErrorStreaming: (chunk: string) => void;
  clearErrorStreaming: () => void;
  setNLMode: (mode: boolean, suggestion?: string) => void;
  setExplainPopup: (popup: AIState['explainPopup']) => void;
  setExplainResult: (result: ErrorAnalysis | null) => void;
  setExplainLoading: (loading: boolean) => void;
}

export const useAIStore = create<AIState>((set) => ({
  errorCardOpen: false,
  currentError: null,
  errorAnalysis: null,
  errorLoading: false,
  errorStreaming: '',

  nlMode: false,
  nlSuggestion: '',
  nlLoading: false,

  explainPopup: null,
  explainResult: null,
  explainLoading: false,

  setErrorCard: (open, error = null) => set({
    errorCardOpen: open,
    currentError: error,
    errorAnalysis: open ? null : null,
    errorStreaming: open ? '' : ''
  }),

  setErrorAnalysis: (analysis) => set({ errorAnalysis: analysis, errorLoading: false }),

  appendErrorStreaming: (chunk) => set(state => ({
    errorStreaming: state.errorStreaming + chunk
  })),

  clearErrorStreaming: () => set({ errorStreaming: '' }),

  setNLMode: (mode, suggestion = '') => set({
    nlMode: mode,
    nlSuggestion: suggestion,
    nlLoading: mode && !suggestion
  }),

  setExplainPopup: (popup) => set({ explainPopup: popup }),

  setExplainResult: (result) => set({ explainResult: result, explainLoading: false }),

  setExplainLoading: (loading) => set({ explainLoading: loading })
}));
