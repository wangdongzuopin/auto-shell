import { useEffect, useMemo, useState } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useWorkflowStore } from "@/stores/workflowStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Artifact, Idea } from "@/types/commands";
import { streamChat, type ChatMessage } from "@/services/ai";
import {
  ArrowRight,
  ClipboardCheck,
  FileText,
  GitPullRequest,
  Layers3,
  Lightbulb,
  Loader2,
  Plus,
  Sparkles,
} from "lucide-react";

const roleLabels: Record<string, string> = {
  operations: "运营",
  product_management: "产品经理",
  design: "设计",
  engineering: "工程开发",
  qa: "测试",
  project_owner: "项目负责人",
};

const statusLabels: Record<string, string> = {
  draft: "草稿",
  assessed: "已评估",
  approved: "已定版",
  handed_off: "已流转",
};

const artifactLabels: Record<string, string> = {
  assessment: "可行性评估",
  prd: "产品需求文档",
  dev_tasks: "开发任务",
};

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildAssessment(idea: Idea) {
  return [
    `价值判断：${idea.title} 适合作为可验证的小步功能推进，先用低成本 MVP 验证使用频次与转化价值。`,
    "目标用户：当前项目的核心使用者，以及负责需求、设计、开发流转的个人开发者。",
    "成功指标：想法可被拆解为明确产物，至少生成 PRD、开发任务和验收要点。",
    "主要风险：范围过大、验收标准模糊、缺少真实用户反馈。",
    "下一步：交给产品经理补齐边界、流程、验收标准，再流转到设计或开发。",
  ].join("\n");
}

function buildPrd(idea: Idea) {
  return [
    `# ${idea.title}`,
    "",
    "## 背景",
    idea.content,
    "",
    "## 目标",
    "- 将原始想法转化为可实现、可验收的功能范围。",
    "- 明确核心用户、核心路径和暂不处理的边界。",
    "",
    "## 用户故事",
    "- 作为使用者，我希望快速记录一个想法，并看到下一步应该由哪个角色处理。",
    "- 作为产品角色，我希望沉淀评估摘要和 PRD，方便后续开发接手。",
    "",
    "## 验收标准",
    "- 可以创建、查看、评估并定版想法。",
    "- 可以为想法生成并保存 PRD 产物。",
    "- 可以将想法流转到工程开发角色。",
  ].join("\n");
}

function buildDevTasks(idea: Idea) {
  return [
    `# ${idea.title} 开发任务`,
    "",
    "- 梳理现有数据模型和 IPC 命令。",
    "- 实现前端入口、列表、详情和状态动作。",
    "- 连接产物生成与保存能力。",
    "- 增加空态、加载态和错误态。",
    "- 补充关键状态转换测试。",
  ].join("\n");
}

function workflowSystemPrompt() {
  return [
    "你是 pizz 的产品工作流助手，负责把原始想法推进为可审计的交付产物。",
    "回答必须使用中文，内容要具体、可执行，不要寒暄，不要解释你正在做什么。",
    "输出纯 Markdown 正文，不要用代码块包裹。",
    "重点覆盖：价值、范围、风险、下一角色、验收或任务拆解。",
  ].join("\n");
}

function buildWorkflowMessages(kind: "assessment" | "prd" | "dev_tasks", idea: Idea): ChatMessage[] {
  const kindPrompt = {
    assessment: "请生成一份可行性评估摘要，包含价值判断、目标用户、成功指标、风险和建议下一步。",
    prd: "请生成一份精简 PRD，包含背景、目标、用户故事、功能范围、非目标、验收标准。",
    dev_tasks: "请生成开发任务拆解，包含前端、后端、数据、测试、风险和推荐实现顺序。",
  }[kind];

  return [
    { role: "system", content: workflowSystemPrompt() },
    {
      role: "user",
      content: [
        kindPrompt,
        "",
        `想法标题：${idea.title}`,
        "",
        `想法内容：${idea.content}`,
        "",
        idea.assessment_summary ? `已有评估：\n${idea.assessment_summary}` : "",
      ].join("\n"),
    },
  ];
}

function statusTone(status: string) {
  switch (status) {
    case "assessed":
      return "border-accent-pm/30 bg-accent-pm/10 text-accent-pm";
    case "approved":
      return "border-success/30 bg-success/10 text-success";
    case "handed_off":
      return "border-accent-dev/30 bg-accent-dev/10 text-accent-dev";
    default:
      return "border-border/50 bg-bg-elevated/50 text-text-tertiary";
  }
}

