// src/components/Messages/Messages.tsx

import React, { useCallback, useState } from 'react'
import { useAppState } from '../../state/hooks'
import type { NormalizedMessage } from '../../types/message'
import { VirtualMessageList } from './VirtualMessageList'
import { MessageRow } from './MessageRow'
import { PromptInput } from '../PromptInput/PromptInput'
import './Messages.css'

export const Messages: React.FC = () => {
  const messages = useAppState((s) => s.messages)
  const isLoading = useAppState((s) => s.isLoading)
  const setState = useAppState((s) => s as any)?.setState

  const [showScrollButton, setShowScrollButton] = useState(false)

  const handleScroll = useCallback((isNotAtBottom: boolean) => {
    setShowScrollButton(isNotAtBottom)
  }, [])

  const scrollToBottom = useCallback(() => {
    // Handled by VirtualMessageList internal scroll
  }, [])

  const renderMessage = useCallback((msg: NormalizedMessage) => {
    return <MessageRow message={msg} />
  }, [])

  if (messages.length === 0) {
    return (
      <div className="messages-empty">
        <div className="empty-state">
          <h2>你好</h2>
          <p>有什么可以帮助你的吗？</p>
        </div>
        <div className="messages-input-area">
          <PromptInput />
        </div>
      </div>
    )
  }

  return (
    <div className="messages-container">
      <div className="messages-list">
        <VirtualMessageList
          messages={messages}
          renderMessage={renderMessage}
          onScroll={handleScroll}
        />
      </div>
      {showScrollButton && (
        <button className="scroll-to-bottom" onClick={scrollToBottom}>
          滚动到底部
        </button>
      )}
      <div className="messages-input-area">
        <PromptInput />
      </div>
    </div>
  )
}
