// src/components/messages/UserToolResultMessage.tsx

import React from 'react'
import type { ToolResultBlock } from '../../types/message'
import './messages.css'

interface UserToolResultMessageProps {
  toolResult: ToolResultBlock
}

export const UserToolResultMessage: React.FC<UserToolResultMessageProps> = ({ toolResult }) => {
  const content = typeof toolResult.content === 'string'
    ? toolResult.content
    : JSON.stringify(toolResult.content, null, 2)

  return (
    <div className={`message-bubble tool-result ${toolResult.is_error ? 'error' : ''}`}>
      <div className="tool-result-header">
        <span className="tool-result-icon">{toolResult.is_error ? '❌' : '✅'}</span>
        <span className="tool-result-label">工具结果</span>
      </div>
      <div className="tool-result-content">
        <pre>{content}</pre>
      </div>
    </div>
  )
}
