import React, { useState, useEffect } from 'react';
import { Plus, Trash2, FolderOpen, Loader2 } from 'lucide-react';
import { confirm } from '../components/ConfirmDialog';
import { IconPicker } from '../components/common/IconPicker';
import { useSkillStore, type Skill } from '../stores/skillStore';
import './page.css';

export const SkillsPage: React.FC = () => {
  const { skills, deleteSkill, importSkill, loadSkillsFromDisk } = useSkillStore();
  const [showImport, setShowImport] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [importForm, setImportForm] = useState({
    name: '',
    description: '',
    icon: '🛠️',
    path: '',
    mode: 'work' as Skill['mode'],
  });

  useEffect(() => {
    loadSkillsFromDisk();
  }, []);

  const handleSelectFolder = async () => {
    const folderPath = await window.api.openFolderDialog('选择技能文件夹');
    if (folderPath) {
      setImportForm({ ...importForm, path: folderPath });
      await detectSkill(folderPath);
    }
  };

  const detectSkill = async (folderPath: string) => {
    setDetecting(true);
    try {
      const response = await window.api.chatWithAI([
        {
          role: 'user',
          content: `请分析以下文件夹，判断它是否是一个技能（Skill）文件夹。
如果是，请以JSON格式返回技能信息；如果不是，返回null。

文件夹路径: ${folderPath}

请检查是否存在以下内容来判断是否是技能文件夹：
- README.md 或 skill.json 等配置文件
- 包含"skill"关键词的文档
- 特定的目录结构

如果是技能，请返回如下JSON格式：
{
  "valid": true,
  "name": "技能名称",
  "description": "技能描述",
  "icon": "图标emoji"
}

如果不是技能，返回：
{
  "valid": false,
  "reason": "不是技能文件夹的原因"
}`,
        },
      ]);

      try {
        const parsed = JSON.parse(response);
        if (parsed.valid) {
          setImportForm((prev) => ({
            ...prev,
            name: parsed.name || prev.name,
            description: parsed.description || prev.description,
            icon: parsed.icon || prev.icon,
          }));
        }
      } catch {
        // AI返回的不是有效JSON，忽略
      }
    } catch (error) {
      console.error('技能检测失败:', error);
    } finally {
      setDetecting(false);
    }
  };

  const handleImport = () => {
    if (importForm.name && importForm.path) {
      importSkill(importForm);
      // 只重置名称和描述，保留路径和图标
      setImportForm((prev) => ({ ...prev, name: '', description: '' }));
      setShowImport(false);
    }
  };

  const handleClose = () => {
    setShowImport(false);
  };

  const handleOpen = () => {
    setShowImport(true);
  };

  const handleDelete = (id: string) => {
    confirm('确定要删除这个技能吗？', '确认删除').then((ok) => {
      if (ok) deleteSkill(id);
    });
  };

  return (
    <div className="skills-page">
      <div className="page-content">
        <div className="skills-header">
          <h2>技能市场</h2>
          <button className="add-btn" onClick={handleOpen}>
            <Plus size={16} />
            导入技能
          </button>
        </div>

        {showImport && (
          <div className="import-form">
            <div className="form-row">
              <label>
                <span>图标</span>
                <IconPicker
                  value={importForm.icon}
                  onChange={(icon) => setImportForm({ ...importForm, icon })}
                />
              </label>
              <label>
                <span>名称</span>
                <input
                  type="text"
                  placeholder="技能名称"
                  value={importForm.name}
                  onChange={(e) => setImportForm({ ...importForm, name: e.target.value })}
                />
              </label>
            </div>
            <div className="form-row">
              <label className="full-width">
                <span>描述</span>
                <input
                  type="text"
                  placeholder="技能描述"
                  value={importForm.description}
                  onChange={(e) => setImportForm({ ...importForm, description: e.target.value })}
                />
              </label>
            </div>
            <div className="form-row">
              <label className="full-width">
                <span>技能路径</span>
                <div className="path-input-wrapper">
                  <input
                    type="text"
                    placeholder="选择技能文件夹路径"
                    value={importForm.path}
                    onChange={(e) => setImportForm({ ...importForm, path: e.target.value })}
                  />
                  <button className="path-browse-btn" onClick={handleSelectFolder} disabled={detecting}>
                    {detecting ? <Loader2 size={16} className="spin" /> : <FolderOpen size={16} />}
                    浏览
                  </button>
                </div>
              </label>
            </div>
            <div className="form-row">
              <label>
                <span>模式</span>
                <select
                  value={importForm.mode}
                  onChange={(e) => setImportForm({ ...importForm, mode: e.target.value as Skill['mode'] })}
                >
                  <option value="companion">陪伴模式</option>
                  <option value="work">工作模式</option>
                  <option value="decision">决策模式</option>
                  <option value="reflection">反思模式</option>
                </select>
              </label>
            </div>
            <div className="form-actions">
              <button className="cancel-btn" onClick={handleClose}>取消</button>
              <button
                className="confirm-btn"
                onClick={handleImport}
                disabled={!importForm.name || !importForm.path}
              >
                导入
              </button>
            </div>
          </div>
        )}

        <div className="skills-grid">
          {skills.map((skill) => (
            <div key={skill.id} className="skill-card">
              <div className="skill-header">
                <span className="skill-icon">{skill.icon}</span>
                <button className="delete-btn" onClick={() => handleDelete(skill.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
              <h3>{skill.name}</h3>
              <p title={skill.description}>{skill.description}</p>
              <div className="skill-mode">{skill.mode}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
