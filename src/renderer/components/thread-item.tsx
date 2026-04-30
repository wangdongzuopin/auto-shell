import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useNavigate } from "react-router-dom";
import { useChatStore, type SessionStatus } from "@/stores/chatStore";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThreadItemProps {
  thread: { id: string; title: string; createdAt: number };
  status?: SessionStatus;
}

export function ThreadItem({ thread, status }: ThreadItemProps) {
  const navigate = useNavigate();
  const currentThreadId = useChatStore((s) => s.currentThreadId);
  const setCurrentThread = useChatStore((s) => s.setCurrentThread);
  const deleteThread = useChatStore((s) => s.deleteThread);
  const isActive = currentThreadId === thread.id;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: thread.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const statusColor =
    status === "running" ? "bg-accent" :
    status === "error" ? "bg-destructive" :
    status === "completed" ? "bg-info" : "bg-transparent";

  const handleClick = () => {
    setCurrentThread(thread.id);
    navigate(`/chat/${thread.id}`);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors text-[12px]",
        isActive ? "bg-white/10 text-foreground" : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
        isDragging && "opacity-50 bg-white/5"
      )}
      onClick={handleClick}
      {...attributes}
      {...listeners}
    >
      {/* Drag handle + avatar */}
      <div className="relative shrink-0">
        <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center text-[10px] font-bold text-muted-foreground">
          {thread.title.charAt(0).toUpperCase()}
        </div>
        {status && (
          <span className={cn("absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-sidebar", statusColor)} />
        )}
      </div>

      {/* Title */}
      <span className="flex-1 truncate">{thread.title}</span>

      {/* Delete button (shown on hover) */}
      <button
        className="shrink-0 opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
        onClick={(e) => {
          e.stopPropagation();
          deleteThread(thread.id);
        }}
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}
