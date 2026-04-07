// src/components/PromptInput/PromptInput.tsx

import React, { useState, useCallback, useRef } from 'react'
import { useAppState, useSetAppState } from '../../state/hooks'
import { createUserMessage, createAssistantMessage } from '../../utils/messages'
import type { ContentBlock, TextBlock, ToolUseBlock } from '../../types/message'
import './PromptInput.css'

export const PromptInput: React.FC = () => {
  const [input, setInput] = useState('')
  const isLoading = useAppState((s) => s.isLoading)
  const setState = useSetAppState()
  const messagesRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isLoading) return

    const userMsg = createUserMessage(input.trim())
    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, userMsg],
      isLoading: true,
    }))

    setInput('')

    // Simulate AI response (placeholder - integrate with actual AI later)
    setTimeout(() => {
      const assistantMsg = createAssistantMessage([
        { type: 'text', text: `收到: ${userMsg.message.content}` } as TextBlock
      ])
      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMsg],
        isLoading: false,
      }))
    }, 1000)
  }, [input, isLoading, setState])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit])

  const handleStop = useCallback(() => {
    setState((prev) => ({ ...prev, isLoading: false }))
  }, [setState])

  return (
    <div className="prompt-input-container">
      <div className="prompt-input-wrapper">
        <textarea
          ref={messagesRef}
          className="prompt-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息..."
          rows={1}
        />
        <div className="prompt-input-actions">
          {isLoading ? (
            <button className="prompt-stop" onClick={handleStop}>
              停止
            </button>
          ) : (
            <button className="prompt-send" onClick={handleSubmit} disabled={!input.trim()}>
              发送
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
