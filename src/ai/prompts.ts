import { ErrorContext } from './provider';

export const PROMPTS = {
  explainError: (ctx: ErrorContext) => `
你是一个终端助手。用户在 ${ctx.shell} 中执行命令后报错了。
命令: ${ctx.command}
退出码: ${ctx.exitCode}
当前目录: ${ctx.cwd}
标准错误输出:
${ctx.stderr.slice(-1200)}

请用中文严格返回 JSON：{
  "reason": "一句话解释错误原因",
  "fixes": [
    { "description": "修复建议", "command": "具体命令" }
  ]
}
只输出 JSON，不要附加说明。`,

  naturalToCommand: (input: string, shell: string) => `
请把下面这句自然语言转换成可直接执行的 ${shell} 命令。只输出命令本身，不要解释。
描述: ${input}
`,

  explainCommand: (command: string) => `
请用中文解释下面的终端命令，并严格返回 JSON：{
  "summary": "一句话说明命令作用",
  "parts": [
    { "token": "命令或参数", "meaning": "含义" }
  ]
}

命令: ${command}
只输出 JSON。`
};
