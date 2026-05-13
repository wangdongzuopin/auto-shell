import { useEffect } from 'react'
import { useProjectStore } from '@/stores/projectStore'
import { useGitStore } from '@/stores/gitStore'
import { cn } from '@/lib/utils'
import { GitBranch, GitCommit, FileText, Loader2, Check } from 'lucide-react'

export function GitPanel({ collapsed }: { collapsed: boolean }) {
  const currentProjectId = useProjectStore((s) => s.currentProjectId)
  const projects = useProjectStore((s) => s.projects)
  const { status, loading, error, loadStatus, clear } = useGitStore()

  const currentProject = projects.find((p) => p.id === currentProjectId)

  useEffect(() => {
    if (currentProject) {
      loadStatus(currentProject.path)
    } else {
      clear()
    }
  }, [currentProject?.path]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!currentProject || collapsed) return null
  if (error) return null
  if (!status && !loading) return null

  return (
    <div className="relative px-2 py-1.5 border-t border-border/40">
      {loading ? (
        <div className="flex items-center gap-2 px-2 py-2 text-xs text-text-tertiary">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Loading git...</span>
        </div>
      ) : status ? (
        <div className="space-y-1.5">
          {/* Branch */}
          <div className="flex items-center gap-1.5 px-2 py-0.5">
            <GitBranch className="h-3 w-3 text-accent-dev shrink-0" />
            <span className="text-[11px] font-mono font-medium text-text-secondary truncate">
              {status.branch}
            </span>
            {status.clean ? (
              <Check className="h-3 w-3 text-green-400 shrink-0 ml-auto" />
            ) : (
              <span className="text-[9px] text-text-tertiary ml-auto">
                {status.ahead > 0 && `+${status.ahead}`}
                {status.behind > 0 && `-${status.behind}`}
              </span>
            )}
          </div>

          {/* Changed files */}
          {!status.clean && status.files.length > 0 && (
            <div className="space-y-0.5">
              {status.files.slice(0, 5).map((f, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-center gap-1.5 pl-5 pr-2 py-0.5 text-[10px] font-mono truncate',
                    f.staged ? 'text-green-400' : 'text-text-tertiary'
                  )}
                >
                  <span className="text-[9px] w-5 shrink-0 font-medium text-text-tertiary/60">
                    {f.status}
                  </span>
                  <span className="truncate">{f.path}</span>
                </div>
              ))}
              {status.files.length > 5 && (
                <p className="text-[9px] text-text-tertiary pl-5">
                  +{status.files.length - 5} more
                </p>
              )}
            </div>
          )}

          {/* Recent commits */}
          {status.recent_commits.length > 0 && (
            <details className="group">
              <summary className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-text-tertiary cursor-pointer hover:text-text-secondary">
                <GitCommit className="h-2.5 w-2.5 shrink-0" />
                <span>Recent commits</span>
              </summary>
              <div className="space-y-0.5 mt-0.5">
                {status.recent_commits.slice(0, 3).map((c, i) => (
                  <div key={i} className="pl-5 pr-2 py-0.5">
                    <p className="text-[10px] text-text-secondary truncate">{c.message}</p>
                    <p className="text-[9px] text-text-tertiary/60">
                      {c.hash} · {c.author}
                    </p>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      ) : null}
    </div>
  )
}
