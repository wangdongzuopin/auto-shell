import { cn } from "@/lib/utils";
import type { DiffEntry } from "@/stores/diffStore";

const opLabel: Record<DiffEntry["operation"], string> = {
  add: "A",
  modify: "M",
  delete: "D",
};

const opColor: Record<DiffEntry["operation"], string> = {
  add: "text-success border-success",
  modify: "text-warning border-warning",
  delete: "text-danger border-danger",
};

const opBg: Record<DiffEntry["operation"], string> = {
  add: "bg-success/10",
  modify: "bg-warning/10",
  delete: "bg-danger/10",
};

interface DiffCardProps {
  diff: DiffEntry;
}

export function DiffCard({ diff }: DiffCardProps) {
  const lines = diff.content.split("\n");

  return (
    <div className={cn(
      "rounded-xl border border-border/30 bg-bg-elevated/30 overflow-hidden",
      "transition-all hover:border-border/50"
    )}>
      <div className="flex items-center gap-2 px-3 py-2">
        <span className={cn(
          "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border",
          opColor[diff.operation], opBg[diff.operation]
        )}>
          {opLabel[diff.operation]}
        </span>
        <span className="text-[11px] text-text-primary font-mono truncate flex-1">
          {diff.path}
        </span>
      </div>
      <pre className={cn(
        "text-[10px] text-text-secondary font-mono leading-relaxed px-3 py-2",
        "max-h-24 overflow-hidden relative",
        "border-t border-border/20"
      )}>
        {lines.slice(0, 6).join("\n")}
        {lines.length > 6 && (
          <span className="text-text-tertiary/50">{"\n"}... {lines.length - 6} more lines</span>
        )}
      </pre>
    </div>
  );
}
