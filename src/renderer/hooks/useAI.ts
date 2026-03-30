import { useCallback } from 'react';
import type { ChatMessage } from '../../shared/types';
import { ErrorContext } from '../../ai/provider';
import { useAIStore } from '../store/ai';

export function useAI() {
  const {
    setErrorCard,
    setErrorAnalysis,
    setErrorLoading,
    setNLMode,
    setExplainPopup,
    setExplainResult,
    setExplainLoading
  } = useAIStore();

  const explainError = useCallback(async (ctx: ErrorContext) => {
    setErrorCard(true, ctx);
    setErrorLoading(true);

    try {
      const response = await window.api.explainError(ctx);
      const match = response.match(/\{[\s\S]*\}/);
      const analysis = JSON.parse(match ? match[0] : response);
      setErrorAnalysis(analysis);
    } catch (error) {
      console.error('AI explain error failed:', error);
      setErrorCard(false);
      setErrorLoading(false);
    }
  }, [setErrorAnalysis, setErrorCard, setErrorLoading]);

  const naturalToCommand = useCallback(async (input: string, shell: string) => {
    setNLMode(true, '');
    try {
      const result = await window.api.naturalToCommand(input, shell);
      setNLMode(true, result.trim());
    } catch (error) {
      console.error('Natural to command failed:', error);
      setNLMode(false);
    }
  }, [setNLMode]);

  const explainCommand = useCallback(async (command: string, x: number, y: number) => {
    setExplainPopup({ text: command, x, y });
    setExplainLoading(true);
    try {
      const result = await window.api.explainCommand(command);
      setExplainResult(result);
    } catch (error) {
      console.error('Explain command failed:', error);
      setExplainPopup(null);
      setExplainLoading(false);
    }
  }, [setExplainLoading, setExplainPopup, setExplainResult]);

  const chat = useCallback(async (messages: ChatMessage[]) => {
    return window.api.chatWithAI(messages);
  }, []);

  const streamChat = useCallback((messages: ChatMessage[], callbacks: {
    onChunk: (chunk: string) => void;
    onDone: () => void;
    onError: (message: string) => void;
  }) => {
    const requestId = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return window.api.streamChatWithAI(requestId, messages, callbacks);
  }, []);

  const checkAvailability = useCallback(async () => {
    try {
      return await window.api.checkAIAvailable();
    } catch {
      return false;
    }
  }, []);

  return {
    chat,
    streamChat,
    explainError,
    naturalToCommand,
    explainCommand,
    checkAvailability
  };
}
