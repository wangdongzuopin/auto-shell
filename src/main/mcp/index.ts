import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { mcpClient, MCPServer, MCPTool } from './client';

const MCP_CONFIG_DIR = path.join(os.homedir(), '.autoshell');
const MCP_CONFIG_PATH = path.join(MCP_CONFIG_DIR, 'mcp-config.json');

export interface MCPConfig {
  servers: MCPServer[];
}

export function getMCPConfig(): MCPConfig {
  if (!fs.existsSync(MCP_CONFIG_DIR)) {
    fs.mkdirSync(MCP_CONFIG_DIR, { recursive: true });
  }
  if (!fs.existsSync(MCP_CONFIG_PATH)) {
    return { servers: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(MCP_CONFIG_PATH, 'utf-8'));
  } catch {
    return { servers: [] };
  }
}

export function saveMCPConfig(config: MCPConfig): void {
  if (!fs.existsSync(MCP_CONFIG_DIR)) {
    fs.mkdirSync(MCP_CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(MCP_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

export async function initializeMCP(): Promise<Map<string, MCPTool[]>> {
  const config = getMCPConfig();
  const toolsMap = new Map<string, MCPTool[]>();

  for (const server of config.servers) {
    try {
      const tools = await mcpClient.connect(server);
      toolsMap.set(server.name, tools);
      console.log(`MCP server ${server.name} connected with ${tools.length} tools`);
    } catch (e) {
      console.error(`Failed to connect MCP server ${server.name}:`, e);
      toolsMap.set(server.name, []);
    }
  }

  return toolsMap;
}

export function getMCPClient() {
  return mcpClient;
}

export function getConnectedServers(): string[] {
  const config = getMCPConfig();
  return config.servers.filter((s) => mcpClient.isConnected(s.name)).map((s) => s.name);
}

export function getServerTools(serverName: string): MCPTool[] {
  return mcpClient.getTools(serverName);
}

export async function callMCPTool(serverName: string, toolName: string, args: Record<string, unknown>): Promise<unknown> {
  return mcpClient.callTool(serverName, toolName, args);
}

export function disconnectMCPServer(serverName: string): void {
  mcpClient.disconnect(serverName);
}
