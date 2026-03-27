import { useCallback } from 'react';
import { useAIStore } from '../store/ai';
import { ErrorContext } from '../../ai/provider';

export function useAI() {
  const {
    setErrorCard,
    setErrorAnalysis,
    appendErrorStreaming,
    clearErrorStreaming,
    setNLMode,
    setExplainPopup,
    setExplainResult,
    setExplainLoading,
    errorStreaming
  } = useAIStore();

  const explainError = useCallback(async (ctx: ErrorContext) => {
    setErrorCard(true, ctx);
    clearErrorStreaming();

    try {
      const generator = await window.api.explainError(ctx);
      for await (const chunk of generator) {
        appendErrorStreaming(chunk);
      }
      // Parse final result
      try {
        const analysis = JSON.parse(errorStreaming + errorStreaming);
        setErrorAnalysis(analysis);
      } catch {
        // If streaming is not complete JSON, try to find JSON in the text
        const match = (errorStreaming).match(/\{[\s\S]*\}/);
        if (match) {
          setErrorAnalysis(JSON.parse(match[0]));
        }
      }
    } catch (e) {
      console.error('AI explain error failed:', e);
      setErrorCard(false);
    }
  }, [setErrorCard, clearErrorStreaming, appendErrorStreaming, setErrorAnalysis, errorStreaming]);

  const naturalToCommand = useCallback(async (input: string, shell: string) => {
    setNLMode(true, '');
    try {
      const generator = await window.api.naturalToCommand(input, shell);
      let result = '';
      for await (const chunk of generator) {
        result += chunk;
        setNLMode(true, result.trim());
      }
    } catch (e) {
      console.error('Natural to command failed:', e);
      setNLMode(false);
    }
  }, [setNLMode]);

  const explainCommand = useCallback(async (command: string, x: number, y: number) => {
    setExplainPopup({ text: command, x, y });
    setExplainLoading(true);
    try {
      const result = await window.api.explainCommand(command);
      setExplainResult(result);
    } catch (e) {
      console.error('Explain command failed:', e);
      setExplainPopup(null);
    }
  }, [setExplainPopup, setExplainLoading, setExplainResult]);

  const checkAvailability = useCallback(async () => {
    try {
      return await window.api.checkAIAvailable();
    } catch {
      return false;
    }
  }, []);

  return {
    explainError,
    naturalToCommand,
    explainCommand,
    checkAvailability
  };
}
