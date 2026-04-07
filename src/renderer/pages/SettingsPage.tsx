import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import type { PermissionMode } from '../../shared/types';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { permissionEnabled, permissionMode, togglePermission, setPermissionMode } = useAppStore();
  const [localPermissionEnabled, setLocalPermissionEnabled] = useState(permissionEnabled);
  const [localPermissionMode, setLocalPermissionMode] = useState<PermissionMode>(permissionMode);

  const handleTogglePermission = () => {
    setLocalPermissionEnabled(!localPermissionEnabled);
    togglePermission();
  };

  const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMode = e.target.value as PermissionMode;
    setLocalPermissionMode(newMode);
    setPermissionMode(newMode);
  };

  return (
    <div className="settings-page">
      <div className="settings-content">
        <section className="settings-section">
          <h3>权限设置</h3>
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">权限模式</span>
              <span className="setting-desc">启用后，AI 执行操作需要确认</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={localPermissionEnabled}
                onChange={handleTogglePermission}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">默认权限</span>
              <span className="setting-desc">选择默认的权限级别</span>
            </div>
            <select
              className="native-select"
              value={localPermissionMode}
              onChange={handleModeChange}
              disabled={localPermissionEnabled}
            >
              <option value="default">默认询问</option>
              <option value="acceptEdits">自动批准</option>
              <option value="bypassPermissions">跳过确认</option>
              <option value="plan">计划模式</option>
            </select>
          </div>
        </section>

        <section className="settings-section">
          <h3>模型设置</h3>
          <div className="setting-item clickable" onClick={() => navigate('/settings/models')}>
            <div className="setting-info">
              <span className="setting-label">模型设置</span>
              <span className="setting-desc">管理 AI 模型列表</span>
            </div>
            <ChevronRight size={16} />
          </div>
        </section>

        <section className="settings-section">
          <h3>关于</h3>
          <div className="setting-item">
            <span className="setting-label">版本</span>
            <span className="setting-value">0.3.0</span>
          </div>
        </section>
      </div>
    </div>
  );
};