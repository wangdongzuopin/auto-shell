import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDashed,
  Hammer,
  Wrench,
  XCircle,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToolTraceItem {
  id: string;
  name: string;
  status: "running" | "done";
  success?: boolean;
  args?: string;
  result?: string;
}

interface ExecutionTraceProps {
  tools?: ToolTraceItem[];
  skills?: string[];
  compact?: boolean;
}

const toolLabels: Record<string, string> = {
  read_file: "读取文件",
  read_many_files: "批量读取文件",
  write_file: "写入文件",
  apply_patch: "应用补丁",
  list_directory: "列出目录",
  grep_search: "精确搜索",
  search_code: "搜索代码",
  search_knowledge: "搜索知识库",
  get_knowledge: "读取知识",
  create_knowledge: "创建知识",
  list_skills: "查询技能",
  run_command: "运行命令",
  git_status: "Git 状态",
  git_diff: "Git 差异",
  undo_last_edit: "撤销编辑",
};

function labelForTool(name: string) {
  return toolLabels[name] ?? name;
}

function preview(text?: string, maxLen = 220) {
  if (!text) return "";
  return text.length > maxLen ? `${text.slice(0, maxLen)}...` : text;
}

function statusText(item: ToolTraceItem) {
  if (item.status === "running") return "运行中";
  return item.success === false ? "失败" : "完成";
}

function statusIcon(item: ToolTraceItem) {
  if (item.status === "running") {
    return <CircleDashed className="h-3.5 w-3.5 animate-spin text-accent-dev" />;
  }
  if (item.success === false) {
    return <XCircle className="h-3.5 w-3.5 text-danger" />;
  }
  return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
}

export function ExecutionTrace({ tools = [], skills = [], compact = false }: ExecutionTraceProps) {
  const [openTools, setOpenTools] = useState<Record<string, boolean>>({});
  const hasTools = tools.length > 0;
  const hasSkills = skills.length > 0;

  const counts = useMemo(() => {
    const failed = tools.filter((tool) => tool.status === "done" && tool.success === false).length;
    const running = tools.filter((tool) => tool.status === "running").length;
    return { failed, running };
  }, [tools]);

  if (!hasTools && !hasSkills) return null;

  return (
    <div
      className={cn(
        "mb-2 overflow-hidden rounded-xl border border-border/40 bg-bg-elevated/35",
        compact ? "text-[10px]" : "text-[11px]"
      )}
    >
      <div className="flex items-center gap-2 border-b border-border/25 px-3 py-2 text-text-secondary">
        <Hammer className="h-3.5 w-3.5 text-accent-dev" />
        <span className="font-medium text-text-primary">执行过程</span>
        {hasTools && <span className="text-text-tertiary">{tools.length} 个工具</span>}
        {hasSkills && <span className="text-text-tertiary">{skills.length} 个技能</span>}
        {counts.running > 0 && <span className="ml-auto text-accent-dev">运行中</span>}
        {counts.failed > 0 && <span className="ml-auto text-danger">{counts.failed} 个失败</span>}
      </div>

      {hasSkills && (
        <div className="flex flex-wrap gap-1.5 px-3 py-2">
          {skills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1 rounded-md border border-accent-pm/20 bg-accent-pm/10 px-2 py-0.5 font-medium text-accent-pm"
            >
              <Zap className="h-3 w-3" />
              {skill}
            </span>
          ))}
        </div>
      )}

      {hasTools && (
        <div className="divide-y divide-border/20">
          {tools.map((tool) => {
            const expanded = openTools[tool.id] ?? false;
            const hasDetails = Boolean(tool.args || tool.result);
            return (
              <div key={tool.id} className="px-3 py-2">
                <button
                  type="button"
                  disabled={!hasDetails}
                  onClick={() => setOpenTools((prev) => ({ ...prev, [tool.id]: !expanded }))}
                  className="flex w-full items-center gap-2 text-left disabled:cursor-default"
                >
                  {statusIcon(tool)}
                  <Wrench className="h-3.5 w-3.5 text-text-tertiary" />
                  <span className="font-medium text-text-primary">{labelForTool(tool.name)}</span>
                  {tool.args && (
                    <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-text-tertiary">
                      {tool.args}
                    </span>
                  )}
                  <span
                    className={cn(
                      "shrink-0 rounded-md px-1.5 py-0.5 text-[10px]",
                      tool.status === "running"
                        ? "bg-accent-dev/10 text-accent-dev"
                        : tool.success === false
                          ? "bg-danger/10 text-danger"
                          : "bg-success/10 text-success"
                    )}
                  >
                    {statusText(tool)}
                  </span>
                  {hasDetails && (
                    expanded ? (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
                    )
                  )}
                </button>

                {expanded && (
                  <div className="mt-2 space-y-2 rounded-lg border border-border/25 bg-bg-base/30 p-2">
                    {tool.args && (
                      <div>
                        <div className="mb-1 text-[10px] font-medium text-text-tertiary">参数</div>
                        <pre className="max-h-28 overflow-auto whitespace-pre-wrap break-words rounded-md bg-bg-elevated/60 p-2 font-mono text-[10px] text-text-secondary">
                          {tool.args}
                        </pre>
                      </div>
                    )}
                    {tool.result && (
                      <div>
                        <div className="mb-1 text-[10px] font-medium text-text-tertiary">结果</div>
                        <pre className="max-h-36 overflow-auto whitespace-pre-wrap break-words rounded-md bg-bg-elevated/60 p-2 font-mono text-[10px] text-text-secondary">
                          {preview(tool.result)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
