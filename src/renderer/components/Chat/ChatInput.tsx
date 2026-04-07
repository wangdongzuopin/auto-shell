import React, { useState, useRef, useEffect } from 'react';
import { Plus, Send, Mic, ChevronDown, Zap } from 'lucide-react';
import { useModelStore } from '../../stores/modelStore';
import { useSkillStore, type Skill } from '../../stores/skillStore';
import './ChatInput.css';

interface ChatInputProps {
  onSend: (content: string, selectedSkill?: string) => void;
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
  const [showSkillPicker, setShowSkillPicker] = useState(false);
  const [skillSearch, setSkillSearch] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [selectedSkillIndex, setSelectedSkillIndex] = useState(0);
  const { models, activeModelId, setActiveModel, getDefaultModel } = useModelStore();
  const skills = useSkillStore((state) => state.skills);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const skillPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeModel = models.find(m => m.id === activeModelId) || getDefaultModel();

  const filteredSkills = skills.filter(skill =>
    skill.name.toLowerCase().includes(skillSearch.toLowerCase()) ||
    skill.description.toLowerCase().includes(skillSearch.toLowerCase())
  );

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const lineHeight = 24;
      const maxLines = 5;
      const maxHeight = lineHeight * maxLines;
      const newHeight = Math.min(textareaRef.current.scrollHeight, maxHeight);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [input]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (skillPickerRef.current && !skillPickerRef.current.contains(e.target as Node)) {
        setShowSkillPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset selected index when filtered skills change
  useEffect(() => {
    if (selectedSkillIndex >= filteredSkills.length) {
      setSelectedSkillIndex(Math.max(0, filteredSkills.length - 1));
    }
  }, [filteredSkills, selectedSkillIndex]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);

    const lastSlashIndex = value.lastIndexOf('/');
    if (lastSlashIndex !== -1 && lastSlashIndex === value.length - 1) {
      setShowSkillPicker(true);
      setSkillSearch('');
      setSelectedSkillIndex(0);
    } else if (showSkillPicker && lastSlashIndex !== -1) {
      setSkillSearch(value.slice(lastSlashIndex + 1));
      setSelectedSkillIndex(0);
    } else if (!value.includes('/')) {
      setShowSkillPicker(false);
      setSkillSearch('');
    }
  };

  const handleSelectSkill = (skill: Skill) => {
    const lastSlashIndex = input.lastIndexOf('/');
    const beforeSlash = input.slice(0, lastSlashIndex);
    setInput(beforeSlash);
    setSelectedSkill(skill);
    setShowSkillPicker(false);
    setSkillSearch('');
    // Focus textarea after selection
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const handleRemoveSkill = () => {
    setSelectedSkill(null);
  };

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSend(input.trim(), selectedSkill?.id);
      setInput('');
      setSelectedSkill(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Skill picker navigation
    if (showSkillPicker && filteredSkills.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSkillIndex((prev) =>
          prev < filteredSkills.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSkillIndex((prev) =>
          prev > 0 ? prev - 1 : filteredSkills.length - 1
        );
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSelectSkill(filteredSkills[selectedSkillIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSkillPicker(false);
        return;
      }
    }

    // Send on Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }

    // Escape to close dropdowns
    if (e.key === 'Escape') {
      if (showSkillPicker) {
        setShowSkillPicker(false);
      }
      if (showModelDropdown) {
        setShowModelDropdown(false);
      }
    }
  };

  const handleAttach = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      console.log('Selected files:', files);
    }
  };

  const handleSelectModel = (modelId: string) => {
    setActiveModel(modelId);
    setShowModelDropdown(false);
  };

  return (
    <div className="chat-input-container">
      <div className="chat-input-wrapper">
        <div className="input-main">
          {selectedSkill && (
            <div className="selected-skill-tag">
              <span className="skill-tag-icon">{selectedSkill.icon}</span>
              <span className="skill-tag-name">{selectedSkill.name}</span>
              <button className="skill-tag-remove" onClick={handleRemoveSkill}>×</button>
            </div>
          )}
          <textarea
            ref={textareaRef}
            className="chat-textarea"
            placeholder="输入要求..."
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
          />
          {showSkillPicker && (
            <div className="skill-picker" ref={skillPickerRef}>
              <div className="skill-picker-header">
                <span>选择技能</span>
                <span className="skill-picker-hint">↑↓ 选择 · Enter 确认</span>
              </div>
              <div className="skill-picker-list">
                {filteredSkills.length > 0 ? (
                  filteredSkills.map((skill, index) => (
                    <button
                      key={skill.id}
                      className={`skill-picker-item ${index === selectedSkillIndex ? 'selected' : ''}`}
                      onClick={() => handleSelectSkill(skill)}
                      onMouseEnter={() => setSelectedSkillIndex(index)}
                    >
                      <span className="skill-picker-icon">{skill.icon}</span>
                      <div className="skill-picker-info">
                        <span className="skill-picker-name">{skill.name}</span>
                        <span className="skill-picker-desc">{skill.description}</span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="skill-picker-empty">没有找到技能</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="input-toolbar">
          <div className="toolbar-left">
            <input
              type="file"
              ref={fileInputRef}
              className="file-input-hidden"
              onChange={handleFileChange}
              multiple
            />
            <button className="toolbar-btn" onClick={handleAttach} title="上传文件">
              <Plus size={18} />
            </button>

            <div className="toolbar-divider" />

            <button
              className="toolbar-dropdown"
              onClick={() => setShowModelDropdown(!showModelDropdown)}
            >
              <Zap size={14} />
              <span>{activeModel?.name || '选择模型'}</span>
              <ChevronDown size={12} />
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

          <div className="toolbar-right">
            <button className="toolbar-btn" title="语音输入">
              <Mic size={16} />
            </button>
            {isLoading ? (
              <button className="send-btn loading" onClick={onStop}>
                <div className="stop-icon" />
              </button>
            ) : (
              <button
                className="send-btn"
                onClick={handleSend}
                disabled={!input.trim()}
              >
                <Send size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
