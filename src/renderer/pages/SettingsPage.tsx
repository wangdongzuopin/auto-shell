import React from 'react';
import { Header } from '../components/common/Header';
import { useAppStore } from '../stores/appStore';
import { ElSwitch, ElSelect, ElOption } from 'element-plus';
import type { PermissionMode } from '../../shared/types';
import './SettingsPage.css';

export const SettingsPage: React.FC = () => {
  const { permissionEnabled, permissionMode, togglePermission, setPermissionMode } = useAppStore();

  return (
    <div className="settings-page">
      <Header title="设置" showNav={false} />
      <div className="settings-content">
        <section className="settings-section">
          <h3>权限设置</h3>
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">权限模式</span>
              <span className="setting-desc">启用后，AI 执行操作需要确认</span>
            </div>
            <ElSwitch
              modelValue={permissionEnabled}
              onChange={togglePermission}
            />
          </div>
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">默认权限</span>
              <span className="setting-desc">选择默认的权限级别</span>
            </div>
            <ElSelect
              modelValue={permissionMode}
              onChange={(val) => setPermissionMode(val as PermissionMode)}
              disabled={permissionEnabled}
            >
              <ElOption label="默认询问" value="default" />
              <ElOption label="自动批准" value="acceptEdits" />
              <ElOption label="跳过确认" value="bypassPermissions" />
              <ElOption label="计划模式" value="plan" />
            </ElSelect>
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
