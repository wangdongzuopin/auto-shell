import React, { useState } from 'react';
import './IconPicker.css';

const ICONS = [
  '🛠️', '💻', '📝', '🔍', '🎨', '🚀', '⚙️', '📚',
  '🌐', '🔧', '💡', '📊', '🎯', '✨', '🔥', '⚡',
  '🎭', '📦', '🔮', '🎪', '🌟', '💫', '🎋', '🌸',
  '🦄', '🐱', '🐶', '🦊', '🐼', '🦁', '🐯', '🦉',
  '📱', '💾', '📷', '🎥', '🎵', '🎬', '📝', '📖',
  '🧠', '💭', '🎓', '🏆', '🎸', '⚽', '🏀', '🎮',
];

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
}

export const IconPicker: React.FC<IconPickerProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredIcons = search
    ? ICONS.filter((icon) => icon.includes(search))
    : ICONS;

  return (
    <div className="icon-picker">
      <div className="icon-picker-trigger" onClick={() => setIsOpen(!isOpen)}>
        <span className="icon-preview">{value}</span>
        <span className="icon-arrow">{isOpen ? '▲' : '▼'}</span>
      </div>

      {isOpen && (
        <div className="icon-picker-dropdown">
          <input
            type="text"
            className="icon-search"
            placeholder="搜索图标..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="icon-grid">
            {filteredIcons.map((icon) => (
              <button
                key={icon}
                className={`icon-option ${icon === value ? 'selected' : ''}`}
                onClick={() => {
                  onChange(icon);
                  setIsOpen(false);
                  setSearch('');
                }}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
