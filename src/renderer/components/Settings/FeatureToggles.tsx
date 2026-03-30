import React from 'react';
import { useSettingsStore } from '../../store/settings';
import { ToggleRow } from './index';

export function FeatureToggles() {
  const { features, setFeatures } = useSettingsStore();

  const toggles = [
    { key: 'errorCard', label: '报错后自动给出 AI 分析' },
    { key: 'naturalCommand', label: '支持 # 自然语言转命令' },
    { key: 'explainCommand', label: '选中文本后解释命令' },
    { key: 'completion', label: '预留上下文补全能力' }
  ] as const;

  return (
    <div className="feature-toggles">
      {toggles.map((toggle) => (
        <ToggleRow
          key={toggle.key}
          label={toggle.label}
          checked={features[toggle.key]}
          onChange={(value) => void setFeatures({ [toggle.key]: value })}
        />
      ))}
    </div>
  );
}
