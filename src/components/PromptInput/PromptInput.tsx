// src/components/PromptInput/PromptInput.tsx

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useAppState, useSetAppState } from '../../state/hooks'
import { createUserMessage, createAssistantMessage } from '../../utils/messages'
import type { TextBlock } from '../../types/message'
import { ModelSelector } from '../ModelSelector/ModelSelector'
import type { ChatMessage } from '../../shared/types'
import './PromptInput.css'

interface TagItem {
  id: string
  name: string
  type: 'skill' | 'mcp' | 'knowledge'
}

const TAG_COLOR = '#da7351'

export const PromptInput: React.FC = () => {
  const [input, setInput] = useState('')
  const [tags, setTags] = useState<TagItem[]>([])
  const [showTagMenu, setShowTagMenu] = useState(false)
  const [tagSearch, setTagSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const isLoading = useAppState((s) => s.isLoading)
  const setState = useSetAppState()
  const abortRef = useRef<(() => void) | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const tagMenuRef = useRef<HTMLDivElement>(null)

  // Mock data for skills/MCP/knowledge
  const allTags: TagItem[] = [
    { id: 'skill-1', name: '写代码', type: 'skill' },
    { id: 'skill-2', name: '代码审查', type: 'skill' },
    { id: 'skill-3', name: '解释错误', type: 'skill' },
    { id: 'mcp-1', name: '文件系统', type: 'mcp' },
    { id: 'mcp-2', name: 'Git操作', type: 'mcp' },
    { id: 'mcp-3', name: '终端命令', type: 'mcp' },
    { id: 'kb-1', name: '项目文档', type: 'knowledge' },
    { id: 'kb-2', name: '技术笔记', type: 'knowledge' },
  ]

  const filteredTags = allTags.filter(tag =>
    tag.name.toLowerCase().includes(tagSearch.toLowerCase())
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setInput(value)

    if (value.endsWith('/') && !showTagMenu) {
      setShowTagMenu(true)
      setTagSearch('')
      setSelectedIndex(0)
    } else if (showTagMenu) {
      if (value.endsWith(' ')) {
        setShowTagMenu(false)
        setTagSearch('')
      } else {
        setTagSearch(value.slice(value.lastIndexOf('/') + 1))
        setSelectedIndex(0)
      }
    }
  }

  const handleSelectTag = (tag: TagItem) => {
    const lastSlashIndex = input.lastIndexOf('/')
    const newInput = input.slice(0, lastSlashIndex) + ''
    setInput(newInput)
    setTags([...tags, tag])
    setShowTagMenu(false)
    setTagSearch('')
    setSelectedIndex(0)
    inputRef.current?.focus()
  }

  const handleRemoveTag = (tagId: string) => {
    setTags(tags.filter(t => t.id !== tagId))
  }

  const handleSubmit = useCallback(async () => {
    if (!input.trim() && tags.length === 0) return
    if (isLoading) return

    let fullContent = ''
    if (tags.length > 0) {
      const tagStrings = tags.map(t => `[${t.type}:${t.name}]`).join(' ')
      fullContent = `${tagStrings} ${input.trim()}`.trim()
    } else {
      fullContent = input.trim()
    }

    const userMsg = createUserMessage(fullContent)
    const assistantMsg = createAssistantMessage([])
    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, userMsg, assistantMsg],
      isLoading: true,
    }))

    setInput('')
    setTags([])

    const messages: ChatMessage[] = [
      { role: 'user', content: fullContent }
    ]

    let assistantContent = ''

    const handleChunk = (chunk: string) => {
      assistantContent += chunk
      setState((prev) => {
        const messages = [...prev.messages]
        const lastMsg = messages[messages.length - 1]
        if (lastMsg && lastMsg.type === 'assistant') {
          messages[messages.length - 1] = {
            ...lastMsg,
            message: {
              ...lastMsg.message,
              content: [{ type: 'text', text: assistantContent }]
            }
          }
        }
        return { ...prev, messages }
      })
    }

    const handleDone = () => {
      setState((prev) => ({ ...prev, isLoading: false }))
      abortRef.current = null
    }

    const handleError = (error: string) => {
      console.error('Chat error:', error)
      setState((prev) => {
        const messages = [...prev.messages]
        const lastMsg = messages[messages.length - 1]
        if (lastMsg && lastMsg.type === 'assistant') {
          messages[messages.length - 1] = {
            ...lastMsg,
            message: {
              ...lastMsg.message,
              content: [{ type: 'text', text: `错误: ${error}` }]
            }
          }
        }
        return { ...prev, isLoading: false }
      })
      abortRef.current = null
    }

    // Set up cleanup function
    const requestId = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const cleanup = window.api.streamChatWithAI(requestId, messages, {
      onChunk: handleChunk,
      onDone: handleDone,
      onError: handleError
    })

    abortRef.current = cleanup

    // Add timeout to detect stuck requests
    setTimeout(() => {
      // Check if still loading after 10 seconds
      setState((prev) => {
        if (prev.isLoading) {
          const messages = [...prev.messages]
          const lastMsg = messages[messages.length - 1]
          if (lastMsg && lastMsg.type === 'assistant' && !assistantContent) {
            messages[messages.length - 1] = {
              ...lastMsg,
              message: {
                ...lastMsg.message,
                content: [{ type: 'text', text: '错误: AI 服务响应超时，请检查网络和 API 配置' }]
              }
            }
            return { ...prev, isLoading: false }
          }
        }
        return prev
      })
    }, 10000)
  }, [input, tags, isLoading, setState])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (showTagMenu) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, filteredTags.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filteredTags[selectedIndex]) {
          handleSelectTag(filteredTags[selectedIndex])
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setShowTagMenu(false)
        setTagSearch('')
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }, [showTagMenu, filteredTags, selectedIndex, handleSubmit])

  const handleStop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current()
      abortRef.current = null
    }
    setState((prev) => ({ ...prev, isLoading: false }))
  }, [setState])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tagMenuRef.current && !tagMenuRef.current.contains(e.target as Node) &&
          !inputRef.current?.contains(e.target as Node)) {
        setShowTagMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="prompt-input-container">
      {tags.length > 0 && (
        <div className="prompt-tags">
          {tags.map((tag) => (
            <span key={tag.id} className="prompt-tag" style={{ backgroundColor: TAG_COLOR }}>
              <span className="tag-type">{tag.type}</span>
              <span className="tag-name">{tag.name}</span>
              <button type="button" className="tag-remove" onClick={() => handleRemoveTag(tag.id)}>×</button>
            </span>
          ))}
        </div>
      )}

      <div className="prompt-input-bar">
        <textarea
          ref={inputRef}
          className="prompt-input prompt-input-bar-field"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="发送跟进..."
          rows={1}
        />
        <div className="prompt-bar-trailing">
          <ModelSelector />
          {isLoading ? (
            <button type="button" className="prompt-send-fab prompt-send-fab-stop" onClick={handleStop} aria-label="停止生成">
              <svg className="prompt-send-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <rect x="7" y="7" width="10" height="10" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              className="prompt-send-fab"
              onClick={handleSubmit}
              disabled={!input.trim() && tags.length === 0}
              aria-label="发送"
            >
              <svg className="prompt-send-icon prompt-send-icon-plane" viewBox="0 0 24 24" aria-hidden>
                <path fill="currentColor" d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {showTagMenu && (
        <div className="tag-menu" ref={tagMenuRef}>
          <div className="tag-menu-header">选择技能 / MCP / 知识库</div>
          <div className="tag-menu-list">
            {filteredTags.map((tag, index) => (
              <button
                key={tag.id}
                className={`tag-menu-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => handleSelectTag(tag)}
              >
                <span className="tag-menu-type" style={{ backgroundColor: TAG_COLOR }}>{tag.type}</span>
                <span className="tag-menu-name">{tag.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
