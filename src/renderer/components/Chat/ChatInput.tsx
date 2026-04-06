import React, { useState, useRef } from 'react';
import { Paperclip, Send, Mic, Square } from 'lucide-react';
import './ChatInput.css';

interface ChatInputProps {
  onSend: (content: string) => void;
  isLoading?: boolean;
  onStop?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  isLoading = false,
  onStop,
}) => {
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('sonnet-4');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAttach = () => {
    console.log('Attach file');
  };

  const handleVoice = () => {
    console.log('Voice input');
  };

  return (
    <div className="chat-input-container">
      <div className="chat-input-wrapper">
        <button className="input-action-btn" onClick={handleAttach}>
          <Paperclip size={18} />
        </button>

        <div className="input-area">
          <textarea
            ref={textareaRef}
            className="chat-textarea"
            placeholder="输入消息..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
        </div>

        <button className="input-action-btn" onClick={handleVoice}>
          <Mic size={18} />
        </button>

        {isLoading ? (
          <button className="send-btn loading" onClick={onStop}>
            <Square size={18} />
          </button>
        ) : (
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={!input.trim()}
          >
            <Send size={18} />
          </button>
        )}
      </div>

      <div className="input-hint">
        <select
          className="model-select"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
        >
          <option value="sonnet-4">Sonnet 4</option>
          <option value="sonnet-4-6">Sonnet 4.6</option>
          <option value="opus-4">Opus 4</option>
        </select>
      </div>
    </div>
  );
};
