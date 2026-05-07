import { useState, useEffect, useCallback } from "react"
import { useAppStore } from "@/stores/appStore"
import { useProjectStore } from "@/stores/projectStore"
import { useUIStore } from "@/stores/uiStore"
import { Command, CommandInput, CommandList, CommandGroup, CommandItem, CommandShortcut } from "@/components/ui/command"
import {
  FolderOpen,
  MessageSquare,
  Plus,
  Settings,
  PanelRight,
  Terminal,
  Sun,
  Moon,
  Code2,
  PenSquare,
} from "lucide-react"

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore()
  const { role, theme, toggleTheme, setMainView } = useAppStore()
  const { projects, conversations, setCurrentProject, setCurrentConversation, addConversation } = useProjectStore()
  const [query, setQuery] = useState("")

  // Ctrl+K toggle
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        setCommandPaletteOpen(!commandPaletteOpen)
      }
      if (e.key === "Escape" && commandPaletteOpen) {
        setCommandPaletteOpen(false)
      }
    },
    [commandPaletteOpen, setCommandPaletteOpen]
  )

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    if (!commandPaletteOpen) setQuery("")
  }, [commandPaletteOpen])

  if (!commandPaletteOpen) return null

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  )

  const filteredConvs = conversations.filter((c) => {
    const project = projects.find((p) => p.id === c.projectId)
    return (
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      (project?.name?.toLowerCase() || "").includes(query.toLowerCase())
    )
  })

  const isDev = role === "developer"

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={() => setCommandPaletteOpen(false)}
      />
      <div className="relative z-10 w-[480px] animate-scale-in">
        <Command>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="搜索项目、对话、或执行操作..."
          />
          <CommandList>
            <CommandGroup heading="导航">
              {filteredProjects.slice(0, 5).map((p) => (
                <CommandItem
                  key={p.id}
                  onSelect={() => {
                    setCurrentProject(p.id)
                    setCommandPaletteOpen(false)
                  }}
                >
                  <FolderOpen className="h-4 w-4 text-text-tertiary" />
                  <span>{p.name}</span>
                  <span className="ml-auto text-[10px] text-text-tertiary truncate max-w-[120px]">{p.path}</span>
                </CommandItem>
              ))}
              {filteredConvs.slice(0, 5).map((c) => {
                const project = projects.find((p) => p.id === c.projectId)
                return (
                  <CommandItem
                    key={c.id}
                    onSelect={() => {
                      setCurrentProject(c.projectId)
                      setCurrentConversation(c.id)
                      setCommandPaletteOpen(false)
                    }}
                  >
                    <MessageSquare className="h-4 w-4 text-text-tertiary" />
                    <span>{c.title}</span>
                    <span className="ml-auto text-[10px] text-text-tertiary">{project?.name}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>

            <CommandGroup heading="操作">
              <CommandItem
                onSelect={async () => {
                  if (projects.length > 0) {
                    await addConversation(projects[0].id)
                  }
                  setCommandPaletteOpen(false)
                }}
              >
                <Plus className="h-4 w-4 text-text-tertiary" />
                <span>新建对话</span>
                <CommandShortcut>Ctrl+N</CommandShortcut>
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  useUIStore.getState().toggleRightPanel()
                  setCommandPaletteOpen(false)
                }}
              >
                <PanelRight className="h-4 w-4 text-text-tertiary" />
                <span>切换右侧面板</span>
                <CommandShortcut>Ctrl+Shift+P</CommandShortcut>
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  useUIStore.getState().toggleTerminal()
                  setCommandPaletteOpen(false)
                }}
              >
                <Terminal className="h-4 w-4 text-text-tertiary" />
                <span>切换终端</span>
                <CommandShortcut>Ctrl+`</CommandShortcut>
              </CommandItem>
            </CommandGroup>

            <CommandGroup heading="视图">
              <CommandItem
                onSelect={() => {
                  toggleTheme()
                  setCommandPaletteOpen(false)
                }}
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4 text-text-tertiary" />
                ) : (
                  <Moon className="h-4 w-4 text-text-tertiary" />
                )}
                <span>切换主题</span>
                <CommandShortcut>Ctrl+T</CommandShortcut>
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setMainView("settings")
                  setCommandPaletteOpen(false)
                }}
              >
                <Settings className="h-4 w-4 text-text-tertiary" />
                <span>打开设置</span>
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  useAppStore.getState().toggleRole()
                  setCommandPaletteOpen(false)
                }}
              >
                {isDev ? (
                  <PenSquare className="h-4 w-4 text-text-tertiary" />
                ) : (
                  <Code2 className="h-4 w-4 text-text-tertiary" />
                )}
                <span>切换角色: {isDev ? "产品" : "开发者"}</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </div>
    </div>
  )
}
