import type { AIProvider } from '../ai/provider';
import type { ChatMessage } from '../shared/types';

/**
 * 工具调用上下文
 */
export interface ToolContext {
  cwd: string;
  shell: string;
  aiProvider: AIProvider;
}

/**
 * 工具结果
 */
export interface ToolResult<T> {
  data: T;
  newMessages?: ChatMessage[];
}

/**
 * 错误分析结果
 */
export interface ErrorAnalysis {
  reason: string;
  fixes: {
    description: string;
    command: string;
  }[];
}

/**
 * 命令解释结果
 */
export interface CommandExplanation {
  summary: string;
  parts: {
    token: string;
    meaning: string;
  }[];
  variants?: string[];
}
