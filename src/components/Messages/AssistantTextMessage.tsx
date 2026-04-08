// src/components/messages/AssistantTextMessage.tsx

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { TextBlock } from '../../types/message'
import './Messages.css'

interface AssistantTextMessageProps {
  text: string
  timestamp?: string
}

export const AssistantTextMessage: React.FC<AssistantTextMessageProps> = ({ text, timestamp }) => {
  const formatTime = (ts?: string) => {
    if (!ts) return ''
    return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="message-bubble assistant">
      <div className="message-content">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
      </div>
      {timestamp && <span className="message-time">{formatTime(timestamp)}</span>}
    </div>
  )
}
