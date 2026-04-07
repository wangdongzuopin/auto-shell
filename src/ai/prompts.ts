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

export interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string;
  path: string;
  mode: string;
  enabled: boolean;
  createdAt: number;
}

export function buildSystemPrompt(skills: Skill[]): string {
  const enabledSkills = skills.filter((s) => s.enabled);

  let prompt = `你是一个AI助手，叫Auto Shell。

## 你的能力
- 可以读取、创建和编辑文件
- 可以执行终端命令
- 可以搜索文件和内容
- 可以使用各种技能来帮助你完成任务
- 可以打开网页链接

`;

  if (enabledSkills.length > 0) {
    prompt += `## 可用技能\n`;
    for (const skill of enabledSkills) {
      prompt += `- ${skill.name}: ${skill.description}\n`;
    }
    prompt += `\n`;
  }

  prompt += `## 使用工具
当用户要求读取文件时，使用 Read 工具。
当用户要求创建或修改文件时，使用 Write 工具。
当用户要求执行命令时，使用 Bash 工具。
当用户要求搜索文件时，使用 Glob 工具。
当用户要求搜索文件内容时，使用 Grep 工具。
当用户要求打开网页或浏览器时，使用 open_browser 工具，格式：[TOOL: open_browser: URL]

`;

  prompt += `## 规则
1. 如果你不确定文件是否存在，先尝试读取
2. 执行危险命令前先确认
3. 始终用中文回复
4. 如果工具执行失败，告诉用户错误信息
5. 当需要打开网页时，先提取或确认URL，然后使用 [TOOL: open_browser: URL] 格式调用工具

`;

  return prompt;
}

// Default system prompt for initial use (before skills are loaded)
export const DEFAULT_SYSTEM_PROMPT = buildSystemPrompt([]);
