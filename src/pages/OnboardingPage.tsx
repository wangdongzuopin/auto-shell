import { useState } from "react";
import { useAppStore, type AppRole, type ThemeMode } from "@/stores/appStore";
import { cn } from "@/lib/utils";
import {
  Code2,
  PenSquare,
  ArrowRight,
  Check,
  Sun,
  Moon,
  Hammer,
  Sparkles,
  GitBranch,
  Image,
  Palette,
  ShieldCheck,
} from "lucide-react";

interface OnboardingPageProps {
  onComplete: () => void;
}

type Step = 0 | 1 | 2;

const roleCards = [
  {
    role: "developer" as AppRole,
    icon: Code2,
    title: "开发者",
    subtitle: "全栈开发助手",
    description: "分析代码、回答问题、直接修改项目文件。支持问答和编辑两种模式。",
    highlights: [
      { icon: Code2, text: "分析项目架构，解释复杂代码逻辑" },
      { icon: GitBranch, text: "直接修改代码，自动写入项目文件" },
      { icon: Sparkles, text: "多文件编辑，diff 预览，知识库增强" },
    ],
    glow: "bg-glow",
    accent: "accent-dev",
  },
  {
    role: "product" as AppRole,
    icon: PenSquare,
    title: "产品经理",
    subtitle: "产品设计助手",
    description: "设计产品原型、绘制流程图、评估方案可行性。专注于产品思维。",
    highlights: [
      { icon: Image, text: "生成 HTML 原型图，实时预览与下载" },
      { icon: GitBranch, text: "绘制 Mermaid 流程图（时序图/状态机/ER图）" },
      { icon: Palette, text: "结构化思维分析，方案对比与评估" },
    ],
    glow: "bg-glow-pm",
    accent: "accent-pm",
  },
];

const themeCards = [
  {
    theme: "dark" as ThemeMode,
    icon: Moon,
    label: "深色模式",
    desc: "护眼舒适的暗色主题，适合长时间编码",
    preview: "bg-slate-900",
    previewText: "text-slate-300",
    previewAccent: "bg-violet-500/20",
  },
  {
    theme: "light" as ThemeMode,
    icon: Sun,
    label: "浅色模式",
    desc: "清爽明亮的亮色主题，适合白天使用",
    preview: "bg-white",
    previewText: "text-slate-700",
    previewAccent: "bg-blue-500/10",
  },
];

