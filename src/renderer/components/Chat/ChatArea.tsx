import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronsDown } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import { useSkillStore } from '../../stores/skillStore';
import type { Message } from '../../../shared/types';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { QuickActions } from './QuickActions';
import { buildSystemPrompt } from '../../../ai/prompts';
import './Chat.css';

export const ChatArea: React.FC = () => {
  const { threadId } = useParams<{ threadId: string }>();
  const currentThread = useChatStore((state) => state.currentThread);
  const setCurrentThread = useChatStore((state) => state.setCurrentThread);
  const addMessage = useChatStore((state) => state.addMessage);
  const updateMessage = useChatStore((state) => state.updateMessage);
  const setLoading = useChatStore((state) => state.setLoading);
  const isLoading = useChatStore((state) => state.isLoading);
  const skills = useSkillStore((state) => state.skills);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  useEffect(() => {
    if (threadId) {
      setCurrentThread(threadId);
    }
  }, [threadId, setCurrentThread]);

  // Auto-scroll to bottom when new messages arrive (only if already at bottom)
  useEffect(() => {
    if (messagesEndRef.current && !showScrollButton) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentThread?.messages, showScrollButton]);

  // Handle scroll to show/hide scroll button
  const handleScroll = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setShowScrollButton(!isAtBottom);
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollButton(false);
  }, []);

  const handleStop = useCallback(() => {
    setLoading(false);
  }, [setLoading]);

  const handleSend = useCallback(async (content: string, selectedSkillId?: string) => {
    if (!currentThread || isLoading) return;

    // If skill is selected, prepend skill name to content
    let finalContent = content;
    if (selectedSkillId) {
      const selectedSkill = skills.find(s => s.id === selectedSkillId);
      if (selectedSkill) {
        finalContent = `[Skill: ${selectedSkill.name}] ${content}`;
      }
    }

    const userMessage: Message = {
      id: Math.random().toString(36).substring(2, 15),
      role: 'user',
      content: finalContent,
      timestamp: Date.now(),
    };

    // Add user message
    addMessage(currentThread.id, userMessage);
    setLoading(true);

    // Create assistant message placeholder
    const assistantMessageId = Math.random().toString(36).substring(2, 15);
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };
    addMessage(currentThread.id, assistantMessage);

    // Prepare messages for API (including the new user message)
    const allMessages = [...currentThread.messages, userMessage];
    const apiMessages = allMessages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Add system prompt with skills at the beginning
    const systemPrompt = buildSystemPrompt(skills);
    apiMessages.unshift({ role: 'system' as const, content: systemPrompt });

    // Tool call regex pattern: [TOOL: tool_name: arg]
    const toolCallRegex = /\[TOOL:\s*(\w+):\s*([^\]]+)\]/g;

    // Execute tool call based on tool name
    const executeToolCall = async (toolName: string, arg: string): Promise<string> => {
      switch (toolName) {
        case 'open_browser':
          if (window.api?.openUrl) {
            const result = await window.api.openUrl(arg.trim());
            if (result.success) {
              return `正在打开浏览器: ${arg.trim()}`;
            } else {
              return `打开浏览器失败: ${result.error}`;
            }
          }
          return `浏览器打开功能暂不可用`;
        case 'read':
          if (window.api?.readFile) {
            const result = await window.api.readFile(arg.trim());
            if (result.success) {
              return `文件内容:\n\`\`\`\n${result.content}\n\`\`\``;
            } else {
              return `读取文件失败: ${result.error}`;
            }
          }
          return `文件读取功能暂不可用`;
        case 'write': {
          // Format: [TOOL: write: filepath::content]
          const [filepath, ...contentParts] = arg.split('::');
          if (window.api?.writeFile) {
            const result = await window.api.writeFile(filepath.trim(), contentParts.join('::'));
            if (result.success) {
              return `文件已写入: ${filepath.trim()}`;
            } else {
              return `写入文件失败: ${result.error}`;
            }
          }
          return `文件写入功能暂不可用`;
        }
        case 'bash': {
          if (window.api?.bashCommand) {
            const result = await window.api.bashCommand(arg.trim());
            if (result.exitCode === 0) {
              return `命令执行结果:\n\`\`\`\n${result.output}\n\`\`\``;
            } else {
              return `命令执行失败:\n\`\`\`\n${result.output}\n\`\`\``;
            }
          }
          return `命令执行功能暂不可用`;
        }
        default:
          return `[未知工具: ${toolName}]`;
      }
    };

    // Process tool calls in content and execute them
    const processToolCalls = async (text: string): Promise<string> => {
      let result = text;

      // Handle [TOOL: tool_name: arg] format
      const toolCallRegex = /\[TOOL:\s*(\w+):\s*([^\]]+)\]/g;
      let match;

      while ((match = toolCallRegex.exec(result)) !== null) {
        const fullMatch = match[0];
        const toolName = match[1];
        const toolArg = match[2];

        // Execute tool and replace with result
        const toolResult = await executeToolCall(toolName, toolArg);
        result = result.replace(fullMatch, `\n${toolResult}\n`);
      }

      // Handle [TOOL_CALL] format with JSON inside
      const toolCallBlockRegex = /\[TOOL_CALL\]\s*\{[\s\S]*?\}\s*\[\/TOOL_CALL\]/g;
      const toolCallBlockMatches = [...result.matchAll(toolCallBlockRegex)];

      for (const blockMatch of toolCallBlockMatches) {
        const fullBlock = blockMatch[0];
        // Extract JSON from the block
        const jsonMatch = fullBlock.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          try {
            const toolCall = JSON.parse(jsonMatch[0]);
            if (toolCall.tool === 'Bash' && toolCall.args && toolCall.args.command) {
              // Check if it's a browser opening command
              const cmd = toolCall.args.command;
              const urlMatch = cmd.match(/(?:open|xdg-open|start)\s+(https?:\/\/[^\s]+)/);
              if (urlMatch) {
                const url = urlMatch[1];
                const toolResult = await executeToolCall('open_browser', url);
                result = result.replace(fullBlock, `\n${toolResult}\n`);
              } else {
                // Execute as regular bash command
                const toolResult = await executeToolCall('bash', toolCall.args.command);
                result = result.replace(fullBlock, `\n${toolResult}\n`);
              }
            }
          } catch {
            // Skip if JSON parsing fails
          }
        }
      }

      return result;
    };

    try {
      // Try streaming API
      let accumulatedContent = '';
      const pendingToolCalls: Map<string, { resolve: (v: string) => void; promise: Promise<string> }> = new Map();

      const stopFn = window.api?.streamChatWithAI(
        assistantMessageId,
        apiMessages,
        {
          onChunk: (chunk: string) => {
            accumulatedContent += chunk;
            updateMessage(currentThread.id, assistantMessageId, { content: accumulatedContent });
          },
          onDone: async () => {
            // Process any remaining tool calls after streaming is complete
            try {
              const processedContent = await processToolCalls(accumulatedContent);
              updateMessage(currentThread.id, assistantMessageId, { content: processedContent });
            } catch (e) {
              console.error('Error processing tool calls:', e);
            }
            setLoading(false);
          },
          onError: (error: string) => {
            updateMessage(currentThread.id, assistantMessageId, {
              content: `错误: ${error}`,
            });
            setLoading(false);
          },
        }
      );

      // If stopFn exists, it can be used to cancel the stream
      if (stopFn) {
        // Store for potential later use
      }
    } catch (error) {
      updateMessage(currentThread.id, assistantMessageId, {
        content: `错误: ${error instanceof Error ? error.message : '未知错误'}`,
      });
      setLoading(false);
    }
  }, [currentThread, isLoading, addMessage, updateMessage, setLoading]);

  if (!currentThread) {
    return (
      <div className="chat-area chat-empty">
        <div className="empty-state">
          <h2>你好，jelly</h2>
          <p>有什么可以帮助你的吗？</p>
          <QuickActions />
        </div>
      </div>
    );
  }

  return (
    <div className="chat-area">
      <div className="chat-messages" ref={messagesContainerRef} onScroll={handleScroll}>
        {currentThread.messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      {showScrollButton && (
        <button className="scroll-to-bottom" onClick={scrollToBottom} title="滚动到底部">
          <ChevronsDown size={20} />
        </button>
      )}
      <ChatInput onSend={handleSend} onStop={handleStop} isLoading={isLoading} />
    </div>
  );
};
