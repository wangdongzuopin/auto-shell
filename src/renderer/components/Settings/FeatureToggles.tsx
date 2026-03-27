import React from 'react';
import { useSettingsStore } from '../../store/settings';
import { ToggleRow } from './index';

export function FeatureToggles() {
  const { features, setFeatures } = useSettingsStore();

  const toggles = [
    { key: 'errorCard', label: '报错智能解析卡片' },
    { key: 'naturalCommand', label: '自然语言转命令（#）' },
    { key: 'explainCommand', label: '命令解释悬浮卡' },
    { key: 'completion', label: '上下文感知补全' }
  ] as const;

  return (
    <div className="feature-toggles">
      {toggles.map(t => (
        <ToggleRow
          key={t.key}
          label={t.label}
          checked={features[t.key]}
          onChange={(v) => setFeatures({ [t.key]: v })}
        />
      ))}
    </div>
  );
}
