// Tool system exports

// Core types
export * from './types';

// Tool contracts
export * from './Tool';
export * from './buildTool';

// Registry
export * from './ToolRegistry';

// Built-in tools
export { ExplainErrorTool } from './base/ExplainErrorTool';
export { NaturalToCommandTool } from './base/NaturalToCommandTool';
export { ExplainCommandTool } from './base/ExplainCommandTool';

// Prompts
export * from './prompts';

// Registration
export { registerBuiltinTools } from './base';
