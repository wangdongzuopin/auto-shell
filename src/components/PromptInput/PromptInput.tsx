// src/components/PromptInput/PromptInput.tsx

import React, { useState, useCallback, useRef } from 'react'
import { useAppState, useSetAppState } from '../../state/hooks'
import { useSettingsStore } from '../../renderer/store/settings'
import { createUserMessage, createAssistantMessage } from '../../utils/messages'
import type { TextBlock } from '../../types/message'
import { getAllModelPresets, MODEL_PRESETS } from '../../ai/models'
import './PromptInput.css'

export const PromptInput: React.FC = () => {
  const [input, setInput] = useState('')
  const isLoading = useAppState((s) => s.isLoading)
  const setState = useSetAppState()
  const messagesRef = useRef<HTMLTextAreaElement>(null)

  const aiSettings = useSettingsStore((s) => s.aiSettings)
  const currentModel = aiSettings.configs[aiSettings.provider]?.model || 'MiniMax-M2.7'
  const currentPreset = MODEL_PRESETS[currentModel]
  const models = getAllModelPresets()

  const getDisplayName = () => {
    if (currentPreset) {
      return currentPreset.name.replace(/Claude /i, '')
    }
    return currentModel
  }

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
          placeholder="Reply..."
          rows={1}
        />
        <div className="prompt-input-footer">
          <button className="prompt-tool-btn" title="Add attachment">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <div className="prompt-input-actions">
            <select
              value={currentModel}
              onChange={() => {}}
              className="model-select"
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
            <button className="prompt-tool-btn" title="Voice input">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>
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
    </div>
  )
}
