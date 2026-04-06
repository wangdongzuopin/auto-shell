import React, { useState } from 'react';
import { Paperclip, Send, Mic, Square } from 'lucide-react';
import { useModelStore } from '../../stores/modelStore';
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
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const { models, activeModelId, setActiveModel, getDefaultModel } = useModelStore();

  const activeModel = models.find(m => m.id === activeModelId) || getDefaultModel();

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

  const handleSelectModel = (modelId: string) => {
    setActiveModel(modelId);
    setShowModelDropdown(false);
  };

  return (
    <div className="chat-input-container">
      <div className="chat-input-wrapper">
        <button className="input-action-btn" onClick={handleAttach}>
          <Paperclip size={18} />
        </button>

        <div className="input-area">
          <textarea
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
            <Square size={16} />
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
        <div className="model-selector">
          <button
            className="model-selector-btn"
            onClick={() => setShowModelDropdown(!showModelDropdown)}
          >
            <span className="model-name">{activeModel?.name || '选择模型'}</span>
            <span className="dropdown-arrow">▼</span>
          </button>

          {showModelDropdown && (
            <div className="model-dropdown">
              {models.map((model) => (
                <button
                  key={model.id}
                  className={`model-option ${model.id === activeModelId ? 'active' : ''}`}
                  onClick={() => handleSelectModel(model.id)}
                >
                  <span>{model.name}</span>
                  {model.isDefault && <span className="default-tag">默认</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
