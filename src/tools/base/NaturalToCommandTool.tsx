import type { ReactNode } from 'react';
import { BaseTool } from './BaseTool';
import type { ToolContext, ToolResult } from '../types';
import { getNaturalToCommandPrompt } from '../prompts';

/**
 * 自然语言转命令工具输入
 */
export interface NaturalToCommandInput {
  naturalLanguage: string;
  shell?: string;
  cwd?: string;
}

/**
 * 自然语言转命令工具输出
 */
export interface NaturalToCommandOutput {
  command: string;
  explanation?: string;
}

/**
 * 自然语言转命令工具
 * 将自然语言描述转换为 Shell 命令
 */
export class NaturalToCommandTool extends BaseTool<NaturalToCommandInput, NaturalToCommandOutput> {
  readonly name = 'naturalToCommand';
  readonly description = 'Converts natural language to a shell command';
  maxResultSizeChars = 5_000;

  async call(input: NaturalToCommandInput, context: ToolContext): Promise<ToolResult<NaturalToCommandOutput>> {
    const prompt = getNaturalToCommandPrompt(
      input.naturalLanguage,
      input.shell || context.shell,
      input.cwd || context.cwd,
    );

    const response = await context.aiProvider.chat([
      { role: 'user', content: prompt },
    ]);

    // 清理响应，提取命令
    let command = response.trim();
    // 移除可能的 markdown 代码块
    command = command.replace(/^```(?:bash|sh)?\s*/i, '').replace(/\s*```$/i, '');
    // 移除开头的命令标签
    command = command.replace(/^(command|命令):\s*/i, '').trim();

    return {
      data: {
        command,
        explanation: response.length > command.length + 50 ? response : undefined,
      },
      newMessages: [
        { role: 'assistant' as const, content: response },
      ],
    };
  }

  getDescription(): string {
    return 'Converts natural language to a shell command';
  }

  isConcurrencySafe(): boolean {
    return true;
  }

  isReadOnly(): boolean {
    return true;
  }

  renderToolUseMessage(input: Partial<NaturalToCommandInput>): ReactNode {
    return (
      <div style={{ color: '#3b82f6' }}>
        正在转换: "{input.naturalLanguage?.slice(0, 30)}..."
      </div>
    );
  }

  renderToolResultMessage(output: NaturalToCommandOutput): ReactNode {
    return (
      <div style={{ padding: '8px 0' }}>
        <div style={{ marginBottom: '8px' }}>
          <strong style={{ color: '#22c55e' }}>命令:</strong>
          <code style={{
            marginLeft: '8px',
            padding: '4px 12px',
            background: '#1f2937',
            borderRadius: '4px',
            fontSize: '1.1em',
            fontFamily: 'monospace',
          }}>
            {output.command}
          </code>
        </div>
        {output.explanation && (
          <div style={{ color: '#9ca3af', fontSize: '0.9em' }}>
            {output.explanation}
          </div>
        )}
      </div>
    );
  }
}
