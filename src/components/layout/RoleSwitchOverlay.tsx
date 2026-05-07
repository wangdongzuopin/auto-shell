import { useState, useEffect, useRef } from "react";
import { useAppStore } from "@/stores/appStore";
import { cn } from "@/lib/utils";
import { Code2, PenSquare } from "lucide-react";

export function RoleSwitchOverlay() {
  const { pendingRole, isTransitioning, confirmRoleSwitch, cancelRoleSwitch } =
    useAppStore();
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"dialog" | "progress" | "done">("dialog");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isTransitioning) {
      setPhase("progress");
      setProgress(0);
      const duration = 1200;
      const interval = 30;
      const step = (interval / duration) * 100;

      timerRef.current = setInterval(() => {
        setProgress((prev) => {
          const next = prev + step;
          if (next >= 100) {
            if (timerRef.current) clearInterval(timerRef.current);
            setTimeout(() => {
              setPhase("done");
              useAppStore.getState().setMainView("chat");
              setTimeout(() => {
                useAppStore.setState({
                  pendingRole: null,
                  isTransitioning: false,
                });
                setProgress(0);
                setPhase("dialog");
              }, 200);
            }, 150);
            return 100;
          }
          return next;
        });
      }, interval);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [isTransitioning]);

  if (!pendingRole && !isTransitioning && phase === "dialog") return null;

  const isDev = pendingRole === "developer";

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Dialog phase */}
      {phase === "dialog" && (
        <div className="relative glass-strong rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-scale-in">
          <div className="flex items-center justify-center mb-4">
            <div
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-2xl",
                isDev ? "bg-accent-dev/10 text-accent-dev" : "bg-accent-pm/10 text-accent-pm"
              )}
            >
              {isDev ? (
                <Code2 className="h-7 w-7" />
              ) : (
                <PenSquare className="h-7 w-7" />
              )}
            </div>
          </div>
          <h3 className="text-base font-semibold text-text-primary text-center mb-1.5">
            切换角色
          </h3>
          <p className="text-sm text-text-secondary text-center mb-5">
            确定要切换到{isDev ? "「开发者」" : "「产品经理」"}模式吗？
            {isDev
              ? " 开发者模式提供代码分析、编辑和架构工具。"
              : " 产品模式提供原型设计、流程图和需求分析工具。"}
          </p>
          <div className="flex items-center gap-2.5">
            <button
              onClick={cancelRoleSwitch}
              className="flex-1 px-4 py-2 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover/40 border border-border/50 transition-all duration-200"
            >
              取消
            </button>
            <button
              onClick={confirmRoleSwitch}
              className={cn(
                "flex-1 px-4 py-2 rounded-lg text-xs font-medium text-white transition-all duration-200",
                isDev ? "bg-accent-dev hover:brightness-110" : "bg-accent-pm hover:brightness-110"
              )}
            >
              确认切换
            </button>
          </div>
        </div>
      )}

      {/* Progress phase */}
      {phase === "progress" && (
        <div className="relative glass-strong rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl animate-scale-in">
          <div className="flex items-center justify-center mb-5">
            <div
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-2xl animate-pulse",
                isDev ? "bg-accent-dev/10 text-accent-dev" : "bg-accent-pm/10 text-accent-pm"
              )}
            >
              {isDev ? (
                <Code2 className="h-7 w-7" />
              ) : (
                <PenSquare className="h-7 w-7" />
              )}
            </div>
          </div>
          <p className="text-sm font-medium text-text-primary text-center mb-4">
            正在切换到{isDev ? "开发者" : "产品经理"}模式...
          </p>
          <div className="relative h-1.5 rounded-full bg-bg-elevated overflow-hidden">
            <div
              className={cn(
                "absolute inset-y-0 left-0 rounded-full transition-all duration-100 ease-linear",
                isDev ? "bg-accent-dev" : "bg-accent-pm"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-[10px] text-text-tertiary text-center">
            正在加载{isDev ? "开发" : "产品"}工具...
          </p>
        </div>
      )}
    </div>
  );
}
