import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/stores/appStore";
import { useProjectStore, type Conversation } from "@/stores/projectStore";
import { cn } from "@/lib/utils";
import { GitPanel } from "@/components/project/GitPanel"
import { CheckpointPanel } from "@/components/project/CheckpointPanel"
import {
  Code2,
  PenSquare,
  Plus,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Folder,
  Trash2,
  FileText,
  FolderPlus,
  Settings2,
} from "lucide-react";

async function pickFolder(): Promise<{ name: string; path: string } | null> {
  try {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({ directory: true, multiple: false, title: "选择项目文件夹" });
    if (!selected) return null;
    const path = selected as string;
    const name = path.split(/[/\\]/).pop() || path;
    return { name, path };
  } catch {
    // Fallback: prompt for path
    const path = prompt("请输入项目路径：", "D:/projects/my-app");
    if (!path) return null;
    const name = path.split(/[/\\]/).pop() || path;
    return { name, path };
  }
}

function NewConversationPopup({
  projects,
  onSelect,
  onClose,
  t,
}: {
  projects: { id: string; name: string }[];
  onSelect: (projectId: string) => void;
  onClose: () => void;
  t: (key: string) => string;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute left-full top-0 z-50 ml-2 w-48 rounded-xl border border-border bg-glass-bg-strong shadow-xl p-1.5 animate-scale-in backdrop-blur-xl">
        <p className="text-[10px] text-text-tertiary px-2.5 py-1.5 uppercase tracking-wider font-medium">
          {t("sidebar.selectProject")}
        </p>
        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className="flex w-full items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover/40 transition-all duration-150"
          >
            <Folder className="h-3.5 w-3.5 text-text-tertiary" />
            <span className="truncate flex-1 text-left">{p.name}</span>
          </button>
        ))}
      </div>
    </>
  );
}

function ConversationItem({
  conv,
  isActive,
  onSelect,
  onDelete,
  accentColor,
}: {
  conv: Conversation;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  accentColor: string;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs cursor-pointer transition-all duration-150",
        isActive
          ? cn("bg-[var(--color-" + accentColor + "-soft)] text-[var(--color-" + accentColor + ")]")
          : "text-text-tertiary hover:text-text-secondary hover:bg-bg-hover/30"
      )}
      onClick={() => onSelect(conv.id)}
    >
      <FileText className="h-3 w-3 shrink-0" />
      <span className="truncate flex-1">{conv.title}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(conv.id);
        }}
        className="p-0.5 opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-danger transition-all duration-150"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

