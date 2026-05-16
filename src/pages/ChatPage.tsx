import { useState, useRef, useEffect, useCallback } from "react";
import { useAppStore } from "@/stores/appStore";
import { useProjectStore } from "@/stores/projectStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useSkillStore } from "@/stores/skillStore";
import { useDiffStore } from "@/stores/diffStore";
import { Button } from "@/components/ui/button";
import { MessageContent } from "@/components/chat/MessageContent";
import { DiffCard } from "@/components/chat/DiffCard";
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
  Copy,
  RotateCcw,
  Check,
  Clock,
  Bug,
  Search,
  Palette,
} from "lucide-react";

type ChatMode = "qa" | "edit";

const devSuggestions = [
  { text: "帮我分析这个项目的架构", icon: Code2 },
  { text: "解释一下这个函数的工作原理", icon: Zap },
  { text: "这个代码有什么问题？", icon: MessageSquare },
  { text: "添加新功能：用户登录", icon: PenSquare },
];

const toolLabels: Record<string, string> = {
  read_file: "读取文件",
  write_file: "写入文件",
  list_directory: "列出目录",
  search_code: "搜索代码",
  search_knowledge: "搜索知识库",
  get_knowledge: "获取知识",
  create_knowledge: "创建知识",
  list_skills: "查询技能",
};

function getSkillLabel(name: string): string {
  // Check if the name matches an enabled skill
  if (toolLabels[name]) return `调用工具：${toolLabels[name]}`;
  return `调用技能：${name}`;
}

function formatToolArgs(name: string, argumentsStr: string): string {
  try {
    const args = JSON.parse(argumentsStr);
    switch (name) {
      case "read_file":
      case "write_file":
        return args.path ? args.path : "";
      case "list_directory":
        return args.path ? args.path : "";
      case "search_code":
      case "search_knowledge":
        return args.query ? args.query : "";
      case "get_knowledge":
        return args.id ? args.id : "";
      case "create_knowledge":
        return args.title ? args.title : "";
      default: {
        const firstStr = Object.values(args).find((v) => typeof v === "string") as string | undefined;
        return firstStr ?? "";
      }
    }
  } catch {
    return "";
  }
}

function truncateResult(text: string, maxLen = 200): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "…";
}

const pmSuggestions = [
  { text: "帮我设计一个用户积分系统的产品原型", icon: Image },
  { text: "画出用户登录注册的完整流程图", icon: GitBranch },
  { text: "生成一个后台管理仪表盘原型", icon: PenSquare },
  { text: "画出电商下单的状态机流程图", icon: Zap },
];

