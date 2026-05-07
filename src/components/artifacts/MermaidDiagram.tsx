import { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Download, Maximize2, Minimize2, Copy, Check } from "lucide-react";

let mermaidModule: typeof import("mermaid").default | null = null;
let mermaidInit = false;

async function getMermaid() {
  if (!mermaidModule) {
    const mod = await import("mermaid");
    mermaidModule = mod.default;
  }
  if (!mermaidInit) {
    mermaidModule.initialize({
      startOnLoad: false,
      theme: "dark",
      securityLevel: "loose",
      fontFamily: "Inter, sans-serif",
      themeVariables: {
        primaryColor: "#3b82f6",
        primaryTextColor: "#e2e8f0",
        primaryBorderColor: "#475569",
        lineColor: "#64748b",
        secondaryColor: "#1e293b",
        tertiaryColor: "#0f172a",
      },
    });
    mermaidInit = true;
  }
  return mermaidModule;
}

interface MermaidDiagramProps {
  code: string;
  className?: string;
}

export function MermaidDiagram({ code, className }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const idRef = useRef(`mermaid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`);

  useEffect(() => {
    let cancelled = false;
    setError("");
    setSvg("");

    getMermaid()
      .then((mermaid) => mermaid.render(idRef.current, code))
      .then(({ svg: rendered }) => {
        if (!cancelled) setSvg(rendered);
      })
      .catch((err) => {
        if (!cancelled) setError(`流程图渲染失败: ${err.message || "语法错误"}`);
      });

    return () => { cancelled = true; };
  }, [code]);

  const downloadPNG = useCallback(() => {
    if (!svg) return;
    const canvas = document.createElement("canvas");
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svg, "image/svg+xml");
    const svgEl = svgDoc.documentElement;
    const bbox = svgEl.getBoundingClientRect();
    const w = bbox.width || 1200;
    const h = bbox.height || 800;
    canvas.width = w * 2;
    canvas.height = h * 2;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(2, 2);

    const img = new Image();
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      const link = document.createElement("a");
      link.download = `flowchart-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [svg]);

  const downloadSVG = useCallback(() => {
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `flowchart-${Date.now()}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }, [svg]);

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  if (error && !code) {
    return (
      <div className={cn("rounded-xl border border-danger/30 bg-danger/5 p-3", className)}>
        <p className="text-xs text-danger">{error}</p>
      </div>
    );
  }

  if (error) {
    // During streaming, mermaid may fail on incomplete syntax — show a subtle loading state instead
    return (
      <div className={cn("group relative my-3 rounded-xl border border-border/50 bg-bg-elevated/30 overflow-hidden", className)}>
        <div className="flex items-center px-3 py-1.5 border-b border-border/30 bg-bg-elevated/50">
          <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">流程图</span>
        </div>
        <div className="flex items-center justify-center p-4 min-h-[120px]">
          <div className="flex items-center gap-2 text-text-tertiary">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-pm/60 animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-accent-pm/60 animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-accent-pm/60 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("group relative my-3 rounded-xl border border-border/50 bg-bg-elevated/30 overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/30 bg-bg-elevated/50">
        <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">
          流程图
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={copyCode}
            className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-hover/40 transition-colors"
            title="复制代码"
          >
            {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
          </button>
          <button
            onClick={downloadSVG}
            className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-hover/40 transition-colors"
            title="下载 SVG"
          >
            <Download className="h-3 w-3" />
          </button>
          <button
            onClick={downloadPNG}
            className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-hover/40 transition-colors"
            title="下载 PNG"
          >
            <span className="text-[9px] font-medium">PNG</span>
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-hover/40 transition-colors"
            title={expanded ? "收起" : "放大"}
          >
            {expanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* Diagram */}
      <div
        className={cn(
          "flex items-center justify-center p-4 transition-all duration-300",
          expanded ? "min-h-[500px]" : "min-h-[200px]"
        )}
      >
        <div
          ref={containerRef}
          className="w-full overflow-x-auto flex justify-center"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    </div>
  );
}
