import { useState, useRef, useEffect, useCallback } from "react";
import { useAppStore } from "@/stores/appStore";
import { useProjectStore } from "@/stores/projectStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { Button } from "@/components/ui/button";
import { MessageContent } from "@/components/chat/MessageContent";
import { cn } from "@/lib/utils";
import { streamChat, buildSystemPrompt } from "@/services/ai";
import { fileIpc } from "@/lib/ipc";
import { exportConversationToMarkdown, exportConversationToHTML } from "@/lib/export";
import {
  Send,
  MessageSquare,
  Code2,
  PenSquare,
  Sparkles,
  Zap,
  Hammer,
  Bot,
  User,
  Image,
  GitBranch,
  Square,
  Download,
  Paperclip,
  X,
} from "lucide-react";

type ChatMode = "qa" | "edit";

const devSuggestions = [
  { text: "帮我分析这个项目的架构", icon: Code2 },
  { text: "解释一下这个函数的工作原理", icon: Zap },
  { text: "这个代码有什么问题？", icon: MessageSquare },
  { text: "添加新功能：用户登录", icon: PenSquare },
];

const pmSuggestions = [
  { text: "帮我设计一个用户积分系统的产品原型", icon: Image },
  { text: "画出用户登录注册的完整流程图", icon: GitBranch },
  { text: "生成一个后台管理仪表盘原型", icon: PenSquare },
  { text: "画出电商下单的状态机流程图", icon: Zap },
];

