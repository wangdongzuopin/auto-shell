import type { Tool } from './Tool';

/**
 * 工具注册中心
 * 负责工具的注册、查找和管理
 */
export class ToolRegistry {
  private tools = new Map<string, Tool>();

  /**
   * 注册工具实例
   */
  registerTool(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      console.warn(`Tool "${tool.name}" is already registered, overwriting`);
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * 注销工具
   */
  unregisterTool(name: string): boolean {
    const tool = this.tools.get(name);
    if (!tool) {
      return false;
    }
    this.tools.delete(name);
    return true;
  }

  /**
   * 获取工具
   */
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * 获取所有工具
   */
  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * 获取工具数量
   */
  getToolCount(): number {
    return this.tools.size;
  }

  /**
   * 检查工具是否存在
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * 清除所有工具
   */
  clear(): void {
    this.tools.clear();
  }

  /**
   * 获取所有工具名称
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }
}

// 全局工具注册中心单例
export const globalToolRegistry = new ToolRegistry();
