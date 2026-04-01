/**
 * 工具专用的 Prompt 模板
 * 复用 src/ai/prompts.ts 的设计
 */

import type { ErrorAnalysis, CommandExplanation } from './types';

/**
 * 获取错误解释的 prompt
 */
export function getExplainErrorPrompt(
  error: string,
  command?: string,
  shell?: string,
  cwd?: string,
): string {
  let prompt = `你是一个终端助手。用户在 ${shell || 'bash'} 中执行命令后报错了。`;

  if (command) {
    prompt += `\n命令: ${command}`;
  }

  if (cwd) {
    prompt += `\n当前目录: ${cwd}`;
  }

  prompt += `\n标准错误输出:\n${error.slice(-1200)}`;

  prompt += `\n\n请用中文严格返回 JSON：{
  "reason": "一句话解释错误原因",
  "fixes": [
    { "description": "修复建议", "command": "具体命令" }
  ]
}
只输出 JSON，不要附加说明。`;

  return prompt;
}

/**
 * 获取自然语言转命令的 prompt
 */
export function getNaturalToCommandPrompt(
  naturalLanguage: string,
  shell: string,
  cwd?: string,
): string {
  let prompt = `请把下面这句自然语言转换成可直接执行的 ${shell} 命令。只输出命令本身，不要解释。`;

  if (cwd) {
    prompt += `\n当前工作目录: ${cwd}`;
  }

  prompt += `\n描述: ${naturalLanguage}`;

  return prompt;
}

/**
 * 获取命令解释的 prompt
 */
export function getExplainCommandPrompt(
  command: string,
  shell?: string,
): string {
  let prompt = `请用中文解释下面的终端命令，并严格返回 JSON：{
  "summary": "一句话说明命令作用",
  "parts": [
    { "token": "命令或参数", "meaning": "含义" }
  ]
}
只输出 JSON。`;

  if (shell) {
    prompt += `\n\n注意：这是 ${shell} 命令。`;
  }

  prompt += `\n命令: ${command}`;

  return prompt;
}

/**
 * 解析错误分析结果
 */
export function parseErrorAnalysis(jsonString: string): ErrorAnalysis {
  try {
    // 尝试提取 JSON（处理可能的 markdown 代码块）
    let cleanJson = jsonString.trim();
    const jsonMatch = cleanJson.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      cleanJson = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(cleanJson);
    return {
      reason: parsed.reason || '未知错误',
      fixes: Array.isArray(parsed.fixes) ? parsed.fixes : [],
    };
  } catch {
    return {
      reason: jsonString.slice(0, 100),
      fixes: [],
    };
  }
}

/**
 * 解析命令解释结果
 */
export function parseCommandExplanation(jsonString: string): CommandExplanation {
  try {
    // 尝试提取 JSON（处理可能的 markdown 代码块）
    let cleanJson = jsonString.trim();
    const jsonMatch = cleanJson.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      cleanJson = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(cleanJson);
    return {
      summary: parsed.summary || '未知命令',
      parts: Array.isArray(parsed.parts) ? parsed.parts : [],
      variants: Array.isArray(parsed.variants) ? parsed.variants : undefined,
    };
  } catch {
    return {
      summary: jsonString.slice(0, 100),
      parts: [],
    };
  }
}
