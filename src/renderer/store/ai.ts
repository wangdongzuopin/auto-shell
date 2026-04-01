import { create } from 'zustand';
import { ErrorContext } from '../../ai/provider';

/**
 * ErrorAnalysis - 错误分析结果（explainError）
 */
export interface ErrorAnalysis {
  reason: string;
  fixes: { description: string; command: string }[];
}

/**
 * CommandExplanation - 命令解释结果（explainCommand）
 */
export interface CommandExplanation {
  summary: string;
  parts: { token: string; meaning: string }[];
  variants?: string[];
}

interface AIState {
  // Error card
  errorCardOpen: boolean;
  currentError: ErrorContext | null;
  errorAnalysis: ErrorAnalysis | null;
  errorLoading: boolean;

  // Natural language
  nlMode: boolean;
  nlSuggestion: string;
  nlLoading: boolean;

  // Explain tooltip (command explanation)
  explainPopup: { text: string; x: number; y: number } | null;
  explainResult: CommandExplanation | null;
  explainLoading: boolean;

  // Actions
  setErrorCard: (open: boolean, error?: ErrorContext | null) => void;
  setErrorAnalysis: (analysis: ErrorAnalysis | null) => void;
  setErrorLoading: (loading: boolean) => void;
  setNLMode: (mode: boolean, suggestion?: string) => void;
  setExplainPopup: (popup: AIState['explainPopup']) => void;
  setExplainResult: (result: CommandExplanation | null) => void;
  setExplainLoading: (loading: boolean) => void;
}

export const useAIStore = create<AIState>((set) => ({
  errorCardOpen: false,
  currentError: null,
  errorAnalysis: null,
  errorLoading: false,

  nlMode: false,
  nlSuggestion: '',
  nlLoading: false,

  explainPopup: null,
  explainResult: null,
  explainLoading: false,

  setErrorCard: (open, error = null) => set({
    errorCardOpen: open,
    currentError: error,
    errorAnalysis: null,
    errorLoading: open
  }),

  setErrorAnalysis: (analysis) => set({ errorAnalysis: analysis, errorLoading: false }),

  setErrorLoading: (loading) => set({ errorLoading: loading }),

  setNLMode: (mode, suggestion = '') => set({
    nlMode: mode,
    nlSuggestion: suggestion,
    nlLoading: mode && !suggestion
  }),

  setExplainPopup: (popup) => set({ explainPopup: popup }),

  setExplainResult: (result) => set({ explainResult: result, explainLoading: false }),

  setExplainLoading: (loading) => set({ explainLoading: loading })
}));
