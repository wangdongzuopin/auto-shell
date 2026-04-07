// src/components/messages/UserTextMessage.tsx

import React from 'react'
import type { TextBlock } from '../../types/message'
import './messages.css'

interface UserTextMessageProps {
  text: string
  timestamp?: string
}

export const UserTextMessage: React.FC<UserTextMessageProps> = ({ text, timestamp }) => {
  const formatTime = (ts?: string) => {
    if (!ts) return ''
    return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="message-bubble user">
      <div className="message-content">{text}</div>
      {timestamp && <span className="message-time">{formatTime(timestamp)}</span>}
    </div>
  )
}