function CompressionDivider({ summary, topics }: { summary: string; topics: string[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="py-2 animate-fade-in">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 group"
      >
        <div className="flex-1 h-px bg-border/30 group-hover:bg-border/50 transition-colors" />
        <div className="flex items-center gap-1.5 text-[10px] text-text-tertiary bg-bg-elevated/60 px-2.5 py-1 rounded-full border border-border/30 group-hover:border-border/50 group-hover:text-text-secondary transition-all">
          <Zap className="h-2.5 w-2.5 text-accent-dev/60" />
          {summary}
        </div>
        <div className="flex-1 h-px bg-border/30 group-hover:bg-border/50 transition-colors" />
      </button>
      {expanded && topics.length > 0 && (
        <div className="mt-2 mx-4 p-3 rounded-xl bg-bg-elevated/30 border border-border/20 text-[11px] text-text-tertiary space-y-1.5">
          <p className="text-[10px] font-medium text-text-secondary">已压缩的对话主题：</p>
          {topics.map((t, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-text-tertiary/50 mt-0.5">{i + 1}.</span>
              <span className="text-text-tertiary">{t}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
  const [toolCallBadges, setToolCallBadges] = useState<{id: string, name: string, status: "running"|"done", success?: boolean, args?: string, result?: string, expanded?: boolean}[]>([]);
  const [compressionData, setCompressionData] = useState<{ summary: string; topics: string[] } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const tokenBufferRef = useRef("");
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const toolCallArgsRef = useRef<Map<string, { name: string; arguments: string }>>(new Map());

  const isDev = role === "developer";
  const conversationDiffs = useDiffStore(
    (s) => currentConversationId ? s.diffs.filter((d) => d.conversationId === currentConversationId) : []
  );
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

  // Scroll to bottom when a new message is added (user send or AI response complete)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

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

  const handleSend = useCallback((overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if ((!text && attachedFiles.length === 0) || !currentConversationId || sending) return;
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

    const enabledSkills = useSkillStore.getState().skills.filter((s) => s.enabled);
    const systemPrompt = buildSystemPrompt(role, mode, enabledSkills) + projectContext;
    const conversationMessages = getMessages(currentConversationId);
    const chatMessages = [
      { role: "system" as const, content: systemPrompt },
      ...conversationMessages
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ];

    const abort = new AbortController();
    abortRef.current = abort;
    setStreamingContent("");
    setToolCallBadges([]);
    setCompressionData(null);
    toolCallArgsRef.current.clear();

    const { addDiff } = useDiffStore.getState();

    streamChat(
      chatMessages,
      config,
      {
        onToken: (_token) => {
          tokenBufferRef.current += _token;
          // Start a steady tick to leak clean tokens from buffer to display
          if (!tickRef.current) {
            tickRef.current = setInterval(() => {
              const buf = tokenBufferRef.current;
              if (!buf) return;
              const chunk = buf.slice(0, 3);
              tokenBufferRef.current = buf.slice(3);
              setStreamingContent((prev) => prev + chunk);
            }, 20);
          }
        },
        onDone: (fullText) => {
          // Stop the tick timer
          if (tickRef.current) {
            clearInterval(tickRef.current);
            tickRef.current = null;
          }
          // Flush remaining buffered tokens immediately
          if (tokenBufferRef.current) {
            const remaining = tokenBufferRef.current;
            tokenBufferRef.current = "";
            setStreamingContent((prev) => prev + remaining);
          }
          // Record skill usage from this response
          const skillRe = /<!--\s*skill:\s*(.+?)\s*-->/g;
          let sm: RegExpExecArray | null;
          while ((sm = skillRe.exec(fullText)) !== null) {
            useSkillStore.getState().recordUsage(sm[1].trim());
          }

          // Let the final render settle before adding to messages
          setTimeout(() => {
            addMessage(currentConversationId, "assistant", fullText);
            setStreamingContent("");
            setSending(false);
            abortRef.current = null;
          }, 80);
        },
        onError: (err) => {
          addMessage(currentConversationId, "assistant", `❌ ${err.message}`);
          setStreamingContent("");
          setSending(false);
          abortRef.current = null;
        },
        onToolCallStarted: (data) => {
          toolCallArgsRef.current.set(data.id, { name: data.name, arguments: data.arguments });
          setToolCallBadges((prev) => [...prev, { id: data.id, name: data.name, status: "running", args: formatToolArgs(data.name, data.arguments) }]);
        },
        onToolCallCompleted: (data) => {
          const stored = toolCallArgsRef.current.get(data.id);
          if (!stored) return;
          toolCallArgsRef.current.delete(data.id);

          setToolCallBadges((prev) => prev.map((b) =>
            b.id === data.id ? { ...b, status: "done", success: data.success, result: data.result } : b
          ));

          if (stored.name === "write_file" && data.success) {
            try {
              const args = JSON.parse(stored.arguments);
              const filePath = args.path || "";
              const content = args.content || "";
              if (filePath && content) {
                addDiff({
                  path: filePath,
                  content,
                  operation: "add",
                  conversationId: currentConversationId,
                });
              }
            } catch { /* ignore parse errors */ }
          }
        },
        onConversationCompressed: (data) => {
          setCompressionData({ summary: data.summary, topics: data.topics });
        },
      },
      abort.signal,
      isDev && mode === "edit",
      currentConversationId
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
      <div ref={scrollRef} className="relative flex-1 overflow-y-auto">
        <div className="px-5 py-4 space-y-4">
          {showWelcome && (
            <div className="animate-slide-up">
              {/* Greeting */}
              <div className="flex items-start gap-3 mb-6">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    isDev ? "bg-accent-dev/10 text-accent-dev" : "bg-accent-pm/10 text-accent-pm"
                  )}
                >
                  <Hammer className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{currentConversation.title}</p>
                  <p className="mt-1 text-[12px] text-text-secondary leading-relaxed">
                    你好！{isDev
                      ? "我可以帮你分析代码、回答问题，或在编辑模式下直接修改代码。"
                      : "我可以帮你设计产品原型、绘制流程图，加速你的产品设计。"}
                  </p>
                </div>
              </div>

              {/* Quick actions — role specific */}
              <div className="mb-6">
                <p className="text-[10px] font-medium text-text-tertiary mb-2.5 uppercase tracking-wider">快速开始</p>
                <div className="flex flex-wrap gap-2">
                  {isDev ? (
                    <>
                      <button onClick={() => setInput("请审查当前项目的代码，找出潜在的安全问题和代码质量问题")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] bg-accent-dev/5 border border-accent-dev/15 text-accent-dev hover:bg-accent-dev/10 transition-all">
                        <Search className="h-3 w-3" /> 代码审查
                      </button>
                      <button onClick={() => setInput("帮我分析这个项目的整体架构，画出架构图")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] bg-accent-dev/5 border border-accent-dev/15 text-accent-dev hover:bg-accent-dev/10 transition-all">
                        <GitBranch className="h-3 w-3" /> 架构分析
                      </button>
                      <button onClick={() => setInput("请帮我调试以下错误：")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] bg-accent-dev/5 border border-accent-dev/15 text-accent-dev hover:bg-accent-dev/10 transition-all">
                        <Bug className="h-3 w-3" /> 调试问题
                      </button>
                      <button onClick={() => setInput("为这个项目编写单元测试")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] bg-accent-dev/5 border border-accent-dev/15 text-accent-dev hover:bg-accent-dev/10 transition-all">
                        <Code2 className="h-3 w-3" /> 编写测试
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setInput("帮我设计一个用户注册登录的完整流程")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] bg-accent-pm/5 border border-accent-pm/15 text-accent-pm hover:bg-accent-pm/10 transition-all">
                        <GitBranch className="h-3 w-3" /> 流程设计
                      </button>
                      <button onClick={() => setInput("生成一个数据仪表盘的管理后台原型")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] bg-accent-pm/5 border border-accent-pm/15 text-accent-pm hover:bg-accent-pm/10 transition-all">
                        <Palette className="h-3 w-3" /> 原型设计
                      </button>
                      <button onClick={() => setInput("帮我写一份产品需求文档（PRD）")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] bg-accent-pm/5 border border-accent-pm/15 text-accent-pm hover:bg-accent-pm/10 transition-all">
                        <PenSquare className="h-3 w-3" /> 需求文档
                      </button>
                      <button onClick={() => setInput("帮我分析竞品的功能和用户体验")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] bg-accent-pm/5 border border-accent-pm/15 text-accent-pm hover:bg-accent-pm/10 transition-all">
                        <Search className="h-3 w-3" /> 竞品分析
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Recent conversations */}
              {(() => {
                const projectConvs = conversations
                  .filter((c) => c.projectId === currentProjectId && c.id !== currentConversationId)
                  .sort((a, b) => b.updatedAt - a.updatedAt)
                  .slice(0, 3);
                if (projectConvs.length === 0) return null;
                return (
                  <div className="mb-6">
                    <p className="text-[10px] font-medium text-text-tertiary mb-2.5 uppercase tracking-wider">最近对话</p>
                    <div className="space-y-1.5">
                      {projectConvs.map((conv) => (
                        <button
                          key={conv.id}
                          onClick={() => setCurrentConversation(conv.id)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-[11px] text-text-secondary hover:text-text-primary hover:bg-bg-elevated/50 border border-transparent hover:border-border/30 transition-all"
                        >
                          <Clock className="h-3 w-3 text-text-tertiary shrink-0" />
                          <span className="truncate">{conv.title}</span>
                          <span className="text-text-tertiary/50 text-[10px] shrink-0 ml-auto">
                            {new Date(conv.updatedAt).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Suggestions */}
              <div>
                <div className="flex items-center gap-2 mb-3 text-[10px] font-medium text-text-tertiary uppercase tracking-wider">
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

          {/* Compression divider — expandable */}
          {compressionData && (
            <CompressionDivider
              summary={compressionData.summary}
              topics={compressionData.topics}
            />
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
                  "group relative rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-sm select-text",
                  msg.role === "user"
                    ? "max-w-[70%] bg-primary text-primary-foreground rounded-tr-md"
                    : cn(
                        "flex-1 max-w-[80%] glass-card rounded-tl-md",
                        isDev
                          ? "border-accent-dev/5"
                          : "border-accent-pm/5"
                      )
                )}
              >
                {/* Hover action bar — assistant messages only */}
                {msg.role === "assistant" && (
                  <div className="absolute -top-2 right-3 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(msg.content);
                      }}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-bg-elevated border border-border/50 text-[10px] text-text-secondary hover:text-text-primary hover:border-border transition-all shadow-sm"
                      title="复制整条消息"
                    >
                      <Copy className="h-3 w-3" />
                      复制
                    </button>
                    {i > 0 && (() => {
                      const prev = messages.slice(0, i);
                      const prevUser = prev.filter((m) => m.role === "user").at(-1);
                      if (!prevUser) return null;
                      return (
                        <button
                          onClick={() => handleSend(prevUser.content)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-bg-elevated border border-border/50 text-[10px] text-text-secondary hover:text-text-primary hover:border-border transition-all shadow-sm"
                          title="重新生成回复"
                        >
                          <RotateCcw className="h-3 w-3" />
                          重新生成
                        </button>
                      );
                    })()}
                  </div>
                )}
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
                  <MessageContent content={streamingContent} isStreaming />
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

          {/* Diff cards for current conversation */}
          {conversationDiffs.length > 0 && (
            <div className="flex flex-col gap-2 px-1 mt-2">
              {conversationDiffs.map((d) => (
                <DiffCard key={d.id} diff={d} />
              ))}
            </div>
          )}

          {/* Tool call badges */}
          {toolCallBadges.length > 0 && (
            <div className="flex flex-col gap-1.5 px-1 mt-2">
              {toolCallBadges.map((badge) => {
                const skillLabel = getSkillLabel(badge.name);
                const isRunning = badge.status === "running";
                const isFailed = badge.success === false;
                const hasResult = badge.result && !isRunning;
                return (
                  <div key={badge.id}>
                    <div
                      className={cn(
                        "flex items-center gap-2 py-1.5 px-2.5 rounded-lg text-[11px] transition-all",
                        isRunning
                          ? "bg-accent-dev/5 border border-accent-dev/20 text-accent-dev"
                          : isFailed
                            ? "bg-danger/5 border border-danger/20 text-danger"
                            : "bg-success/5 border border-success/20 text-success"
                      )}
                    >
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full shrink-0",
                        isRunning ? "bg-accent-dev animate-pulse" : isFailed ? "bg-danger" : "bg-success"
                      )} />
                      <span className="text-text-secondary">{skillLabel}</span>
                      {badge.args && (
                        <span className="text-text-tertiary truncate max-w-[300px] font-mono text-[10px]">
                          {badge.args}
                        </span>
                      )}
                      {hasResult && (
                        <button
                          onClick={() => setToolCallBadges((prev) => prev.map((b) =>
                            b.id === badge.id ? { ...b, expanded: !b.expanded } : b
                          ))}
                          className="ml-auto shrink-0 text-[10px] text-text-tertiary hover:text-text-secondary transition-colors"
                        >
                          {badge.result ? `${badge.result.length} 字符` : ""}
                        </button>
                      )}
                    </div>
                    {badge.expanded && badge.result && (
                      <div className="mt-1 ml-4 p-2 rounded-lg bg-bg-elevated/40 border border-border/30 text-[10px] font-mono text-text-tertiary max-h-32 overflow-y-auto whitespace-pre-wrap select-text">
                        {truncateResult(badge.result)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

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
                  if (tickRef.current) {
                    clearInterval(tickRef.current);
                    tickRef.current = null;
                  }
                  // Flush remaining buffered tokens before clearing
                  if (tokenBufferRef.current) {
                    const remaining = tokenBufferRef.current;
                    tokenBufferRef.current = "";
                    setStreamingContent((prev) => prev + remaining);
                  }
                  // Use a microtask to capture the flushed streamingContent
                  setTimeout(() => {
                    setStreamingContent((current) => {
                      if (current) {
                        addMessage(currentConversationId!, "assistant", current + "\n\n*[已中断]*");
                      }
                      return "";
                    });
                    setToolCallBadges([]);
                    setSending(false);
                    abortRef.current = null;
                  }, 50);
                }}
                size="icon"
                variant="outline"
                className="h-9 w-9 shrink-0 rounded-xl border-danger/30 text-danger hover:bg-danger/10 transition-all duration-200"
                title="停止生成"
              >
                <Square className="h-3 w-3" />
              </Button>
            ) : (
              <Button
                onClick={() => handleSend()}
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
