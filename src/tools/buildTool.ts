import { TOOL_DEFAULTS, type Tool } from './Tool';

export type ToolDefinition<Input, Output> =
  Omit<Tool<Input, Output>, 'isEnabled' | 'isConcurrencySafe' | 'isReadOnly' | 'maxResultSizeChars'> &
  Partial<Pick<Tool<Input, Output>, 'isEnabled' | 'isConcurrencySafe' | 'isReadOnly' | 'maxResultSizeChars'>>;

export function buildTool<Input, Output>(
  definition: ToolDefinition<Input, Output>
): Tool<Input, Output> {
  return {
    ...TOOL_DEFAULTS,
    ...definition
  };
}
