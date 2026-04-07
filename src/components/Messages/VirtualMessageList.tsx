// src/components/Messages/VirtualMessageList.tsx

import React, { useRef, useEffect, useCallback, useState } from 'react'
import type { NormalizedMessage } from '../../types/message'
import './VirtualMessageList.css'

interface VirtualMessageListProps {
  messages: NormalizedMessage[]
  renderMessage: (msg: NormalizedMessage, index: number) => React.ReactNode
  onScroll?: (isAtBottom: boolean) => void
}

const ITEM_HEIGHT_ESTIMATE = 80 // Average message height in pixels
const OVERSCAN = 5 // Number of items to render outside visible area

export const VirtualMessageList: React.FC<VirtualMessageListProps> = ({
  messages,
  renderMessage,
  onScroll,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT_ESTIMATE) - OVERSCAN)
  const endIndex = Math.min(
    messages.length - 1,
    Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT_ESTIMATE) + OVERSCAN
  )

  // Get visible messages
  const visibleMessages: { msg: NormalizedMessage; index: number; offset: number }[] = []
  for (let i = startIndex; i <= endIndex; i++) {
    if (messages[i]) {
      visibleMessages.push({
        msg: messages[i],
        index: i,
        offset: i * ITEM_HEIGHT_ESTIMATE,
      })
    }
  }

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      const { scrollTop: st, scrollHeight, clientHeight } = containerRef.current
      setScrollTop(st)
      const isAtBottom = scrollHeight - st - clientHeight < 50
      onScroll?.(!isAtBottom)
    }
  }, [onScroll])

  useEffect(() => {
    const container = containerRef.current
    if (container) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContainerHeight(entry.contentRect.height)
        }
      })
      observer.observe(container)
      return () => observer.disconnect()
    }
  }, [])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (containerRef.current && scrollRef.current && scrollTop + containerHeight >= scrollRef.current.scrollHeight - 100) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages.length, scrollTop, containerHeight])

  return (
    <div
      ref={(el) => {
        containerRef.current = el
        scrollRef.current = el
      }}
      className="virtual-message-list"
      onScroll={handleScroll}
    >
      <div
        className="virtual-message-list-inner"
        style={{ height: messages.length * ITEM_HEIGHT_ESTIMATE }}
      >
        {visibleMessages.map(({ msg, index, offset }) => (
          <div
            key={msg.uuid ?? index}
            className="virtual-message-item"
            style={{ transform: `translateY(${offset}px)` }}
          >
            {renderMessage(msg, index)}
          </div>
        ))}
      </div>
    </div>
  )
}