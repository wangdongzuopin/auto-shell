import type { ReactNode } from 'react';
import type { ToolContext, ToolResult } from './types';

/**
 * 工具接口
 * 所有工具必须实现此接口
 */
export interface Tool<Input = unknown, Output = unknown> {
  /** 工具名称 */
  readonly name: string;

  /** 工具描述 */
  readonly description: string;

  /** 最大结果大小 */
  maxResultSizeChars?: number;

  /**
   * 调用工具执行实际操作
   */
  call(args: Input, context: ToolContext): Promise<ToolResult<Output>>;

  /**
   * 获取工具描述
   */
  getDescription(input?: Partial<Input>): string;

  /**
   * 是否启用
   */
  isEnabled(): boolean;

  /**
   * 是否并发安全
   */
  isConcurrencySafe(input: Input): boolean;

  /**
   * 是否只读操作
   */
  isReadOnly(input: Input): boolean;

  /**
   * 渲染工具使用消息
   */
  renderToolUseMessage(input: Partial<Input>): ReactNode;

  /**
   * 渲染工具结果消息
   */
  renderToolResultMessage(output: Output): ReactNode;
}

/**
 * 工具默认值
 */
export const TOOL_DEFAULTS = {
  isEnabled: () => true,
  isConcurrencySafe: () => false,
  isReadOnly: () => false,
  maxResultSizeChars: 10_000,
} as const;
