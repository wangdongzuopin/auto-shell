import { spawn, ChildProcess } from 'child_process';

export interface MCPServer {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: object;
}

export interface MCPClient {
  connect(server: MCPServer): Promise<MCPTool[]>;
  callTool(serverName: string, toolName: string, args: Record<string, unknown>): Promise<unknown>;
  disconnect(serverName: string): void;
  getTools(serverName: string): MCPTool[];
  isConnected(serverName: string): boolean;
}

interface ConnectedServer {
  process: ChildProcess;
  tools: MCPTool[];
  requestId: number;
}

export class MCPClientImpl implements MCPClient {
  private servers: Map<string, ConnectedServer> = new Map();

  async connect(server: MCPServer): Promise<MCPTool[]> {
    if (this.servers.has(server.name)) {
      return this.servers.get(server.name)!.tools;
    }

    return new Promise((resolve, reject) => {
      const proc = spawn(server.command, server.args, {
        env: { ...process.env, ...server.env },
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false,
      });

      const connectedServer: ConnectedServer = {
        process: proc,
        tools: [],
        requestId: 1,
      };

      let stdoutBuffer = '';

      proc.stdout?.on('data', (data: Buffer) => {
        stdoutBuffer += data.toString();
        const lines = stdoutBuffer.split('\n');
        stdoutBuffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            this.handleMessage(server.name, msg, connectedServer);
          } catch {
            // Skip non-JSON output
          }
        }
      });

      proc.stderr?.on('data', (data: Buffer) => {
        console.error(`MCP ${server.name} stderr:`, data.toString());
      });

      proc.on('error', (err) => {
        console.error(`MCP ${server.name} error:`, err);
        this.servers.delete(server.name);
        reject(err);
      });

      proc.on('exit', (code) => {
        console.log(`MCP ${server.name} exited with code ${code}`);
        this.servers.delete(server.name);
      });

      this.servers.set(server.name, connectedServer);

      // Send initialize request
      const initRequest = {
        jsonrpc: '2.0',
        id: 0,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'auto-shell',
            version: '1.0.0',
          },
        },
      };

      proc.stdin?.write(JSON.stringify(initRequest) + '\n');

      // Send initialized notification
      setTimeout(() => {
        proc.stdin?.write(JSON.stringify({
          jsonrpc: '2.0',
          method: 'notifications/initialized',
        }) + '\n');
      }, 100);

      // Wait for tools response
      setTimeout(() => {
        if (connectedServer.tools.length > 0) {
          resolve(connectedServer.tools);
        } else {
          // If no tools received, return empty array (server may not have tools)
          resolve([]);
        }
      }, 2000);
    });
  }

  private handleMessage(serverName: string, msg: Record<string, unknown>, server: ConnectedServer): void {
    // Handle responses
    if (msg.id !== undefined) {
      // This is a response to a request
      if (msg.result && typeof msg.result === 'object' && 'tools' in (msg.result as Record<string, unknown>)) {
        const result = msg.result as { tools?: MCPTool[] };
        if (result.tools) {
          server.tools = result.tools;
        }
      }
    }

    // Handle tool list updates
    if (msg.method === 'tools/list') {
      // Tool list changed notification
    }
  }

  async callTool(serverName: string, toolName: string, args: Record<string, unknown>): Promise<unknown> {
    const server = this.servers.get(serverName);
    if (!server) {
      throw new Error(`MCP server ${serverName} not connected`);
    }

    return new Promise((resolve, reject) => {
      const requestId = server.requestId++;
      const request = {
        jsonrpc: '2.0',
        id: requestId,
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args,
        },
      };

      const proc = server.process;
      let stdoutBuffer = '';

      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`MCP tool ${toolName} timed out`));
      }, 30000);

      const cleanup = () => {
        proc.stdout?.removeListener('data', onData);
      };

      const onData = (data: Buffer) => {
        stdoutBuffer += data.toString();
        const lines = stdoutBuffer.split('\n');
        stdoutBuffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.id === requestId && msg.result) {
              clearTimeout(timeout);
              cleanup();
              resolve(msg.result);
            }
            if (msg.id === requestId && msg.error) {
              clearTimeout(timeout);
              cleanup();
              reject(new Error(msg.error.message || 'Tool call failed'));
            }
          } catch {
            // Skip non-JSON
          }
        }
      };

      proc.stdout?.on('data', onData);

      proc.stdin?.write(JSON.stringify(request) + '\n');
    });
  }

  disconnect(serverName: string): void {
    const server = this.servers.get(serverName);
    if (server) {
      server.process.kill();
      this.servers.delete(serverName);
    }
  }

  getTools(serverName: string): MCPTool[] {
    return this.servers.get(serverName)?.tools || [];
  }

  isConnected(serverName: string): boolean {
    return this.servers.has(serverName);
  }
}

// Singleton instance
export const mcpClient = new MCPClientImpl();
