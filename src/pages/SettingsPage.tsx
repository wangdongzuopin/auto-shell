import { useState } from "react";
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
} from "lucide-react";

type SettingsTab = "ai" | "knowledge" | "skills";

export function SettingsPage() {
  const { role, setMainView } = useAppStore();
  const { settings, saveAIConfig } = useSettingsStore();
  const [tab, setTab] = useState<SettingsTab>("ai");
  const [showKey, setShowKey] = useState(false);

  // AI draft state — changes don't persist until saved
  const [draft, setDraft] = useState(settings.ai);
  const [saved, setSaved] = useState(true);

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
    { id: "ai", label: "AI 服务", icon: Cpu },
    { id: "knowledge", label: "知识库", icon: Database },
    { id: "skills", label: "技能库", icon: BookOpen },
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
        <h2 className="text-sm font-semibold text-text-primary">设置</h2>
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
                  <label className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">API Key</label>
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
                  <label className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">API 地址</label>
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
                  <label className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">模型</label>
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
                  保存
                </Button>
                {saved && (
                  <span className="text-[10px] text-success">已保存</span>
                )}
                {!saved && (
                  <span className="text-[10px] text-warning">有未保存的更改</span>
                )}
              </div>
            </>
          )}

          {/* ===== Knowledge Base ===== */}
          {tab === "knowledge" && <KnowledgePanel />}

          {/* ===== Skills Library ===== */}
          {tab === "skills" && <SkillsPanel />}

          {/* About */}
          <section className="pt-4 border-t border-border/50">
            <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">关于</h4>
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
