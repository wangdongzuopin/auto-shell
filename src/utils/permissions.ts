// src/utils/permissions.ts

import type { PermissionMode } from '../types/message'

// Re-export PermissionMode for convenience
export type { PermissionMode }

export type ToolPermissionContext = {
  mode: PermissionMode
  allowedCommands: string[]
  deniedCommands: string[]
}

export function getEmptyToolPermissionContext(): ToolPermissionContext {
  return {
    mode: 'default',
    allowedCommands: [],
    deniedCommands: [],
  }
}

export type PermissionResult = {
  behavior: 'allow' | 'deny' | 'ask'
  updatedInput?: unknown
}

export async function hasPermissionsToUseTool(
  toolName: string,
  input: unknown,
  context: ToolPermissionContext
): Promise<PermissionResult> {
  // Check always-allow rules
  if (context.allowedCommands.includes(toolName)) {
    return { behavior: 'allow' }
  }

  // Check always-deny rules
  if (context.deniedCommands.includes(toolName)) {
    return { behavior: 'deny' }
  }

  // Apply mode-specific transformations
  switch (context.mode) {
    case 'bypassPermissions':
      return { behavior: 'allow' }
    case 'dontAsk':
      return { behavior: 'deny' }
    case 'acceptEdits':
      // Auto-allow file edits
      if (toolName === 'Write' || toolName === 'Edit' || toolName === 'Bash') {
        return { behavior: 'allow' }
      }
      return { behavior: 'ask' }
    case 'plan':
      // In plan mode, ask for confirmation
      return { behavior: 'ask' }
    default:
      return { behavior: 'ask' }
  }
}
