import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Download, Maximize2, Minimize2, Copy, Check, Eye, Code2, Smartphone, Monitor, Camera } from "lucide-react";

interface PrototypePreviewProps {
  code: string;
  className?: string;
}

type ViewMode = "preview" | "code";
type DeviceSize = "desktop" | "mobile";

export function PrototypePreview({ code, className }: PrototypePreviewProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [device, setDevice] = useState<DeviceSize>("desktop");
  const [copied, setCopied] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Build a self-contained HTML document for the iframe
  const buildPreviewDoc = useCallback(() => {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"><\/script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
      background: #f8fafc;
      color: #0f172a;
      padding: 20px;
    }
    .dark body { background: #0f172a; color: #f1f5f9; }
  </style>
</head>
<body>${code}</body>
</html>`;
  }, [code]);

  const isIncomplete = !/<\/html>/i.test(code) && !/<\/body>/i.test(code);

  useEffect(() => {
    if (iframeRef.current && viewMode === "preview") {
      // Use srcdoc for smoother streaming updates (no blob flicker)
      iframeRef.current.srcdoc = buildPreviewDoc();
    }
  }, [code, viewMode, buildPreviewDoc]);

  const downloadHTML = useCallback(() => {
    const fullDoc = buildPreviewDoc();
    const blob = new Blob([fullDoc], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `prototype-${Date.now()}.html`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }, [buildPreviewDoc]);

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  const downloadPNG = useCallback(() => {
    if (!iframeRef.current) return;
    const iframe = iframeRef.current;
    const body = iframe.contentDocument?.body;
    if (!body) return;

    setCapturing(true);
    const html = body.innerHTML;
    const rect = body.getBoundingClientRect();
    const w = rect.width || 1200;
    const h = rect.height || 800;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml">
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; background: #f8fafc; color: #0f172a; }
          </style>
          ${html}
        </div>
      </foreignObject>
    </svg>`;

    const canvas = document.createElement("canvas");
    canvas.width = w * 2;
    canvas.height = h * 2;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(2, 2);

    const img = new Image();
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      const link = document.createElement("a");
      link.download = `prototype-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      URL.revokeObjectURL(url);
      setCapturing(false);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setCapturing(false);
    };
    img.src = url;
  }, []);

  return (
    <div className={cn("group relative my-3 rounded-xl border border-border/50 bg-bg-elevated/30 overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/30 bg-bg-elevated/50">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">
            {t("artifacts.prototype")}
          </span>
          {isIncomplete && (
            <span className="text-[10px] text-accent-pm animate-pulse">{t("artifacts.generating")}</span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {/* View mode toggle */}
          <div className="flex items-center gap-0 bg-bg-hover/40 rounded-md mr-1">
            <button
              onClick={() => setViewMode("preview")}
              className={cn(
                "p-1 rounded-l-md transition-colors",
                viewMode === "preview" ? "bg-accent-dev/20 text-accent-dev" : "text-text-tertiary hover:text-text-primary"
              )}
              title={t("artifacts.preview")}
            >
              <Eye className="h-3 w-3" />
            </button>
            <button
              onClick={() => setViewMode("code")}
              className={cn(
                "p-1 rounded-r-md transition-colors",
                viewMode === "code" ? "bg-accent-dev/20 text-accent-dev" : "text-text-tertiary hover:text-text-primary"
              )}
              title={t("artifacts.code")}
            >
              <Code2 className="h-3 w-3" />
            </button>
          </div>

          {/* Device toggle */}
          <div className="flex items-center gap-0 bg-bg-hover/40 rounded-md mr-1">
            <button
              onClick={() => setDevice("desktop")}
              className={cn(
                "p-1 rounded-l-md transition-colors",
                device === "desktop" ? "bg-accent-pm/20 text-accent-pm" : "text-text-tertiary hover:text-text-primary"
              )}
              title={t("artifacts.desktop")}
            >
              <Monitor className="h-3 w-3" />
            </button>
            <button
              onClick={() => setDevice("mobile")}
              className={cn(
                "p-1 rounded-r-md transition-colors",
                device === "mobile" ? "bg-accent-pm/20 text-accent-pm" : "text-text-tertiary hover:text-text-primary"
              )}
              title={t("artifacts.mobile")}
            >
              <Smartphone className="h-3 w-3" />
            </button>
          </div>

          <button
            onClick={copyCode}
            className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-hover/40 transition-colors"
            title={t("artifacts.copyCode")}
          >
            {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
          </button>
          <button
            onClick={downloadHTML}
            className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-hover/40 transition-colors"
            title={t("artifacts.downloadHTML")}
          >
            <Download className="h-3 w-3" />
          </button>
          <button
            onClick={downloadPNG}
            disabled={capturing}
            className={cn(
              "p-1 rounded transition-colors",
              capturing
                ? "text-text-tertiary/50 cursor-wait"
                : "text-text-tertiary hover:text-text-primary hover:bg-bg-hover/40"
            )}
            title={t("artifacts.screenshotPNG")}
          >
            <Camera className="h-3 w-3" />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-hover/40 transition-colors"
            title={expanded ? t("artifacts.collapse") : t("artifacts.expand")}
          >
            {expanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={cn(
        "transition-all duration-300",
        expanded ? "min-h-[600px]" : "min-h-[300px]"
      )}>
        {viewMode === "preview" ? (
          <div className={cn(
            "flex justify-center p-4",
            device === "mobile" && "items-start"
          )}>
            <div
              className={cn(
                "overflow-hidden border border-border/30 rounded-lg bg-white shadow-sm transition-all",
                device === "mobile" ? "w-[375px] max-w-full" : "w-full"
              )}
              style={device === "mobile" ? { aspectRatio: "375/812" } : undefined}
            >
              <iframe
                ref={iframeRef}
                className="w-full h-full border-0"
                style={{ minHeight: device === "mobile" ? "100%" : expanded ? "560px" : "260px" }}
                sandbox="allow-scripts allow-same-origin"
                title={t("artifacts.prototype")}
              />
            </div>
          </div>
        ) : (
          <pre className="p-4 text-[11px] font-mono text-text-secondary leading-relaxed overflow-x-auto max-h-[500px] select-text">
            <code>{code}</code>
          </pre>
        )}
      </div>
    </div>
  );
}
