import React, { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useChatStore } from '../../stores/chatStore';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { QuickActions } from './QuickActions';
import './Chat.css';

export const ChatArea: React.FC = () => {
  const { threadId } = useParams<{ threadId: string }>();
  const currentThread = useChatStore((state) => state.currentThread);
  const setCurrentThread = useChatStore((state) => state.setCurrentThread);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (threadId) {
      setCurrentThread(threadId);
    }
  }, [threadId, setCurrentThread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentThread?.messages]);

  const handleSend = async (content: string) => {
    console.log('Send message:', content);
  };

  if (!currentThread) {
    return (
      <div className="chat-area chat-empty">
        <div className="empty-state">
          <h2>你好，jelly</h2>
          <p>有什么可以帮助你的吗？</p>
          <QuickActions />
        </div>
      </div>
    );
  }

  return (
    <div className="chat-area">
      <div className="chat-messages">
        {currentThread.messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <ChatInput onSend={handleSend} />
    </div>
  );
};