export function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const [step, setStep] = useState<Step>(0);
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<ThemeMode>("dark");
  const [completing, setCompleting] = useState(false);

  const handleRoleSelect = (role: AppRole) => {
    setSelectedRole(role);
    setStep(1);
  };

  const handleBack = () => setStep((s) => (s - 1) as Step);

  const handleComplete = async () => {
    if (!selectedRole) return;
    setCompleting(true);
    await useAppStore.getState().completeOnboarding(selectedRole, selectedTheme);
    onComplete();
  };

  const selectedCard = roleCards.find((c) => c.role === selectedRole);

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-bg-base overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className={cn("absolute inset-0 opacity-30", selectedRole === "product" ? "bg-glow-pm" : "bg-glow")} />
      </div>

      {/* Header */}
      <div className="relative mb-8 text-center animate-slide-up">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-dev/10 text-accent-dev shadow-lg">
            <Hammer className="h-6 w-6" />
          </div>
        </div>
        <h1 className="text-2xl font-semibold text-text-primary font-display tracking-tight">
          欢迎使用 pizz
        </h1>
        <p className="mt-2 text-sm text-text-secondary max-w-md">
          你的个人 AI 开发工作站。让我们花几秒钟完成初始设置。
        </p>
      </div>

      {/* Step indicator */}
      <div className="relative flex items-center gap-2 mb-8">
        {[0, 1, 2].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold transition-all duration-300",
                step === s
                  ? "bg-primary text-primary-foreground shadow-sm scale-110"
                  : step > s
                    ? "bg-accent-dev/20 text-accent-dev"
                    : "bg-bg-elevated border border-border/50 text-text-tertiary"
              )}
            >
              {step > s ? <Check className="h-3 w-3" /> : s + 1}
            </div>
            {s < 2 && (
              <div
                className={cn(
                  "w-8 h-px transition-colors duration-300",
                  step > s ? "bg-accent-dev/40" : "bg-border/50"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="relative w-full max-w-2xl px-6 animate-slide-up" key={step}>

        {/* Step 0: Role Selection */}
        {step === 0 && (
          <div className="grid grid-cols-2 gap-4">
            {roleCards.map((card) => (
              <button
                key={card.role}
                onClick={() => handleRoleSelect(card.role)}
                className={cn(
                  "group relative flex flex-col items-center gap-4 p-6 rounded-2xl border text-center transition-all duration-300",
                  "border-border/50 hover:border-accent-dev/30",
                  "bg-glass-bg-strong backdrop-blur-xl",
                  "hover:shadow-lg hover:-translate-y-0.5"
                )}
              >
                <div className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className={cn("absolute inset-0 opacity-20", card.glow)} />
                </div>
                <div
                  className={cn(
                    "relative flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-300",
                    card.role === "developer"
                      ? "bg-accent-dev/10 text-accent-dev group-hover:shadow-lg group-hover:shadow-accent-dev/20"
                      : "bg-accent-pm/10 text-accent-pm group-hover:shadow-lg group-hover:shadow-accent-pm/20"
                  )}
                >
                  <card.icon className="h-7 w-7" />
                </div>
                <div className="relative">
                  <h3 className="text-base font-semibold text-text-primary">{card.title}</h3>
                  <p className="text-[11px] text-text-tertiary mt-0.5">{card.subtitle}</p>
                </div>
                <p className="relative text-xs text-text-secondary leading-relaxed">
                  {card.description}
                </p>
                <div
                  className={cn(
                    "relative flex items-center gap-1.5 text-xs font-medium transition-all",
                    card.role === "developer" ? "text-accent-dev" : "text-accent-pm"
                  )}
                >
                  选择 <ArrowRight className="h-3 w-3" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 1: Role Detail */}
        {step === 1 && selectedCard && (
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "flex h-20 w-20 items-center justify-center rounded-2xl shadow-lg mb-6",
                selectedCard.role === "developer"
                  ? "bg-accent-dev/10 text-accent-dev glow-dev"
                  : "bg-accent-pm/10 text-accent-pm glow-pm"
              )}
            >
              <selectedCard.icon className="h-10 w-10" />
            </div>
            <h2 className="text-xl font-semibold text-text-primary">{selectedCard.title}</h2>
            <p className="text-sm text-text-secondary mt-1">{selectedCard.subtitle}</p>

            <div className="mt-8 w-full space-y-3">
              {selectedCard.highlights.map((h, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 p-4 rounded-xl border border-border/30 bg-bg-elevated/20"
                >
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    selectedCard.role === "developer" ? "bg-accent-dev/10 text-accent-dev" : "bg-accent-pm/10 text-accent-pm"
                  )}>
                    <h.icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm text-text-secondary leading-relaxed pt-1">{h.text}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 mt-8">
              <button
                onClick={handleBack}
                className="px-4 py-2 rounded-xl text-xs text-text-tertiary hover:text-text-primary hover:bg-bg-hover/40 transition-all"
              >
                返回选择
              </button>
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-sm"
              >
                开始使用 <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Theme Selection */}
        {step === 2 && (
          <div className="flex flex-col items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-dev/10 text-accent-dev mb-6">
              <Palette className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-semibold text-text-primary">选择主题</h2>
            <p className="text-sm text-text-secondary mt-1">之后可以随时在设置中更改</p>

            <div className="grid grid-cols-2 gap-4 mt-8 w-full">
              {themeCards.map((card) => (
                <button
                  key={card.theme}
                  onClick={() => setSelectedTheme(card.theme)}
                  className={cn(
                    "group flex flex-col items-center gap-3 p-5 rounded-2xl border text-center transition-all duration-300",
                    selectedTheme === card.theme
                      ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                      : "border-border/50 bg-glass-bg-strong hover:border-border/70"
                  )}
                >
                  <card.icon
                    className={cn(
                      "h-5 w-5 transition-colors",
                      selectedTheme === card.theme ? "text-primary" : "text-text-tertiary"
                    )}
                  />
                  <div
                    className={cn(
                      "w-full h-16 rounded-lg border border-border/30 flex items-center justify-center text-[10px] font-medium transition-all",
                      card.preview,
                      card.previewText
                    )}
                  >
                    <div className={cn("px-2 py-0.5 rounded text-[9px]", card.previewAccent)}>
                      {card.label}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      selectedTheme === card.theme ? "text-text-primary" : "text-text-secondary"
                    )}
                  >
                    {card.label}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 mt-8">
              <button
                onClick={handleBack}
                className="px-4 py-2 rounded-xl text-xs text-text-tertiary hover:text-text-primary hover:bg-bg-hover/40 transition-all"
              >
                上一步
              </button>
              <button
                onClick={handleComplete}
                disabled={completing}
                className="flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all shadow-sm"
              >
                {completing ? (
                  <>设置中...</>
                ) : (
                  <>
                    <ShieldCheck className="h-3.5 w-3.5" />
                    完成设置
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
