// src/utils/chat.ts

import type { ChatMessage } from '../shared/types'

export function streamChatWithAI(
  messages: ChatMessage[],
  callbacks: {
    onChunk: (chunk: string) => void
    onDone: () => void
    onError: (message: string) => void
  }
): () => void {
  const requestId = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return window.api.streamChatWithAI(requestId, messages, callbacks)
}