export function ChatPage() {
  const { role } = useAppStore();
  const {
    projects,
    conversations,
    currentProjectId,
    currentConversationId,
    addConversation,
    addMessage,
    getMessages,
    loadMessages,
    setCurrentConversation,
  } = useProjectStore();

  const [mode, setMode] = useState<ChatMode>("qa");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; content: string; type: string; size: number }[]>([]);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [projectContext, setProjectContext] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const isDev = role === "developer";
  const suggestions = isDev ? devSuggestions : pmSuggestions;

  const currentProject = projects.find((p) => p.id === currentProjectId);
  const currentConversation = conversations.find(
    (c) => c.id === currentConversationId
  );
  const messages = currentConversationId
    ? getMessages(currentConversationId)
    : [];

  // Load messages from backend when conversation changes
  useEffect(() => {
    if (currentConversationId) {
      loadMessages(currentConversationId);
    }
  }, [currentConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Load project directory context when current project changes
  useEffect(() => {
    if (currentProject?.path) {
      fileIpc.listDir(currentProject.path).then((listing) => {
        const files = listing.entries
          .filter((e) => !e.name.startsWith(".") && !["node_modules", "target", "dist", ".git"].includes(e.name))
          .map((e) => `${e.is_dir ? "📁" : "📄"} ${e.name}`)
          .join("\n");
        setProjectContext(
          `\n\n当前项目: ${currentProject.name}\n项目路径: ${currentProject.path}\n项目结构:\n${files || "(空目录)"}`
        );
      }).catch(() => setProjectContext(""));
    } else {
      setProjectContext("");
    }
  }, [currentProject?.id, currentProject?.path]);

  const handleSend = useCallback(() => {
    if ((!input.trim() && attachedFiles.length === 0) || !currentConversationId || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    // Build message with attachments
    let messageContent = text;
    if (attachedFiles.length > 0) {
      const fileSection = attachedFiles.map((f) => {
        if (f.type.startsWith("image/")) {
          return `\n![${f.name}](${f.content.slice(0, 100)}...) [图片: ${f.name}]`;
        }
        return `\n\`\`\`${f.name.split(".").pop() || "text"}\n${f.content}\n\`\`\``;
      }).join("");
      messageContent = text ? text + "\n" + fileSection : fileSection;
    }
    setAttachedFiles([]);

    // Add user message to store
    addMessage(currentConversationId, "user", messageContent);

    const config = useSettingsStore.getState().getAIConfig();
    if (!config.apiKey) {
      addMessage(currentConversationId, "assistant", "请先在设置中配置 AI API Key。点击左下角「设置」按钮进行配置。");
      setSending(false);
      return;
    }

    const systemPrompt = buildSystemPrompt(role, mode) + projectContext;
    const conversationMessages = getMessages(currentConversationId);
    const chatMessages = [
      { role: "system" as const, content: systemPrompt },
      ...conversationMessages
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ];

    const abort = new AbortController();
    abortRef.current = abort;
    setStreamingContent("");

    streamChat(
      chatMessages,
      config,
      {
        onToken: (_token) => {
          setStreamingContent((prev) => {
            const raw = prev + _token;
            // Strip think tags so they don't leak during streaming
            // Remove closed think blocks, and hide unclosed ones
            return raw.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, "");
          });
        },
        onDone: (fullText) => {
          addMessage(currentConversationId, "assistant", fullText);
          setStreamingContent("");
          setSending(false);
          abortRef.current = null;
        },
        onError: (err) => {
          addMessage(currentConversationId, "assistant", `❌ ${err.message}`);
          setStreamingContent("");
          setSending(false);
          abortRef.current = null;
        },
      },
      abort.signal
    );
  }, [input, currentConversationId, sending, role, mode, getMessages, addMessage, attachedFiles]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const validTypes = [
      "image/", "text/", "application/pdf",
      "application/json", "application/xml", "application/yaml",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel", "application/vnd.ms-powerpoint",
      "application/x-msdownload" // .exe etc. for binary detection
    ];
    const maxSize = 10 * 1024 * 1024; // 10MB

    for (const file of Array.from(files)) {
      if (file.size > maxSize) {
        alert(`文件 ${file.name} 超过 10MB 限制`);
        continue;
      }

      const isText = file.type.startsWith("text/") ||
        file.type === "application/json" ||
        file.type === "application/xml" ||
        file.type === "application/yaml" ||
        file.name.match(/\.(txt|csv|json|xml|yaml|yml|md|log|js|ts|jsx|tsx|py|java|go|rs|c|cpp|h|hpp|css|html|vue|svelte|sql|sh|bash|zsh|yaml|toml|ini|cfg|env|gitignore|dockerfile|makefile)$/i);

      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => {
          setAttachedFiles((prev) => [...prev, {
            name: file.name,
            content: reader.result as string,
            type: file.type,
            size: file.size,
          }]);
        };
        reader.readAsDataURL(file);
      } else if (isText) {
        const reader = new FileReader();
        reader.onload = () => {
          setAttachedFiles((prev) => [...prev, {
            name: file.name,
            content: reader.result as string,
            type: file.type || "text/plain",
            size: file.size,
          }]);
        };
        reader.readAsText(file);
      } else {
        // Binary files — just attach metadata
        setAttachedFiles((prev) => [...prev, {
          name: file.name,
          content: `[二进制文件: ${file.name}, 类型: ${file.type || "未知"}, 大小: ${(file.size / 1024).toFixed(1)}KB]`,
          type: file.type || "application/octet-stream",
          size: file.size,
        }]);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleExportMarkdown = () => {
    if (messages.length === 0) return;
    exportConversationToMarkdown(messages, currentConversation?.title || "对话");
    setShowExportMenu(false);
  };

  const handleExportHTML = () => {
    if (messages.length === 0) return;
    exportConversationToHTML(messages, currentConversation?.title || "对话");
    setShowExportMenu(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewConversation = async () => {
    if (currentProjectId) {
      const id = await addConversation(currentProjectId);
      setCurrentConversation(id);
    } else if (projects.length > 0) {
      useProjectStore.getState().setCurrentProject(projects[0].id);
      const id = await addConversation(projects[0].id);
      setCurrentConversation(id);
    }
  };

  // --- Empty state: no project ---
  if (!currentProject) {
    return (
      <div className="relative flex h-full flex-col items-center justify-center p-8">
        <div className={cn("absolute inset-0", isDev ? "bg-glow" : "bg-glow-pm")} />
        <div className="relative flex flex-col items-center gap-5 text-center animate-slide-up">
          <div
            className={cn(
              "flex h-20 w-20 items-center justify-center rounded-2xl shadow-lg",
              isDev
                ? "bg-accent-dev/10 text-accent-dev glow-dev"
                : "bg-accent-pm/10 text-accent-pm glow-pm"
            )}
          >
            <Hammer className="h-10 w-10" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-text-primary font-display tracking-tight">
              pizz
            </h2>
            <p className="mt-2 text-sm text-text-secondary max-w-md leading-relaxed">
              你的个人 AI 开发工作站。导入项目，开始对话，让 AI 帮你写代码、做设计。
            </p>
          </div>
          <Button
            variant="default"
            size="sm"
            className="mt-1 gap-2"
            onClick={() => {
              useProjectStore.getState().addProject("演示项目", "D:/demo-project");
            }}
          >
            <Hammer className="h-4 w-4" />
            创建第一个项目
          </Button>
        </div>
      </div>
    );
  }

  // --- No conversation selected ---
  if (!currentConversation) {
    return (
      <div className="relative flex h-full flex-col items-center justify-center p-8">
        <div className={cn("absolute inset-0", isDev ? "bg-glow" : "bg-glow-pm")} />
        <div className="relative flex flex-col items-center gap-4 text-center animate-slide-up">
          <div
            className={cn(
              "flex h-16 w-16 items-center justify-center rounded-2xl",
              isDev ? "bg-accent-dev/10 text-accent-dev" : "bg-accent-pm/10 text-accent-pm"
            )}
          >
            <Hammer className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">{currentProject.name}</h2>
            <p className="mt-1 text-sm text-text-secondary">
              选择一个已有对话，或新建一个对话开始
            </p>
          </div>
          <Button variant="default" size="sm" className="mt-1 gap-2" onClick={handleNewConversation}>
            <MessageSquare className="h-4 w-4" />
            新建对话
          </Button>
        </div>
      </div>
    );
  }

  const showWelcome = messages.length === 0;

  return (
    <div className="relative flex h-full flex-col">
      {/* Glow background */}
      <div className={cn("absolute inset-0 pointer-events-none", isDev ? "bg-glow" : "bg-glow-pm")} />

      {/* Top bar */}
      <div className="relative flex items-center justify-between px-5 py-2.5 border-b border-border/50">
        <div className="flex items-center gap-1.5 min-w-0 text-[11px]">
          <span className="text-text-tertiary truncate max-w-[140px]">{currentProject.name}</span>
          <span className="text-text-tertiary/50 text-[10px]">/</span>
          <span className="text-text-primary font-medium truncate">{currentConversation.title}</span>
        </div>

        {/* Mode toggle — developer only */}
        <div className="flex items-center gap-2">
          {isDev ? (
            <div className="flex items-center gap-1 bg-bg-elevated/80 rounded-lg p-0.5 border border-border/50">
              <button
                onClick={() => setMode("qa")}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-200",
                  mode === "qa"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                <MessageSquare className="h-3 w-3" />
                问答
              </button>
              <button
                onClick={() => setMode("edit")}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-200",
                  mode === "edit"
                    ? "bg-accent-dev text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                <Code2 className="h-3 w-3" />
                编辑
              </button>
            </div>
          ) : (
            <span className="text-[10px] font-medium text-accent-pm bg-accent-pm/10 px-2 py-1 rounded-md">
              产品设计
            </span>
          )}

        {/* Export button */}
        {role === "product" && (
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={messages.length === 0}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all",
                messages.length === 0
                  ? "text-text-tertiary/50 cursor-not-allowed"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-hover/40"
              )}
            >
              <Download className="h-3 w-3" />
              导出
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 w-40 rounded-xl border border-border bg-glass-bg-strong shadow-xl p-1 animate-scale-in backdrop-blur-xl">
                  <button
                    onClick={handleExportMarkdown}
                    className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-[11px] text-text-secondary hover:text-text-primary hover:bg-bg-hover/40 transition-all"
                  >
                    <Download className="h-3 w-3" />
                    导出 Markdown
                  </button>
                  <button
                    onClick={handleExportHTML}
                    className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-[11px] text-text-secondary hover:text-text-primary hover:bg-bg-hover/40 transition-all"
                  >
                    <Download className="h-3 w-3" />
                    导出 HTML 报告
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Messages */}
      <div className="relative flex-1 overflow-y-auto">
        <div className="px-5 py-4 space-y-4">
          {showWelcome && (
            <div className="animate-slide-up">
              {/* Greeting */}
              <div className="flex items-start gap-3 mb-8">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                    isDev ? "bg-accent-dev/10 text-accent-dev" : "bg-accent-pm/10 text-accent-pm"
                  )}
                >
                  <Hammer className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-text-primary">{currentConversation.title}</p>
                  <p className="mt-1.5 text-[13px] text-text-secondary leading-relaxed">
                    你好！{isDev
                      ? "我可以帮你分析代码、回答问题，或在编辑模式下直接修改代码。"
                      : "我可以帮你设计产品原型、绘制流程图，加速你的产品设计。"}
                  </p>
                </div>
              </div>

              {/* Suggestions */}
              <div className="mb-2">
                <div className="flex items-center gap-2 mb-3 text-xs text-text-tertiary">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>试试这样问我</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {suggestions.map((s, i) => {
                    const Icon = s.icon;
                    return (
                      <button
                        key={i}
                        onClick={() => setInput(s.text)}
                        className={cn(
                          "group flex items-start gap-3 p-3 rounded-xl border text-left text-xs transition-all duration-200",
                          "border-border/50 hover:border-accent-dev/20",
                          "bg-bg-elevated/30 hover:bg-bg-elevated/60",
                          "hover:shadow-sm"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-3.5 w-3.5 mt-0.5 shrink-0 transition-colors duration-200",
                            isDev
                              ? "text-accent-dev/50 group-hover:text-accent-dev"
                              : "text-accent-pm/50 group-hover:text-accent-pm"
                          )}
                        />
                        <span className="text-text-secondary group-hover:text-text-primary leading-relaxed transition-colors">
                          {s.text}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={msg.id}
              className={cn(
                "flex items-start gap-3 animate-slide-up",
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              )}
              style={{ animationDelay: `${Math.min(i * 60, 300)}ms` }}
            >
              {/* Avatar */}
              <div
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg",
                  msg.role === "user"
                    ? "bg-bg-elevated border border-border/50 text-text-secondary"
                    : isDev
                      ? "bg-accent-dev/10 text-accent-dev"
                      : "bg-accent-pm/10 text-accent-pm"
                )}
              >
                {msg.role === "user" ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
              </div>

              {/* Bubble */}
              <div
                className={cn(
                  "rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-sm select-text",
                  msg.role === "user"
                    ? "max-w-[70%] bg-primary text-primary-foreground rounded-tr-md"
                    : cn(
                        "flex-1 max-w-[90%] glass-card rounded-tl-md",
                        isDev
                          ? "border-accent-dev/5"
                          : "border-accent-pm/5"
                      )
                )}
              >
                <MessageContent content={msg.content} />
                <p
                  className={cn(
                    "mt-1 text-[9px] opacity-40",
                    msg.role === "user" ? "text-right" : "text-left"
                  )}
                >
                  {new Date(msg.timestamp).toLocaleTimeString("zh-CN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}

          {/* Streaming / typing indicator */}
          {sending && (
            <div className="flex items-start gap-3 animate-fade-in">
              <div className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-lg", isDev ? "bg-accent-dev/10 text-accent-dev" : "bg-accent-pm/10 text-accent-pm")}>
                <Bot className="h-3 w-3" />
              </div>
              {streamingContent ? (
                <div className={cn("flex-1 max-w-[90%] rounded-2xl rounded-tl-md px-3 py-2 text-xs leading-relaxed shadow-sm glass-card select-text", isDev ? "border-accent-dev/5" : "border-accent-pm/5")}>
                  <MessageContent content={streamingContent} />
                </div>
              ) : (
                <div className="glass-card rounded-tl-md rounded-2xl px-3.5 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="relative px-5 py-3 border-t border-border/50">
        {/* Attached files preview */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {attachedFiles.map((file, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-bg-elevated/60 border border-border/30 text-[11px] text-text-secondary"
              >
                <Paperclip className="h-3 w-3 text-text-tertiary" />
                <span className="max-w-[120px] truncate">{file.name}</span>
                <span className="text-text-tertiary/50">
                  {file.size > 1024 ? `${(file.size / 1024).toFixed(0)}KB` : `${file.size}B`}
                </span>
                <button
                  onClick={() => removeAttachment(i)}
                  className="p-0.5 rounded text-text-tertiary hover:text-danger transition-colors"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div>
          <div className="relative flex items-center gap-2.5">
            <div className="relative flex-1">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isDev
                    ? mode === "qa"
                      ? "输入问题，按 Enter 发送..."
                      : "描述你想修改的代码..."
                    : "描述你想设计的功能..."
                }
                rows={1}
                className={cn(
                  "w-full resize-none rounded-xl border bg-bg-elevated/60 px-3.5 py-2.5 pr-12",
                  "text-[13px] text-text-primary placeholder:text-text-tertiary",
                  isDev
                    ? "border-border/50 focus:border-accent-dev/30 focus:outline-none focus:ring-2 focus:ring-accent-dev/10"
                    : "border-border/50 focus:border-accent-pm/30 focus:outline-none focus:ring-2 focus:ring-accent-pm/10",
                  "transition-all duration-200"
                )}
              />
              {mode === "edit" && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-medium text-accent-dev bg-accent-dev/10 px-1.5 py-0.5 rounded-md">
                  EDIT
                </span>
              )}
            </div>
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
              accept="image/*,text/*,.pdf,.json,.xml,.yaml,.yml,.csv,.md,.log,.js,.ts,.jsx,.tsx,.py,.java,.go,.rs,.c,.cpp,.h,.hpp,.css,.html,.vue,.svelte,.sql,.sh,.bash,.toml,.ini,.cfg,.env,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            />
            {/* Paperclip upload button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="h-9 w-9 shrink-0 rounded-xl border border-border/50 text-text-tertiary hover:text-text-primary hover:bg-bg-hover/40 transition-all flex items-center justify-center"
              title="上传文件"
            >
              <Paperclip className="h-3.5 w-3.5" />
            </button>
            {sending ? (
              <Button
                onClick={() => {
                  abortRef.current?.abort();
                  setSending(false);
                  if (streamingContent) {
                    addMessage(currentConversationId!, "assistant", streamingContent);
                    setStreamingContent("");
                  }
                }}
                size="icon"
                variant="outline"
                className="h-9 w-9 shrink-0 rounded-xl border-danger/30 text-danger hover:bg-danger/10 transition-all duration-200"
              >
                <Square className="h-3 w-3" />
              </Button>
            ) : (
              <Button
                onClick={handleSend}
                disabled={!input.trim()}
                size="icon"
                className={cn(
                  "h-9 w-9 shrink-0 rounded-xl transition-all duration-200",
                  !input.trim() && "opacity-50"
                )}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <p className="mt-2 text-[10px] text-text-tertiary text-center">
            Enter 发送 · Shift+Enter 换行
          </p>
        </div>
      </div>
    </div>
  );
}
