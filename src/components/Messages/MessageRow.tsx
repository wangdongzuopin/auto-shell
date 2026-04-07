// src/components/Messages/MessageRow.tsx

import React from 'react'
import type { NormalizedMessage, ContentBlock, TextBlock, ToolUseBlock, ThinkingBlock, ToolResultBlock } from '../../types/message'
import { UserTextMessage } from './UserTextMessage'
import { AssistantTextMessage } from './AssistantTextMessage'
import { AssistantThinkingMessage } from './AssistantThinkingMessage'
import { AssistantToolUseMessage } from './AssistantToolUseMessage'
import { UserToolResultMessage } from './UserToolResultMessage'
import { SystemTextMessage } from './SystemTextMessage'
import './MessageRow.css'

interface MessageRowProps {
  message: NormalizedMessage
}

export const MessageRow: React.FC<MessageRowProps> = ({ message }) => {
  const renderContent = () => {
    switch (message.type) {
      case 'user': {
        const content = message.message?.content
        if (typeof content === 'string') {
          return <UserTextMessage text={content} timestamp={message.timestamp} />
        }
        if (Array.isArray(content)) {
          return content.map((block, i) => {
            if (block.type === 'text') {
              return <UserTextMessage key={i} text={block.text} timestamp={message.timestamp} />
            }
            if (block.type === 'tool_result') {
              return <UserToolResultMessage key={i} toolResult={block as ToolResultBlock} />
            }
            return null
          })
        }
        return null
      }

      case 'assistant': {
        const blocks = message.message?.content
        if (!blocks || blocks.length === 0) {
          // Loading state
          return <AssistantThinkingMessage thinking="..." />
        }
        return blocks.map((block, i) => {
          switch (block.type) {
            case 'text':
              return <AssistantTextMessage key={i} text={block.text} timestamp={message.timestamp} />
            case 'thinking':
              return <AssistantThinkingMessage key={i} thinking={block.thinking} />
            case 'tool_use':
              return <AssistantToolUseMessage key={i} toolUse={block as ToolUseBlock} />
            default:
              return null
          }
        })
      }

      case 'system':
        return <SystemTextMessage message={message as any} />

      case 'progress':
        return <AssistantThinkingMessage thinking="加载中..." />

      default:
        return null
    }
  }

  return (
    <div className={`message-row message-row-${message.type}`}>
      <div className="message-avatar">
        {message.type === 'user' ? (
          <span className="avatar user-avatar">J</span>
        ) : message.type === 'assistant' ? (
          <span className="avatar ai-avatar">AI</span>
        ) : (
          <span className="avatar system-avatar">SYS</span>
        )}
      </div>
      <div className="message-body">{renderContent()}</div>
    </div>
  )
}
