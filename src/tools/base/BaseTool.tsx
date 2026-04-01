import type { ReactNode } from 'react';
import type { Tool } from '../Tool';
import type { ToolContext, ToolResult } from '../types';

/**
 * 基础工具抽象类
 * 提供通用功能的默认实现
 */
export abstract class BaseTool<Input, Output> implements Tool<Input, Output> {
  abstract readonly name: string;
  abstract readonly description: string;
  maxResultSizeChars: number = 10_000;

  /**
   * 默认实现：返回名称作为用户友好名称
   */
  getDescription(): string {
    return this.description;
  }

  /**
   * 默认实现：始终启用
   */
  isEnabled(): boolean {
    return true;
  }

  /**
   * 默认实现：非并发安全
   */
  isConcurrencySafe(): boolean {
    return false;
  }

  /**
   * 默认实现：非只读
   */
  isReadOnly(): boolean {
    return false;
  }

  /**
   * 执行工具逻辑（子类必须实现）
   */
  abstract call(input: Input, context: ToolContext): Promise<ToolResult<Output>>;

  /**
   * 渲染工具使用消息（子类必须实现）
   */
  abstract renderToolUseMessage(input: Partial<Input>): ReactNode;

  /**
   * 渲染工具结果消息（子类必须实现）
   */
  abstract renderToolResultMessage(output: Output): ReactNode;
}
