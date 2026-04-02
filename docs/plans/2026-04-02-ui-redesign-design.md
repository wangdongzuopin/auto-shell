# Auto Shell UI 体验重构设计方案

## 1. 背景与目标

**用户核心痛点：**
- PowerShell 样式不好看，输出混乱
- 期望半透明背景
- AI 对话面板默认打开但不需要
- 整体 UI 不够精致

**设计参考：** Claude Desktop（简洁、层次清晰、毛玻璃质感）

---

## 2. 布局重构

### 2.1 默认布局调整

| 区域 | 当前 | 改动后 |
|------|------|--------|
| AI Chat Panel | 默认展开 (420px) | **默认隐藏**，通过 TabBar 按钮唤起 |
| 终端内容区 | 无透明度 | **支持半透明 + 毛玻璃（可配置）** |
| 整体层次 | AI 面板占右侧固定宽度 | AI 面板为 overlay 浮层或侧边抽屉 |

### 2.2 新布局结构

```
┌─────────────────────────────────────────────────────┐
│  TitleBar (不透明，Windows 标准窗口控制)              │
├─────────────────────────────────────────────────────┤
│  TabBar (不透明，标签切换 + AI 开关按钮)              │
├─────────────────────────────────────────────────────┤
│                                                     │
│              终端内容区 (可配置透明度)                │
│                                                     │
│                                                     │
└─────────────────────────────────────────────────────┘

[AI Chat Panel] → 点击 TabBar 按钮时从右侧滑入
```

### 2.3 AI 面板交互

- **唤起方式：** TabBar 右侧 AI 按钮
- **展开宽度：** `min(420px, 50vw)`，不超过屏幕一半
- **收起方式：** 点击关闭按钮 / ESC 键 / 点击外部

---

## 3. 半透明终端配置

### 3.1 新增设置项

在 `Settings > Appearance` 中新增：

| 配置项 | 类型 | 默认值 |
|--------|------|--------|
| `terminalTransparency` | toggle | `false` |
| `terminalOpacity` | slider (0.3–1.0) | `0.7` |
| `terminalBackdrop` | toggle | `false` (依赖透明度) |

### 3.2 CSS 变量扩展

```css
:root {
  /* 新增 */
  --terminal-bg: #0f1115;
  --terminal-opacity: 1;
  --terminal-blur: 0px;
}

/* 透明度启用时 */
:root[data-terminal-transparent="true"] {
  --terminal-opacity: var(--terminal-opacity-value);
  --terminal-blur: var(--terminal-backdrop-enabled) ? 20px : 0px;
}
```

### 3.3 实现位置

`.terminal-output` 应用：
```css
.terminal-output {
  background: rgba(var(--terminal-bg-rgb), var(--terminal-opacity));
  backdrop-filter: blur(var(--terminal-blur));
}
```

> 注：Electron 窗口需要设置 `transparent: true`（主进程 BrowserWindow 配置），且透明区域需要设置 `-webkit-app-region: transparent`。

---

## 4. 视觉风格重构（参考 Claude Desktop）

### 4.1 当前问题

- 过多 `color-mix()` 渐变覆盖层，视觉沉重
- TitleBar 渐变背景显得过时
- 按钮和边框的半透明白色叠加不符合现代审美

### 4.2 Claude 风格特征

| 特征 | 当前 Auto Shell | 改动 |
|------|----------------|------|
| 背景 | 多层渐变叠加 | **纯色 + 微妙噪点或干净背景** |
| 边框 | `rgba(255,255,255,0.08)` 普遍使用 | **更少边框，更依赖阴影和间距** |
| 标题栏 | 渐变背景 + 文字 | **纯色/毛玻璃 + 简洁文字** |
| 按钮 | 渐变背景 + 边框 | **扁平 + hover 微光** |
| 阴影 | `box-shadow` 软阴影 | **更少阴影或极轻阴影** |
| 圆角 | 普遍 999px（胶囊）| **更克制的圆角（6-12px）** |

### 4.3 TitleBar 重构

```css
.title-bar {
  background: var(--bg2);        /* 去掉渐变 */
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(12px);    /* 保留毛玻璃 */
}

/* 去掉 "AI Native Terminal" subtitle */
.title-sub {
  display: none;                  /* 减少视觉噪音 */
}
```

### 4.4 TabBar 重构

```css
.tab-bar {
  background: var(--bg2);
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(12px);
}

/* AI 开关按钮改为图标按钮 */
.ai-toggle-btn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  /* 简洁的机器人/对话图标 */
}
```

### 4.5 Terminal Shell Bar 简化

```css
.shell-bar {
  background: transparent;       /* 让终端背景透上来 */
  border-bottom: 1px solid var(--border);
  padding: 0 16px;
}

/* 去掉 shell-chip 的蓝色边框和背景 */
.shell-chip {
  border: none;
  background: transparent;
  color: var(--text2);
}
```

---

## 5. 输出可读性增强

### 5.1 ANSI 颜色优化

当前 xterm.js 使用默认 16 色映射，修改为更易读的配色：

| 用途 | 当前颜色 | 优化后 |
|------|---------|--------|
| 标准输出 | 白 `#d8dee9` | 保持 |
| 错误 | 红 `#ff6a6a` | 更柔和的红 `#e57373` |
| 警告 | 黄 `#ffb84d` | 琥珀 `#ffb74d` |
| 成功 | 绿 `#47d16c` | 保持 |
| 路径/文件 | 青 `#60d8ff` | 保持 |
| 命令/echo | 亮色 | 稍暗，保持对比度 |

> xterm.js 通过 `Theme` 对象配置，不需要改动核心代码。

### 5.2 JSON 输出格式化（可选增强）

当检测到输出为 JSON 时，在 AI Chat Panel 提供"格式化预览"按钮（暂不实现，先记录）。

---

## 6. 实现计划

### Phase 1：最小可用地改进（约 1-2 天）

1. AI Chat Panel 默认隐藏 + 改为侧边抽屉式
2. TitleBar 去掉渐变和 subtitle
3. Terminal opacity 配置项（Appearance Settings）
4. Electron 窗口透明化支持

### Phase 2：视觉精致化（约 2-3 天）

5. 全局颜色变量简化（减少 color-mix 使用）
6. TabBar 和 Shell Bar 视觉简化
7. 圆角和边框统一
8. Hover/focus 状态微调

### Phase 3：输出体验（约 2 天）

9. xterm.js 自定义主题（ANSI 颜色）
10. Shell bar 精简

---

## 7. Electron 透明窗口配置

**主进程改动（`src/main/index.ts`）：**

```typescript
// 需要添加透明窗口支持
webPreferences: {
  transparent: true,  // 窗口透明
  // ...
}
```

> 注意：透明窗口与阴影/边框可能冲突，需在窗口创建时权衡。

---

## 8. 配置持久化

**Settings Store 扩展：**

```typescript
interface AppearanceSettings {
  terminalTransparency: boolean;
  terminalOpacity: number;      // 0.3–1.0
  terminalBackdrop: boolean;
}
```

对应修改 `AppConfig` 类型和 IPC 持久化逻辑。

---

## 9. 设计原则总结

| 原则 | 应用 |
|------|------|
| **少即是多** | 去掉装饰性渐变，保留功能必要元素 |
| **层次分明** | 透明终端内容 + 不透明控制区 |
| **可配置性** | 所有视觉效果可关闭/调节 |
| **Windows 原生感** | 不追求 macOS 风格，保持 Windows 桌面语义 |
