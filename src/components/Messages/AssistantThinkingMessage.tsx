// src/components/Messages/AssistantThinkingMessage.tsx

import React from 'react'
import './MessageRow.css'

interface AssistantThinkingMessageProps {
  thinking?: string
}

export const AssistantThinkingMessage: React.FC<AssistantThinkingMessageProps> = ({ thinking }) => {
  return (
    <div className="message-bubble thinking">
      <div className="thinking-indicator">
        <div className="thinking-spinner">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.2" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <span className="thinking-text">思考中</span>
      </div>
      {thinking && <div className="thinking-content">{thinking}</div>}
    </div>
  )
}