function ArtifactList({ artifacts }: { artifacts: Artifact[] }) {
  if (artifacts.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-5 text-center">
        <FileText className="mb-2 h-7 w-7 text-text-tertiary/40" />
        <p className="text-xs text-text-tertiary">暂无产物</p>
        <p className="mt-1 text-[10px] text-text-tertiary/60">
          评估、PRD 和开发任务会沉淀在这里
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {artifacts.map((artifact) => (
        <div
          key={artifact.id}
          className="rounded-lg border border-border/40 bg-bg-elevated/40 p-3"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-text-primary">{artifact.title}</p>
              <p className="mt-0.5 text-[10px] text-text-tertiary">
                {artifactLabels[artifact.artifact_type] ?? artifact.artifact_type} ·{" "}
                {roleLabels[artifact.role_key] ?? artifact.role_key}
              </p>
            </div>
            <span className="rounded border border-border/40 px-1.5 py-0.5 text-[9px] text-text-tertiary">
              {artifact.status}
            </span>
          </div>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-[10px] leading-relaxed text-text-secondary">
            {artifact.content}
          </pre>
        </div>
      ))}
    </div>
  );
}

export function WorkflowPage() {
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const projects = useProjectStore((s) => s.projects);
  const currentProject = projects.find((project) => project.id === currentProjectId);
  const {
    ideas,
    artifactsByIdea,
    currentIdeaId,
    isLoading,
    error,
    loadIdeas,
    createIdea,
    updateIdeaStatus,
    setCurrentIdea,
    loadArtifacts,
    createArtifact,
  } = useWorkflowStore();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [generationNotice, setGenerationNotice] = useState<string | null>(null);

  const selectedIdea = useMemo(
    () => ideas.find((idea) => idea.id === currentIdeaId) ?? ideas[0],
    [currentIdeaId, ideas]
  );
  const selectedArtifacts = selectedIdea ? artifactsByIdea[selectedIdea.id] ?? [] : [];

  useEffect(() => {
    loadIdeas(null, currentProjectId);
  }, [currentProjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!currentIdeaId && ideas.length > 0) {
      setCurrentIdea(ideas[0].id);
    }
  }, [currentIdeaId, ideas, setCurrentIdea]);

  useEffect(() => {
    if (selectedIdea) {
      loadArtifacts(selectedIdea.id);
    }
  }, [selectedIdea?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreateIdea = async () => {
    const cleanTitle = title.trim();
    const cleanContent = content.trim();
    if (!cleanTitle || !cleanContent) return;
    setBusyAction("create");
    try {
      const idea = await createIdea({
        title: cleanTitle,
        content: cleanContent,
        project_id: currentProjectId,
        source_role_key: "operations",
      });
      setTitle("");
      setContent("");
      setCurrentIdea(idea.id);
      await loadArtifacts(idea.id);
    } finally {
      setBusyAction(null);
    }
  };

  const generateWorkflowText = async (
    kind: "assessment" | "prd" | "dev_tasks",
    idea: Idea,
    fallback: string
  ) => {
    const config = useSettingsStore.getState().getAIConfig();
    if (!config.apiKey) {
      setGenerationNotice("未配置 API Key，已使用本地模板生成。");
      return fallback;
    }

    let fullText = "";
    let generationError: Error | null = null;
    setGenerationNotice(null);

    try {
      await streamChat(
        buildWorkflowMessages(kind, idea),
        config,
        {
          onToken: (token) => {
            fullText += token;
          },
          onDone: (text) => {
            fullText = text || fullText;
          },
          onError: (error) => {
            generationError = error;
          },
        },
        undefined,
        false
      );
      if (generationError) {
        throw generationError;
      }
      const cleanText = fullText.trim();
      if (cleanText) return cleanText;
      setGenerationNotice("AI 返回为空，已使用本地模板生成。");
      return fallback;
    } catch (error) {
      setGenerationNotice(`AI 生成失败，已使用本地模板生成：${String(error)}`);
      return fallback;
    }
  };

  const handleAssess = async () => {
    if (!selectedIdea) return;
    setBusyAction("assess");
    try {
      const assessment = await generateWorkflowText(
        "assessment",
        selectedIdea,
        buildAssessment(selectedIdea)
      );
      const updated = await updateIdeaStatus({
        id: selectedIdea.id,
        status: "assessed",
        assessment_summary: assessment,
        current_role_key: "product_management",
        next_role_key: "product_management",
        note: "生成可行性评估草稿",
      });
      await createArtifact({
        idea_id: selectedIdea.id,
        artifact_type: "assessment",
        title: `${selectedIdea.title} 可行性评估`,
        content: assessment,
        role_key: "operations",
        status: "ready",
      });
      setCurrentIdea(updated.id);
      await loadArtifacts(selectedIdea.id);
    } finally {
      setBusyAction(null);
    }
  };

  const handleCreatePrd = async () => {
    if (!selectedIdea) return;
    setBusyAction("prd");
    try {
      const prd = await generateWorkflowText("prd", selectedIdea, buildPrd(selectedIdea));
      await createArtifact({
        idea_id: selectedIdea.id,
        artifact_type: "prd",
        title: `${selectedIdea.title} PRD`,
        content: prd,
        role_key: "product_management",
        status: "draft",
      });
      await updateIdeaStatus({
        id: selectedIdea.id,
        status: "approved",
        current_role_key: "product_management",
        next_role_key: "engineering",
        note: "PRD 已生成，准备流转开发",
      });
      await loadIdeas(null, currentProjectId);
      await loadArtifacts(selectedIdea.id);
    } finally {
      setBusyAction(null);
    }
  };

  const handleHandoffToEngineering = async () => {
    if (!selectedIdea) return;
    setBusyAction("handoff");
    try {
      const devTasks = await generateWorkflowText(
        "dev_tasks",
        selectedIdea,
        buildDevTasks(selectedIdea)
      );
      await createArtifact({
        idea_id: selectedIdea.id,
        artifact_type: "dev_tasks",
        title: `${selectedIdea.title} 开发任务拆解`,
        content: devTasks,
        role_key: "engineering",
        status: "ready",
      });
      const updated = await updateIdeaStatus({
        id: selectedIdea.id,
        status: "handed_off",
        current_role_key: "engineering",
        next_role_key: "qa",
        note: "流转到工程开发",
      });
      setCurrentIdea(updated.id);
      await loadIdeas(null, currentProjectId);
      await loadArtifacts(selectedIdea.id);
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <div className="absolute inset-0 bg-glow-pm pointer-events-none" />

      <header className="relative flex items-center justify-between border-b border-border/50 px-5 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] text-text-tertiary">
            <Layers3 className="h-3.5 w-3.5 text-accent-pm" />
            <span>想法工作流</span>
            {currentProject && (
              <>
                <span className="text-text-tertiary/40">/</span>
                <span className="truncate">{currentProject.name}</span>
              </>
            )}
          </div>
          <h1 className="mt-1 text-lg font-semibold tracking-tight text-text-primary">
            从想法到开发任务
          </h1>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-text-tertiary">
          <span className="rounded-md border border-border/40 bg-bg-elevated/60 px-2 py-1">
            {ideas.length} 个想法
          </span>
          <span className="rounded-md border border-border/40 bg-bg-elevated/60 px-2 py-1">
            MVP 流程
          </span>
        </div>
      </header>

      <div className="relative grid min-h-0 flex-1 grid-cols-[300px_minmax(0,1fr)_320px]">
        <aside className="min-h-0 border-r border-border/50 bg-glass-bg/80 p-3">
          <div className="rounded-lg border border-border/50 bg-bg-elevated/40 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-text-primary">
              <Plus className="h-3.5 w-3.5 text-accent-pm" />
              新想法
            </div>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例如：团队想法流转面板"
              className="mb-2 h-8 w-full rounded-md border border-border/50 bg-bg-base/60 px-2.5 text-xs text-text-primary placeholder:text-text-tertiary focus:border-accent-pm/40 focus:outline-none focus:ring-2 focus:ring-accent-pm/10"
            />
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="描述用户、场景、价值和你希望 AI 评估的问题..."
              rows={5}
              className="mb-2 w-full resize-none rounded-md border border-border/50 bg-bg-base/60 px-2.5 py-2 text-xs leading-relaxed text-text-primary placeholder:text-text-tertiary focus:border-accent-pm/40 focus:outline-none focus:ring-2 focus:ring-accent-pm/10"
            />
            <Button
              size="sm"
              className="w-full"
              disabled={!title.trim() || !content.trim() || busyAction === "create"}
              onClick={handleCreateIdea}
            >
              {busyAction === "create" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lightbulb className="h-3.5 w-3.5" />}
              创建想法
            </Button>
          </div>

          <div className="mt-3 min-h-0 space-y-1.5 overflow-y-auto pb-3">
            {isLoading && ideas.length === 0 ? (
              <div className="flex items-center gap-2 px-2 py-4 text-xs text-text-tertiary">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                加载想法...
              </div>
            ) : ideas.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/50 px-4 py-6 text-center">
                <Lightbulb className="mx-auto mb-2 h-7 w-7 text-text-tertiary/40" />
                <p className="text-xs text-text-tertiary">还没有想法</p>
                <p className="mt-1 text-[10px] text-text-tertiary/60">
                  从一个小需求开始，让流程跑起来
                </p>
              </div>
            ) : (
              ideas.map((idea) => (
                <button
                  key={idea.id}
                  onClick={() => setCurrentIdea(idea.id)}
                  className={cn(
                    "w-full rounded-lg border p-3 text-left transition-all",
                    selectedIdea?.id === idea.id
                      ? "border-accent-pm/30 bg-accent-pm/10"
                      : "border-border/40 bg-bg-elevated/30 hover:border-border/70 hover:bg-bg-elevated/50"
                  )}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-medium text-text-primary">{idea.title}</p>
                    <span className={cn("shrink-0 rounded border px-1.5 py-0.5 text-[9px]", statusTone(idea.status))}>
                      {statusLabels[idea.status] ?? idea.status}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-[10px] leading-relaxed text-text-tertiary">
                    {idea.content}
                  </p>
                  <p className="mt-2 text-[9px] text-text-tertiary/60">
                    {formatDate(idea.updated_at)}
                  </p>
                </button>
              ))
            )}
          </div>
        </aside>

        <main className="min-w-0 overflow-y-auto p-5">
          {error && (
            <div className="mb-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
              {error}
            </div>
          )}

          {generationNotice && (
            <div className="mb-3 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
              {generationNotice}
            </div>
          )}

          {!selectedIdea ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Lightbulb className="mb-3 h-10 w-10 text-text-tertiary/40" />
              <p className="text-sm text-text-secondary">选择或创建一个想法</p>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-4">
              <section className="rounded-lg border border-border/50 bg-bg-elevated/40 p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-text-primary">{selectedIdea.title}</h2>
                    <p className="mt-1 text-[11px] text-text-tertiary">
                      {roleLabels[selectedIdea.current_role_key] ?? selectedIdea.current_role_key} 处理中
                      {selectedIdea.next_role_key && (
                        <>
                          <ArrowRight className="mx-1 inline h-3 w-3" />
                          下一步 {roleLabels[selectedIdea.next_role_key] ?? selectedIdea.next_role_key}
                        </>
                      )}
                    </p>
                  </div>
                  <span className={cn("rounded border px-2 py-1 text-[10px]", statusTone(selectedIdea.status))}>
                    {statusLabels[selectedIdea.status] ?? selectedIdea.status}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-7 text-text-secondary">
                  {selectedIdea.content}
                </p>
              </section>

              <section className="rounded-lg border border-border/50 bg-bg-elevated/40 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-text-primary">
                  <Sparkles className="h-4 w-4 text-accent-pm" />
                  AI 评估摘要
                </div>
                {selectedIdea.assessment_summary ? (
                  <pre className="whitespace-pre-wrap rounded-md bg-bg-base/50 p-3 text-xs leading-6 text-text-secondary">
                    {selectedIdea.assessment_summary}
                  </pre>
                ) : (
                  <p className="rounded-md border border-dashed border-border/50 px-3 py-5 text-center text-xs text-text-tertiary">
                    还没有评估摘要
                  </p>
                )}
              </section>

              <section className="rounded-lg border border-border/50 bg-bg-elevated/40 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-text-primary">
                  <GitPullRequest className="h-4 w-4 text-accent-dev" />
                  流程动作
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start"
                    onClick={handleAssess}
                    disabled={busyAction !== null}
                  >
                    {busyAction === "assess" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    生成评估
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start"
                    onClick={handleCreatePrd}
                    disabled={busyAction !== null}
                  >
                    {busyAction === "prd" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ClipboardCheck className="h-3.5 w-3.5" />}
                    生成 PRD
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start"
                    onClick={handleHandoffToEngineering}
                    disabled={busyAction !== null}
                  >
                    {busyAction === "handoff" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                    流转开发
                  </Button>
                </div>
              </section>
            </div>
          )}
        </main>

        <aside className="min-h-0 overflow-y-auto border-l border-border/50 bg-glass-bg/70 p-3">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-text-primary">
              <FileText className="h-3.5 w-3.5 text-accent-pm" />
              产物沉淀
            </div>
            <span className="text-[10px] text-text-tertiary">{selectedArtifacts.length}</span>
          </div>
          <ArtifactList artifacts={selectedArtifacts} />
        </aside>
      </div>
    </div>
  );
}
