import { ErrorContext } from './provider';

export const PROMPTS = {
  explainError: (ctx: ErrorContext) => `
你是一个 Windows 终端助手。用户在 ${ctx.shell} 中执行了命令并遇到错误。

命令: ${ctx.command}
退出码: ${ctx.exitCode}
错误输出:
${ctx.stderr.slice(-1000)}

请用中文回复，格式严格如下（JSON）：
{
  "reason": "一句话解释错误原因",
  "fixes": [
    { "description": "修复方案描述", "command": "具体命令" }
  ]
}
只输出 JSON，不要其他内容。`,

  naturalToCommand: (input: string, shell: string) => `
将以下自然语言描述转换为 ${shell} 命令。
只输出命令本身，不要解释。

描述: ${input}
命令:`,

  explainCommand: (command: string) => `
解释以下终端命令，用中文回复，格式为 JSON：
{
  "summary": "命令整体作用（一句话）",
  "parts": [
    { "token": "命令或参数", "meaning": "含义" }
  ]
}

命令: ${command}
只输出 JSON。`,
};
