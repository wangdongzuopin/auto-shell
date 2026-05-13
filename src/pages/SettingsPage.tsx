import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/stores/appStore";
import { useSettingsStore, type AIProvider } from "@/stores/settingsStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KnowledgePanel } from "@/components/knowledge/KnowledgePanel";
import { SkillsPanel } from "@/components/skills/SkillsPanel";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Database,
  BookOpen,
  Cpu,
  Settings2,
  Plug,
  Plus,
  Play,
  Square,
  Trash2,
  Loader2,
} from "lucide-react";
import { useMcpStore } from "@/stores/mcpStore";
import type { McpServerConfig } from "@/types/commands";

type SettingsTab = "ai" | "general" | "knowledge" | "skills" | "mcp";

export function SettingsPage() {
  const { t } = useTranslation();
  const { role, setMainView } = useAppStore();
  const { settings, saveAIConfig, setLanguage } = useSettingsStore();
  const [tab, setTab] = useState<SettingsTab>("ai");
  const [showKey, setShowKey] = useState(false);

  const [draft, setDraft] = useState(settings.ai);
  const [saved, setSaved] = useState(true);

  // MCP state
  const { servers, addServer, removeServer, startServer, stopServer, loadServers } = useMcpStore();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [mcpForm, setMcpForm] = useState({ name: "", command: "", args: "" });

  const ai = draft;
  const isDev = role === "developer";

  const updateDraft = (partial: Partial<typeof draft>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
    setSaved(false);
  };

  const handleSave = () => {
    saveAIConfig(draft);
    setSaved(true);
  };

  useEffect(() => {
    if (tab === "mcp") loadServers()
  }, [tab, loadServers])

  const handleAddServer = async () => {
    const args = mcpForm.args
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
    const config: McpServerConfig = {
      id: "",
      name: mcpForm.name,
      command: mcpForm.command,
      args,
      enabled: true,
      transport_type: "stdio",
    }
    await addServer(config)
    setMcpForm({ name: "", command: "", args: "" })
    setShowAddDialog(false)
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case "Connected": return <span className="h-2 w-2 rounded-full bg-success" />
      case "Connecting": return <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
      case "Error": return <span className="h-2 w-2 rounded-full bg-danger" />
      default: return <span className="h-2 w-2 rounded-full bg-text-tertiary" />
    }
  }

  const providers = [
    { id: "deepseek" as AIProvider,    label: "DeepSeek",       desc: "DeepSeek V4 / R1 系列",          model: "deepseek-chat",              baseUrl: "https://api.deepseek.com/v1" },
    { id: "zhipu" as AIProvider,       label: "智谱 GLM",       desc: "GLM-5 系列",                     model: "glm-4-flash",                baseUrl: "https://open.bigmodel.cn/api/paas/v4" },
    { id: "kimi" as AIProvider,        label: "Kimi (月之暗面)",  desc: "Kimi K2 系列",                   model: "moonshot-v1-128k",           baseUrl: "https://api.moonshot.cn/v1" },
    { id: "minimax" as AIProvider,     label: "MiniMax",         desc: "MiniMax M2.7 系列",              model: "MiniMax-M2.7",               baseUrl: "https://api.minimaxi.com/v1" },
    { id: "doubao" as AIProvider,      label: "豆包 (字节)",       desc: "DouBao Seed 系列",               model: "doubao-1-5-pro-256k",        baseUrl: "https://ark.cn-beijing.volces.com/api/v3" },
    { id: "qwen" as AIProvider,        label: "通义千问 (阿里)",   desc: "Qwen 2.5 / Plus 系列",           model: "qwen-plus",                  baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1" },
    { id: "stepfun" as AIProvider,     label: "阶跃星辰",          desc: "Step 2/3 系列",                  model: "step-2-16k",                 baseUrl: "https://api.stepfun.com/v1" },
    { id: "siliconflow" as AIProvider, label: "硅基流动",          desc: "多模型聚合平台 (OpenAI 兼容)",     model: "deepseek-ai/DeepSeek-V3",    baseUrl: "https://api.siliconflow.cn/v1" },
  ];

  const tabs: { id: SettingsTab; label: string; icon: typeof Cpu }[] = [
    { id: "general", label: t("settings.general"), icon: Settings2 },
    { id: "ai", label: t("settings.ai"), icon: Cpu },
    { id: "knowledge", label: t("knowledge.title"), icon: Database },
    { id: "skills", label: t("skills.title"), icon: BookOpen },
    { id: "mcp", label: t("mcp.title"), icon: Plug },
  ];

  return (
    <div className="relative flex h-full flex-col">
      <div className={cn("absolute inset-0 pointer-events-none", isDev ? "bg-glow" : "bg-glow-pm")} />

      {/* Header */}
      <div className="relative flex items-center gap-3 px-5 py-2.5 border-b border-border/50">
        <button
          onClick={() => setMainView("chat")}
          className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-hover/40 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h2 className="text-sm font-semibold text-text-primary">{t("settings.title")}</h2>
      </div>

      {/* Tab bar */}
      <div className="relative flex items-center gap-1 px-5 py-2 border-b border-border/50">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200",
                tab === t.id
                  ? "bg-accent-dev/10 text-accent-dev"
                  : "text-text-tertiary hover:text-text-secondary"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="relative flex-1 overflow-y-auto px-5 py-4">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* ===== General Settings ===== */}
          {tab === "general" && (
            <section className="space-y-6">
              <div>
                <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">{t("settings.language")}</h4>
                <div className="flex gap-2">
                  {(["zh", "en"] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setLanguage(lang)}
                      className={cn(
                        "px-4 py-2 rounded-lg border text-xs font-medium transition-all duration-200",
                        settings.language === lang
                          ? "border-accent-dev/40 bg-accent-dev/10 text-accent-dev"
                          : "border-border/50 text-text-secondary hover:border-border"
                      )}
                    >
                      {t(`common.${lang}`)}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ===== AI Settings ===== */}
          {tab === "ai" && (
            <>
              <section>
                <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">服务商</h4>
                <div className="grid grid-cols-3 gap-2">
                  {providers.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        updateDraft({ provider: p.id, model: p.model, baseUrl: p.baseUrl });
                      }}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all duration-200",
                        ai.provider === p.id
                          ? "border-accent-dev/40 bg-accent-dev/5"
                          : "border-border/50 hover:border-border"
                      )}
                    >
                      <div className={cn("text-xs font-semibold", ai.provider === p.id ? "text-accent-dev" : "text-text-primary")}>
                        {p.label}
                      </div>
                      <div className="text-[10px] text-text-tertiary mt-0.5 leading-relaxed">{p.desc}</div>
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <div>
                  <label className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">{t("settings.apiKey")}</label>
                  <div className="relative mt-1">
                    <input
                      type={showKey ? "text" : "password"}
                      value={ai.apiKey}
                      onChange={(e) => updateDraft({ apiKey: e.target.value })}
                      placeholder="输入 API Key..."
                      className={cn(
                        "w-full px-3 py-2 rounded-lg border text-xs",
                        "bg-bg-elevated/60 text-text-primary placeholder:text-text-tertiary",
                        "border-border/50 focus:border-accent-dev/30 focus:outline-none focus:ring-1 focus:ring-accent-dev/20",
                        "transition-all duration-200"
                      )}
                    />
                    <button
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
                    >
                      {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">{t("settings.baseUrl")}</label>
                  <input
                    type="text"
                    value={ai.baseUrl}
                    onChange={(e) => updateDraft({ baseUrl: e.target.value })}
                    className={cn(
                      "w-full mt-1 px-3 py-2 rounded-lg border text-xs font-mono",
                      "bg-bg-elevated/60 text-text-primary placeholder:text-text-tertiary",
                      "border-border/50 focus:border-accent-dev/30 focus:outline-none focus:ring-1 focus:ring-accent-dev/20",
                      "transition-all duration-200"
                    )}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">{t("settings.model")}</label>
                  <input
                    type="text"
                    value={ai.model}
                    onChange={(e) => updateDraft({ model: e.target.value })}
                    className={cn(
                      "w-full mt-1 px-3 py-2 rounded-lg border text-xs font-mono",
                      "bg-bg-elevated/60 text-text-primary placeholder:text-text-tertiary",
                      "border-border/50 focus:border-accent-dev/30 focus:outline-none focus:ring-1 focus:ring-accent-dev/20",
                      "transition-all duration-200"
                    )}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">
                    Temperature: {ai.temperature}
                  </label>
                  <input
                    type="range" min="0" max="2" step="0.1"
                    value={ai.temperature}
                    onChange={(e) => updateDraft({ temperature: parseFloat(e.target.value) })}
                    className="w-full mt-1 accent-accent-dev"
                  />
                  <div className="flex justify-between text-[9px] text-text-tertiary mt-0.5">
                    <span>精确</span><span>平衡</span><span>创意</span>
                  </div>
                </div>
              </section>

              {/* Save button */}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={handleSave}
                  className="gap-1.5 h-8 text-xs"
                >
                  {t("settings.save")}
                </Button>
                {saved && (
                  <span className="text-[10px] text-success">{t("settings.saved")}</span>
                )}
                {!saved && (
                  <span className="text-[10px] text-amber-500">*</span>
                )}
              </div>
            </>
          )}

          {/* ===== Knowledge Base ===== */}
          {tab === "knowledge" && <KnowledgePanel />}

          {/* ===== Skills Library ===== */}
          {tab === "skills" && <SkillsPanel />}

          {/* ===== MCP Servers ===== */}
          {tab === "mcp" && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-text-tertiary">{t("mcp.noServersHint")}</p>
                <button
                  onClick={() => setShowAddDialog(true)}
                  className={cn(
                    "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium",
                    "bg-accent-dev/10 text-accent-dev hover:bg-accent-dev/20 transition-colors"
                  )}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("mcp.addServer")}
                </button>
              </div>

              {servers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-text-tertiary">
                  <Plug className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-xs">{t("mcp.noServers")}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {servers.map((s) => (
                    <div
                      key={s.config.id}
                      className="p-4 rounded-xl border border-border/50 bg-bg-elevated/40"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {statusIcon(s.status)}
                          <span className="text-sm font-semibold text-text-primary">{s.config.name}</span>
                          <span className="text-[10px] text-text-tertiary font-mono">{s.config.command}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {s.status === "Connected" ? (
                            <button
                              onClick={() => stopServer(s.config.id)}
                              className="p-1.5 rounded text-text-tertiary hover:text-amber-500 hover:bg-bg-hover/40 transition-colors"
                              title={t("mcp.stop")}
                            >
                              <Square className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => startServer(s.config.id)}
                              className="p-1.5 rounded text-text-tertiary hover:text-success hover:bg-bg-hover/40 transition-colors"
                              title={t("mcp.start")}
                            >
                              <Play className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (confirm(t("mcp.removeConfirm", { name: s.config.name }))) {
                                removeServer(s.config.id)
                              }
                            }}
                            className="p-1.5 rounded text-text-tertiary hover:text-danger hover:bg-bg-hover/40 transition-colors"
                            title={t("mcp.remove")}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] text-text-tertiary">
                        <span>
                          {t("mcp.status")}: {t(`mcp.${s.status === "Connected" ? "connected" : s.status === "Connecting" ? "connecting" : s.status === "Error" ? "error" : "disconnected"}`)}
                        </span>
                        <span>
                          {t("mcp.tools")}: {s.tools.length}
                        </span>
                      </div>
                      {s.tools.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {s.tools.map((tool) => (
                            <span
                              key={tool.name}
                              className="px-2 py-0.5 rounded text-[10px] bg-bg-hover/60 text-text-secondary font-mono"
                            >
                              {tool.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ===== Add MCP Server Dialog ===== */}
          {showAddDialog && (
            <>
              <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowAddDialog(false)} />
              <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
                <div className="pointer-events-auto w-[420px] p-6 rounded-2xl border border-border/50 bg-bg-base shadow-xl">
                  <h3 className="text-sm font-semibold text-text-primary mb-4">{t("mcp.addDialogTitle")}</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">{t("mcp.serverName")}</label>
                      <input
                        type="text"
                        value={mcpForm.name}
                        onChange={(e) => setMcpForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder={t("mcp.serverNamePlaceholder")}
                        className={cn(
                          "w-full mt-1 px-3 py-2 rounded-lg border text-xs",
                          "bg-bg-elevated/60 text-text-primary placeholder:text-text-tertiary",
                          "border-border/50 focus:border-accent-dev/30 focus:outline-none focus:ring-1 focus:ring-accent-dev/20"
                        )}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">{t("mcp.serverCommand")}</label>
                      <input
                        type="text"
                        value={mcpForm.command}
                        onChange={(e) => setMcpForm((f) => ({ ...f, command: e.target.value }))}
                        placeholder={t("mcp.serverCommandPlaceholder")}
                        className={cn(
                          "w-full mt-1 px-3 py-2 rounded-lg border text-xs font-mono",
                          "bg-bg-elevated/60 text-text-primary placeholder:text-text-tertiary",
                          "border-border/50 focus:border-accent-dev/30 focus:outline-none focus:ring-1 focus:ring-accent-dev/20"
                        )}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">{t("mcp.serverArgs")}</label>
                      <textarea
                        value={mcpForm.args}
                        onChange={(e) => setMcpForm((f) => ({ ...f, args: e.target.value }))}
                        placeholder={t("mcp.serverArgsPlaceholder")}
                        rows={4}
                        className={cn(
                          "w-full mt-1 px-3 py-2 rounded-lg border text-xs font-mono resize-none",
                          "bg-bg-elevated/60 text-text-primary placeholder:text-text-tertiary",
                          "border-border/50 focus:border-accent-dev/30 focus:outline-none focus:ring-1 focus:ring-accent-dev/20"
                        )}
                      />
                      <p className="text-[9px] text-text-tertiary mt-1">{t("mcp.argsHint")}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 mt-4">
                    <button
                      onClick={() => setShowAddDialog(false)}
                      className="px-3 py-1.5 rounded-lg text-xs text-text-tertiary hover:text-text-primary hover:bg-bg-hover/40 transition-colors"
                    >
                      {t("common.cancel")}
                    </button>
                    <button
                      onClick={handleAddServer}
                      disabled={!mcpForm.name || !mcpForm.command}
                      className={cn(
                        "px-4 py-1.5 rounded-lg text-xs font-medium transition-colors",
                        mcpForm.name && mcpForm.command
                          ? "bg-accent-dev/10 text-accent-dev hover:bg-accent-dev/20"
                          : "bg-bg-hover/40 text-text-tertiary cursor-not-allowed"
                      )}
                    >
                      {t("mcp.saveServer")}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* About */}
          <section className="pt-4 border-t border-border/50">
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">pizz v0.1.0</h4>
            <div className="text-[11px] text-text-tertiary space-y-1">
              <p>pizz v0.1.0</p>
              <p>个人全栈开发者的 AI 工作站</p>
              <p>Built with Tauri + React + TypeScript</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
