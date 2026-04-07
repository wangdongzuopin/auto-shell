// src/components/Messages/Messages.tsx

import React, { useRef, useCallback, useState, useEffect } from 'react'
import { useAppState } from '../../state/hooks'
import { useSettingsStore } from '../../renderer/store/settings'
import type { NormalizedMessage } from '../../types/message'
import { MessageRow } from './MessageRow'
import { PromptInput } from '../PromptInput/PromptInput'
import './Messages.css'

const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Morning'
  if (hour < 18) return 'Afternoon'
  return 'Evening'
}

export const Messages: React.FC = () => {
  const messages = useAppState((s) => s.messages)
  const isLoading = useAppState((s) => s.isLoading)
  const setState = useAppState((s) => s as any)?.setState
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)

  const greeting = getGreeting()
  const username = 'jelly'

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

  if (messages.length === 0) {
    return (
      <div className="messages-container">
        <div className="chat-empty">
          <div className="empty-state">
            <h2 className="greeting-title">
              <span className="greeting-star">✴</span> {greeting}, {username}
            </h2>
            <p className="greeting-subtitle">How can I help you today?</p>
          </div>
        </div>
        <div className="messages-input-area">
          <PromptInput />
        </div>
      </div>
    )
  }

  return (
    <div className="messages-container">
      <div className="chat-messages" ref={messagesContainerRef} onScroll={handleScroll}>
        {messages.map((message, index) => (
          <MessageRow key={message.uuid ?? index} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      {showScrollButton && (
        <button className="scroll-to-bottom" onClick={scrollToBottom}>
          ↓
        </button>
      )}
      <div className="messages-input-area">
        <PromptInput />
      </div>
    </div>
  )
}
