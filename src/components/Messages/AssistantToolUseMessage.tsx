// src/components/messages/AssistantToolUseMessage.tsx

import React from 'react'
import type { ToolUseBlock } from '../../types/message'
import './messages.css'

interface AssistantToolUseMessageProps {
  toolUse: ToolUseBlock
  onApprove?: (id: string) => void
  onDeny?: (id: string) => void
}

export const AssistantToolUseMessage: React.FC<AssistantToolUseMessageProps> = ({
  toolUse,
  onApprove,
  onDeny,
}) => {
  return (
    <div className="message-bubble tool-use">
      <div className="tool-use-header">
        <span className="tool-use-icon">⚡</span>
        <span className="tool-use-name">{toolUse.name}</span>
      </div>
      <div className="tool-use-content">
        <pre>{JSON.stringify(toolUse.input, null, 2)}</pre>
      </div>
      <div className="tool-use-actions">
        <button className="tool-use-approve" onClick={() => onApprove?.(toolUse.id)}>
          允许
        </button>
        <button className="tool-use-deny" onClick={() => onDeny?.(toolUse.id)}>
          拒绝
        </button>
      </div>
    </div>
  )
}
