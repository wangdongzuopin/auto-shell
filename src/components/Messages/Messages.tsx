// src/components/Messages/Messages.tsx

import React, { useRef, useCallback, useState, useEffect } from 'react'
import { useAppState } from '../../state/hooks'
import { MessageRow } from './MessageRow'
import { PromptInput } from '../PromptInput/PromptInput'
import './Messages.css'

export const Messages: React.FC = () => {
  const messages = useAppState((s) => s.messages)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Handle scroll to show/hide scroll button
  const handleScroll = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
      setShowScrollButton(!isAtBottom)
    }
  }, [])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    setShowScrollButton(false)
  }, [])

  const body =
    messages.length === 0 ? (
      <div className="chat-empty">
        <div className="empty-state">
          <p className="empty-state-title">开始对话</p>
          <p className="empty-state-hint">在下方输入问题，我会尽力协助你。</p>
        </div>
      </div>
    ) : (
      <>
        <div className="chat-messages" ref={messagesContainerRef} onScroll={handleScroll}>
          {messages.map((message, index) => (
            <MessageRow key={message.uuid ?? index} message={message} />
          ))}
          <div ref={messagesEndRef} />
        </div>
        {showScrollButton && (
          <button type="button" className="scroll-to-bottom" onClick={scrollToBottom} aria-label="回到底部">
            ↓
          </button>
        )}
      </>
    )

  return (
    <div className="chat-surface">
      <div className="messages-container">
        {body}
        <div className="messages-input-area">
          <PromptInput />
        </div>
      </div>
    </div>
  )
}
