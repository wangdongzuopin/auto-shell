import { useMemo, useState } from "react";
import { ChevronRight, Folder, FolderOpen } from "lucide-react";
import { DndContext, closestCorners, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { useChatStore } from "@/stores/chatStore";
import { useProjectStore } from "@/stores/projectStore";
import { ThreadItem } from "./thread-item";

export function ProjectGroupList() {
  const threads = useChatStore((s) => s.threads);
  const sessionStatus = useChatStore((s) => s.sessionStatus);
  const sessionProject = useChatStore((s) => s.sessionProject);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const projects = useProjectStore((s) => s.projects);
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Group threads: project threads first, then unassigned
  const { projectThreads, unassignedThreads } = useMemo(() => {
    const projectThreads: Record<string, typeof threads> = {};
    const unassigned: typeof threads = [];

    for (const t of threads) {
      const pid = sessionProject[t.id];
      if (pid) {
        if (!projectThreads[pid]) projectThreads[pid] = [];
        projectThreads[pid].push(t);
      } else {
        unassigned.push(t);
      }
    }
    return { projectThreads, unassignedThreads: unassigned };
  }, [threads, sessionProject]);

  // Filter by active project
  const activeProject = activeProjectId ? projects.find((p) => p.id === activeProjectId) : null;

  const toggleCollapse = (id: string) => {
    setCollapsedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    // Drag reorder will be implemented later
  };

  const threadIds = threads.map((t) => t.id);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis]}>
      <SortableContext items={threadIds} strategy={verticalListSortingStrategy}>
        <div className="px-2 space-y-1">
          {/* Active project group */}
          {activeProject && projectThreads[activeProject.id] && (
            <div className="mb-2">
              <button
                className="flex items-center gap-1.5 w-full px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => toggleCollapse(activeProject.id)}
              >
                {collapsedProjects.has(activeProject.id) ? (
                  <ChevronRight size={10} />
                ) : (
                  <ChevronRight size={10} className="rotate-90" />
                )}
                {collapsedProjects.has(activeProject.id) ? (
                  <Folder size={12} />
                ) : (
                  <FolderOpen size={12} />
                )}
                <span className="truncate">{activeProject.name}</span>
              </button>
              {!collapsedProjects.has(activeProject.id) && (
                <div className="space-y-0.5">
                  {projectThreads[activeProject.id].map((thread) => (
                    <ThreadItem
                      key={thread.id}
                      thread={thread}
                      status={sessionStatus[thread.id]}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Unassigned threads */}
          {unassignedThreads.map((thread) => (
            <ThreadItem
              key={thread.id}
              thread={thread}
              status={sessionStatus[thread.id]}
            />
          ))}

          {/* Empty state */}
          {threads.length === 0 && (
            <p className="text-[11px] text-muted-foreground text-center py-8">
              No conversations yet
            </p>
          )}
        </div>
      </SortableContext>
    </DndContext>
  );
}
