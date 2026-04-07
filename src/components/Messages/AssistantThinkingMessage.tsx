// src/components/messages/AssistantThinkingMessage.tsx

import React from 'react'
import type { ThinkingBlock } from '../../types/message'
import './messages.css'

interface AssistantThinkingMessageProps {
  thinking: string
}

export const AssistantThinkingMessage: React.FC<AssistantThinkingMessageProps> = ({ thinking }) => {
  return (
    <div className="message-bubble thinking">
      <div className="thinking-indicator">
        <span className="thinking-dot"></span>
        <span className="thinking-dot"></span>
        <span className="thinking-dot"></span>
        <span className="thinking-text">思考中...</span>
      </div>
      <div className="thinking-content">{thinking}</div>
    </div>
  )
}
