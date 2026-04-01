import type { ReactNode } from 'react';
import { BaseTool } from './BaseTool';
import type { ToolContext, ToolResult, CommandExplanation } from '../types';
import { getExplainCommandPrompt, parseCommandExplanation } from '../prompts';

/**
 * 命令解释工具输入
 */
export interface ExplainCommandInput {
  command: string;
  shell?: string;
}

/**
 * 命令解释工具
 * 解释 Shell 命令的含义
 */
export class ExplainCommandTool extends BaseTool<ExplainCommandInput, CommandExplanation> {
  readonly name = 'explainCommand';
  readonly description = 'Explains what a shell command does';
  maxResultSizeChars = 8_000;

  async call(input: ExplainCommandInput, context: ToolContext): Promise<ToolResult<CommandExplanation>> {
    const prompt = getExplainCommandPrompt(input.command, input.shell || context.shell);

    const response = await context.aiProvider.chat([
      { role: 'user', content: prompt },
    ]);

    const data = parseCommandExplanation(response);

    return {
      data,
      newMessages: [
        { role: 'assistant' as const, content: response },
      ],
    };
  }

  getDescription(): string {
    return 'Explains what a shell command does';
  }

  isConcurrencySafe(): boolean {
    return true;
  }

  isReadOnly(): boolean {
    return true;
  }

  renderToolUseMessage(input: Partial<ExplainCommandInput>): ReactNode {
    return (
      <div style={{ color: '#8b5cf6' }}>
        正在解释命令: <code>{input.command?.slice(0, 30)}</code>
      </div>
    );
  }

  renderToolResultMessage(output: CommandExplanation): ReactNode {
    return (
      <div style={{ padding: '8px 0' }}>
        <div style={{ marginBottom: '12px' }}>
          <strong style={{ color: '#f59e0b' }}>命令功能:</strong>
          <span style={{ marginLeft: '8px' }}>{output.summary}</span>
        </div>
        {output.parts.length > 0 && (
          <div style={{ marginBottom: '8px' }}>
            <strong style={{ color: '#22c55e' }}>命令分解:</strong>
            <div style={{
              marginTop: '6px',
              padding: '8px',
              background: '#1f2937',
              borderRadius: '6px',
              fontFamily: 'monospace',
            }}>
              {output.parts.map((part, index) => (
                <div key={index} style={{ marginBottom: '4px' }}>
                  <code style={{ color: '#60a5fa', marginRight: '8px' }}>
                    {part.token}
                  </code>
                  <span style={{ color: '#9ca3af' }}>
                    {part.meaning}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {output.variants && output.variants.length > 0 && (
          <div>
            <strong style={{ color: '#ec4899' }}>其他写法:</strong>
            <div style={{ marginTop: '4px' }}>
              {output.variants.map((variant, index) => (
                <code key={index} style={{
                  marginRight: '8px',
                  padding: '2px 6px',
                  background: '#374151',
                  borderRadius: '4px',
                  fontSize: '0.9em',
                }}>
                  {variant}
                </code>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
}
