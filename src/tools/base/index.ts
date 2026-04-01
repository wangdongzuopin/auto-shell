// 内置工具导出
export { BaseTool } from './BaseTool';
export { ExplainErrorTool } from './ExplainErrorTool';
export type { ExplainErrorInput } from './ExplainErrorTool';

export { NaturalToCommandTool } from './NaturalToCommandTool';
export type { NaturalToCommandInput, NaturalToCommandOutput } from './NaturalToCommandTool';

export { ExplainCommandTool } from './ExplainCommandTool';
export type { ExplainCommandInput } from './ExplainCommandTool';

import { globalToolRegistry } from '../ToolRegistry';
import { ExplainErrorTool } from './ExplainErrorTool';
import { NaturalToCommandTool } from './NaturalToCommandTool';
import { ExplainCommandTool } from './ExplainCommandTool';

/**
 * 注册所有内置工具到全局注册中心
 */
export function registerBuiltinTools(): void {
  // 创建并注册内置工具
  globalToolRegistry.registerTool(new ExplainErrorTool());
  globalToolRegistry.registerTool(new NaturalToCommandTool());
  globalToolRegistry.registerTool(new ExplainCommandTool());

  console.log(
    `[Tools] Registered ${globalToolRegistry.getToolCount()} builtin tools:`,
    globalToolRegistry.getToolNames().join(', '),
  );
}
