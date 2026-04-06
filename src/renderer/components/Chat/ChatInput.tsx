import React, { useState, useRef } from 'react';
import { Paperclip, Promotion, VideoCamera, Loading } from '@element-plus/icons-vue';
import { ElSelect, ElOption } from 'element-plus';
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
          <Paperclip />
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
          <VideoCamera />
        </button>

        {isLoading ? (
          <button className="send-btn loading" onClick={onStop}>
            <Loading className="is-loading" />
          </button>
        ) : (
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={!input.trim()}
          >
            <Promotion />
          </button>
        )}
      </div>

      <div className="input-hint">
        <ElSelect modelValue="sonnet-4" size="small" placeholder="选择模型">
          <ElOption label="Sonnet 4" value="sonnet-4" />
          <ElOption label="Sonnet 4.6" value="sonnet-4-6" />
          <ElOption label="Opus 4" value="opus-4" />
        </ElSelect>
      </div>
    </div>
  );
};
