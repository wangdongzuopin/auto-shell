import type { ReactNode } from 'react';
import { BaseTool } from './BaseTool';
import type { ToolContext, ToolResult, ErrorAnalysis } from '../types';
import { getExplainErrorPrompt, parseErrorAnalysis } from '../prompts';

/**
 * 错误解释工具输入
 */
export interface ExplainErrorInput {
  error: string;
  command?: string;
  shell?: string;
  cwd?: string;
}

/**
 * 错误解释工具
 * 分析命令执行错误并提供修复建议
 */
export class ExplainErrorTool extends BaseTool<ExplainErrorInput, ErrorAnalysis> {
  readonly name = 'explainError';
  readonly description = 'Explains an error message and suggests possible fixes';
  maxResultSizeChars = 10_000;

  async call(input: ExplainErrorInput, context: ToolContext): Promise<ToolResult<ErrorAnalysis>> {
    const prompt = getExplainErrorPrompt(
      input.error,
      input.command,
      input.shell || context.shell,
      input.cwd || context.cwd,
    );

    const response = await context.aiProvider.chat([
      { role: 'user', content: prompt },
    ]);

    const data = parseErrorAnalysis(response);

    return {
      data,
      newMessages: [
        { role: 'assistant' as const, content: response },
      ],
    };
  }

  getDescription(): string {
    return 'Explains an error message and suggests possible fixes';
  }

  isConcurrencySafe(): boolean {
    return true;
  }

  isReadOnly(): boolean {
    return true;
  }

  renderToolUseMessage(input: Partial<ExplainErrorInput>): ReactNode {
    const preview = input.error?.slice(0, 50) || '未知错误';
    return (
      <div style={{ color: '#f59e0b' }}>
        正在分析错误: {preview}...
      </div>
    );
  }

  renderToolResultMessage(output: ErrorAnalysis): ReactNode {
    return (
      <div style={{ padding: '8px 0' }}>
        <div style={{ marginBottom: '8px' }}>
          <strong style={{ color: '#ef4444' }}>错误原因:</strong>
          <span style={{ marginLeft: '8px' }}>{output.reason}</span>
        </div>
        {output.fixes.length > 0 && (
          <div>
            <strong style={{ color: '#22c55e' }}>修复建议:</strong>
            <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
              {output.fixes.map((fix, index) => (
                <li key={index} style={{ marginBottom: '4px' }}>
                  {fix.description}
                  {fix.command && (
                    <code style={{
                      marginLeft: '8px',
                      padding: '2px 6px',
                      background: '#1f2937',
                      borderRadius: '4px',
                      fontSize: '0.9em',
                    }}>
                      {fix.command}
                    </code>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }
}
