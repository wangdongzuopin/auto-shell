// Stub types for permissions - to be implemented
export type ToolPermissionContext = {
  mode: 'default'
  allowedCommands: string[]
  deniedCommands: string[]
}

export type PermissionMode =
  | 'acceptEdits'
  | 'bypassPermissions'
  | 'default'
  | 'dontAsk'
  | 'plan'
