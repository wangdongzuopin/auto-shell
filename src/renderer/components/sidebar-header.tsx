import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useChatStore } from "@/stores/chatStore";
import { useNavigate } from "react-router-dom";

export function SidebarHeader() {
  const [query, setQuery] = useState("");
  const createThread = useChatStore((s) => s.createThread);
  const navigate = useNavigate();

  const handleNewThread = () => {
    const thread = createThread();
    navigate(`/chat/${thread.id}`);
  };

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search threads..."
            className="pl-6 h-7 text-[11px]"
          />
        </div>
        <Button variant="ghost" size="icon" onClick={handleNewThread} title="New thread">
          <Plus size={14} />
        </Button>
      </div>
    </div>
  );
}
