// src/components/messages/SystemTextMessage.tsx

import React from 'react'
import type { SystemMessage } from '../../types/message'
import './Messages.css'

interface SystemTextMessageProps {
  message: SystemMessage
}

export const SystemTextMessage: React.FC<SystemTextMessageProps> = ({ message }) => {
  const levelClass = message.level ? `system-${message.level}` : ''

  return (
    <div className={`message-bubble system ${levelClass}`}>
      <div className="system-content">
        {message.subtype && <span className="system-subtype">[{message.subtype}]</span>}
        {message.message}
      </div>
    </div>
  )
}