export function Sidebar() {
  const { t } = useTranslation();
  const { role, sidebarOpen, mainView, setMainView, requestRoleSwitch } = useAppStore();
  const {
    projects,
    conversations,
    currentProjectId,
    currentConversationId,
    expandedProjects,
    setCurrentProject,
    setCurrentConversation,
    toggleProjectExpanded,
    addConversation,
    removeProject,
    removeConversation,
    addProject,
    renameProject,
  } = useProjectStore();

  const isDev = role === "developer";
  const accent = isDev ? "accent-dev" : "accent-pm";
  const [showNewConvPopup, setShowNewConvPopup] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const handleImportProject = async () => {
    const result = await pickFolder();
    if (result) {
      const existing = projects.find((p) => p.path === result.path);
      if (existing) {
        setCurrentProject(existing.id);
        if (!expandedProjects[existing.id]) {
          toggleProjectExpanded(existing.id);
        }
      } else {
        addProject(result.name, result.path);
      }
    }
  };

  const handleNewConversation = () => {
    if (projects.length === 0) {
      // No projects — prompt to import first
      handleImportProject();
      return;
    }

    if (projects.length === 1) {
      // Only one project — auto-select
      addConversation(projects[0].id);
      return;
    }

    // Multiple projects — show selector popup
    setShowNewConvPopup(true);
  };

  const handleSelectProjectForConv = (projectId: string) => {
    setShowNewConvPopup(false);
    addConversation(projectId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const items = e.dataTransfer.items;
    if (!items) return;

    // Try to get folder path from dropped items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) {
          // webkitRelativePath or name for folder detection
          const path = (file as any).path || file.name;
          if (path) {
            const name = path.split(/[/\\]/).pop() || path;
            const existing = projects.find((p) => p.path === path);
            if (existing) {
              setCurrentProject(existing.id);
            } else {
              addProject(name, path);
            }
            return;
          }
        }
      }
    }
  };

  const handleStartRename = (projectId: string, currentName: string) => {
    setEditingProjectId(projectId);
    setEditName(currentName);
  };

  const handleCommitRename = () => {
    if (editingProjectId && editName.trim()) {
      renameProject(editingProjectId, editName.trim());
    }
    setEditingProjectId(null);
    setEditName("");
  };

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r border-border transition-all duration-300 ease-out",
        sidebarOpen ? "w-56" : "w-[52px]"
      )}
    >
      <div className="absolute inset-0 bg-glass-bg" />

      {/* Top: Import + New Conversation */}
      <div className="relative px-2 pt-3 pb-1">
        {sidebarOpen ? (
          <div className="flex items-center gap-1">
            <button
              onClick={handleImportProject}
              className="flex items-center gap-1.5 flex-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover/40 transition-all duration-150"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("sidebar.importProject")}
            </button>
            <div className="relative">
              <button
                onClick={handleNewConversation}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover/40 transition-all duration-150"
              >
                <FolderPlus className="h-3.5 w-3.5" />
                {t("sidebar.newConversation")}
              </button>
              {showNewConvPopup && (
                <NewConversationPopup
                  projects={projects}
                  onSelect={handleSelectProjectForConv}
                  onClose={() => setShowNewConvPopup(false)}
                  t={t}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={handleImportProject}
              className="flex items-center justify-center w-full py-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-hover/40 transition-all duration-150"
              title={t("sidebar.importProject")}
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              onClick={handleNewConversation}
              className="flex items-center justify-center w-full py-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-hover/40 transition-all duration-150"
              title={t("sidebar.newConversation")}
            >
              <FolderPlus className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Project Tree */}
      <div
        className="relative flex-1 overflow-y-auto px-2 pb-2"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {dragOver && (
          <div className="absolute inset-2 z-30 rounded-xl border-2 border-dashed border-accent-dev/40 bg-accent-dev/5 flex items-center justify-center pointer-events-none">
            <span className="text-xs font-medium text-accent-dev">{t("sidebar.dropToImport")}</span>
          </div>
        )}
        {projects.length === 0 ? (
          <div className="px-2.5 py-8 text-center">
            <p className="text-[10px] text-text-tertiary">{t("common.noResults")}</p>
            {sidebarOpen && (
              <p className="text-[10px] text-text-tertiary">{t("sidebar.dragHint")}</p>
            )}
          </div>
        ) : (
          <div className="space-y-0.5">
            {projects.map((project) => {
              const projectConversations = conversations.filter(
                (c) => c.projectId === project.id
              );
              const isExpanded = expandedProjects[project.id] ?? true;

              return (
                <div key={project.id}>
                  {/* Project folder */}
                  <div
                    className={cn(
                      "group flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all duration-150",
                      currentProjectId === project.id && !currentConversationId
                        ? cn("bg-[var(--color-" + accent + "-soft)] text-[var(--color-" + accent + ")]")
                        : "text-text-secondary hover:text-text-primary hover:bg-bg-hover/40"
                    )}
                    onClick={() => {
                      setCurrentProject(project.id);
                      toggleProjectExpanded(project.id);
                      setMainView("chat");
                    }}
                  >
                    {sidebarOpen && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeProject(project.id);
                        }}
                        className="p-0.5 opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-danger transition-all duration-150 shrink-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                    <span className="shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3 text-text-tertiary" />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-text-tertiary" />
                      )}
                    </span>
                    {isExpanded ? (
                      <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <Folder className="h-3.5 w-3.5 shrink-0" />
                    )}
                    {sidebarOpen && (
                      <>
                        {editingProjectId === project.id ? (
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onBlur={handleCommitRename}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleCommitRename();
                              if (e.key === "Escape") {
                                setEditingProjectId(null);
                                setEditName("");
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 min-w-0 px-1 py-0.5 text-xs rounded border border-accent-dev/40 bg-bg-base focus:outline-none focus:ring-1 focus:ring-accent-dev/20"
                            autoFocus
                          />
                        ) : (
                          <span
                            className="truncate flex-1"
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              handleStartRename(project.id, project.name);
                            }}
                            title={t("sidebar.renameHint")}
                          >
                            {project.name}
                          </span>
                        )}
                        <span className="text-[9px] text-text-tertiary/50 font-mono">
                          {projectConversations.length}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentProject(project.id);
                            if (!expandedProjects[project.id]) {
                              toggleProjectExpanded(project.id);
                            }
                            addConversation(project.id);
                          }}
                          className="p-0.5 opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-accent-dev transition-all duration-150 shrink-0"
                          title={t("sidebar.newConversation")}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Conversations */}
                  {isExpanded && sidebarOpen && (
                    <div className="ml-3 pl-2.5 border-l border-border/40 space-y-0.5 mt-0.5">
                      {projectConversations.length === 0 ? (
                        <p className="text-[10px] text-text-tertiary px-2 py-1.5 italic">
                          {t("chat.noMessages")}
                        </p>
                      ) : (
                        projectConversations.map((conv) => (
                          <ConversationItem
                            key={conv.id}
                            conv={conv}
                            isActive={currentConversationId === conv.id}
                            onSelect={(id) => {
                              setCurrentConversation(id);
                              setMainView("chat");
                            }}
                            onDelete={removeConversation}
                            accentColor={accent}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Git panel */}
      <GitPanel collapsed={!sidebarOpen} />

      {/* Checkpoint panel */}
      <CheckpointPanel collapsed={!sidebarOpen} />

      {/* Bottom: Role + Settings */}
      <div className="relative p-2 border-t border-border space-y-1">
        {/* Role switcher */}
        <button
          onClick={requestRoleSwitch}
          className={cn(
            "relative flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-300",
            sidebarOpen ? "justify-start" : "justify-center",
            isDev
              ? "bg-accent-dev-soft text-accent-dev"
              : "bg-accent-pm-soft text-accent-pm"
          )}
        >
          {isDev ? <Code2 className="h-4 w-4 shrink-0" /> : <PenSquare className="h-4 w-4 shrink-0" />}
          {sidebarOpen && (
            <>
              <span className="truncate text-xs">{isDev ? t("sidebar.roleDev") : t("sidebar.rolePm")}</span>
              <span
                className={cn(
                  "ml-auto text-[9px] px-1.5 py-0.5 rounded font-mono font-medium tracking-wider uppercase",
                  isDev ? "bg-accent-dev/20 text-accent-dev" : "bg-accent-pm/20 text-accent-pm"
                )}
              >
                {isDev ? "Dev" : "PM"}
              </span>
            </>
          )}
        </button>

        {/* Settings button */}
        <button
          onClick={() => setMainView(mainView === "settings" ? "chat" : "settings")}
          className={cn(
            "flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 w-full",
            sidebarOpen ? "justify-start" : "justify-center",
            mainView === "settings"
              ? "bg-accent-dev-soft text-accent-dev"
              : "text-text-tertiary hover:text-text-primary hover:bg-bg-hover/40"
          )}
          title={t("sidebar.settings")}
        >
          <Settings2 className="h-3.5 w-3.5 shrink-0" />
          {sidebarOpen && <span>{t("sidebar.settings")}</span>}
        </button>
      </div>
    </aside>
  );
}
