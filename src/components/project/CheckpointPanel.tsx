import { useEffect } from 'react'
import { useProjectStore } from '@/stores/projectStore'
import { useCheckpointStore } from '@/stores/checkpointStore'
import { cn } from '@/lib/utils'
import { Undo2, Loader2, FileText } from 'lucide-react'

export function CheckpointPanel({ collapsed }: { collapsed: boolean }) {
  const currentConversationId = useProjectStore((s) => s.currentConversationId)
  const { checkpoints, loading, error, loadCheckpoints, undoLastEdit } = useCheckpointStore()

  useEffect(() => {
    if (currentConversationId) {
      loadCheckpoints(currentConversationId)
    }
  }, [currentConversationId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!currentConversationId || collapsed) return null
  if (error) return null
  if (checkpoints.length === 0 && !loading) return null

  return (
    <div className="relative px-2 py-1.5 border-t border-border/40">
      {loading ? (
        <div className="flex items-center gap-2 px-2 py-2 text-xs text-text-tertiary">
          <Loader2 className="h-3 w-3 animate-spin" />
        </div>
      ) : (
        <div className="space-y-0.5">
          <p className="text-[10px] text-text-tertiary px-2 py-0.5 uppercase tracking-wider font-medium">
            Recent edits
          </p>
          {checkpoints.slice(0, 10).map((cp) => (
            <div
              key={cp.id}
              className="group flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px]"
            >
              <FileText className="h-2.5 w-2.5 text-text-tertiary shrink-0" />
              <span className="text-text-secondary truncate flex-1 font-mono">
                {cp.file_path.split(/[/\\]/).pop()}
              </span>
              <button
                onClick={() => undoLastEdit(cp.file_path, currentConversationId)}
                className={cn(
                  'p-0.5 rounded opacity-0 group-hover:opacity-100',
                  'text-text-tertiary hover:text-accent-dev transition-all'
                )}
                title={`Restore ${cp.file_path}`}
              >
                <Undo2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
