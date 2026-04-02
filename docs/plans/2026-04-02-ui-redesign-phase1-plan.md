# UI Redesign Phase 1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现 UI 重构 Phase 1：AI 面板改为抽屉式 + TitleBar 简化 + 透明度配置 + Electron 透明窗口

**Architecture:** 在 renderer 层处理透明度 CSS 变量，主进程添加透明窗口配置。AI 面板从默认展开改为默认隐藏的 drawer 动画。配置通过 settings store 扩展，新增 `AppearanceSettings` 接口。

**Tech Stack:** React, CSS Variables, Electron BrowserWindow, Zustand

---

## Task 1: AI Chat Panel 改为抽屉式，默认隐藏

**Files:**
- Modify: `src/renderer/App.tsx:15` — `chatOpen` 默认值 `true` → `false`
- Modify: `src/renderer/components/AIChatPanel/index.tsx:220-490` — drawer 样式改造
- Modify: `src/renderer/components/TabBar/index.tsx` — AI 按钮保持不变（已有 toggle 功能）

**Step 1: 修改 App.tsx 默认状态**

```typescript
// src/renderer/App.tsx:15
const [chatOpen, setChatOpen] = useState(false); // 原来是 true
```

**Step 2: 给 AIChatPanel 添加 drawer 动画和遮罩**

在 `AIChatPanel/index.tsx` 的 `<style>` 块中，找到 `.chat-panel` 样式，替换为：

```css
.chat-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  transform: translateX(100%);
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 30;
}
.chat-panel.open {
  transform: translateX(0);
}
.chat-panel-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s ease;
  z-index: 25;
}
.chat-panel-overlay.visible {
  opacity: 1;
  pointer-events: auto;
}
```

**Step 3: 修改 AIChatPanel 组件接收 `open` prop 并应用 drawer 逻辑**

在组件 JSX 中添加 overlay div：

```tsx
<div className={`chat-panel-overlay ${open ? 'visible' : ''}`} onClick={onClose} />
<div className={`chat-panel ${open ? 'open' : ''}`}>
```

去掉 `if (!open) return null;` 那行。

**Step 4: 验证效果**

运行 `npm run dev`，确认：
- 启动后 AI 面板默认不显示
- 点击 TabBar 的 AI 按钮，面板从右侧滑入
- 点击面板外部或关闭按钮，面板滑出

**Step 5: 提交**

```bash
git add src/renderer/App.tsx src/renderer/components/AIChatPanel/index.tsx
git commit -m "feat(ui): AI panel becomes hidden drawer by default"
```

---

## Task 2: TitleBar 简化 — 去掉渐变和 subtitle

**Files:**
- Modify: `src/renderer/components/TitleBar/index.tsx:28-87` — 样式部分

**Step 1: 修改 TitleBar 样式**

替换 `<style>` 块中的 `.title-bar` 相关样式：

```css
.title-bar {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  height: 34px;
  background: var(--bg2);  /* 去掉渐变 */
  border-bottom: 1px solid var(--border);
  -webkit-app-region: drag;
  user-select: none;
}

/* 删除或隐藏 .title-sub */
.title-sub {
  display: none;
}

/* title-bar-drag 去掉左侧 padding */
.title-bar-drag {
  display: flex;
  align-items: center;
  padding-left: 16px;
  flex: 1;
  min-width: 0;
}
```

**Step 2: 验证效果**

运行 `npm run dev`，确认 TitleBar 背景变为纯色，`AI Native Terminal` 文字消失。

**Step 3: 提交**

```bash
git add src/renderer/components/TitleBar/index.tsx
git commit -m "feat(ui): simplify TitleBar, remove gradient and subtitle"
```

---

## Task 3: 新增 AppearanceSettings 类型和配置持久化

**Files:**
- Modify: `src/shared/types.ts` — 添加 `AppearanceSettings` 接口
- Modify: `src/main/session-store.ts` — 扩展 `PersistedConfig`，添加 `setAppearance`/`getAppearance`
- Modify: `src/main/ipc-handlers.ts` — 注册 appearance 相关 IPC handler
- Modify: `src/shared/ipc-channels.ts` — 添加新的 IPC 通道常量

**Step 1: 添加 AppearanceSettings 类型**

在 `src/shared/types.ts` 末尾添加：

```typescript
export interface AppearanceSettings {
  terminalTransparency: boolean;
  terminalOpacity: number;      // 0.3–1.0
  terminalBackdrop: boolean;
}
```

**Step 2: 添加 IPC 通道**

在 `src/shared/ipc-channels.ts` 中添加：

```typescript
CONFIG_SET_APPEARANCE: 'config:set-appearance',
CONFIG_GET_APPEARANCE: 'config:get-appearance',
```

**Step 3: 扩展 PersistedConfig 和相关函数**

在 `session-store.ts` 中：

在 `PersistedConfig` 接口添加 `appearance: AppearanceSettings`。
在 `defaultConfig` 中添加：

```typescript
appearance: {
  terminalTransparency: false,
  terminalOpacity: 0.7,
  terminalBackdrop: false
}
```

添加导出函数：

```typescript
export function getAppearance(): AppearanceSettings {
  return readPersistedConfig().appearance;
}

export function setAppearance(appearance: AppearanceSettings) {
  updatePersistedConfig((current) => ({
    ...current,
    appearance
  }));
}
```

**Step 4: 注册 IPC handler**

在 `ipc-handlers.ts` 添加：

```typescript
ipcMain.handle(IPC.CONFIG_GET_APPEARANCE, () => getAppearance());

ipcMain.handle(IPC.CONFIG_SET_APPEARANCE, (_event, appearance: AppearanceSettings) => {
  setAppearance(appearance);
  return true;
});
```

**Step 5: 验证编译**

运行 `npm run build`，确认无 TypeScript 错误。

**Step 6: 提交**

```bash
git add src/shared/types.ts src/shared/ipc-channels.ts src/main/session-store.ts src/main/ipc-handlers.ts
git commit -m "feat(settings): add AppearanceSettings type and IPC handlers"
```

---

## Task 4: Renderer 层 Appearance Settings Store 和 UI

**Files:**
- Modify: `src/renderer/store/settings.ts` — 扩展 state 和 actions
- Modify: `src/renderer/components/Settings/ThemeSelector.tsx` — 添加透明度配置 UI
- Modify: `src/preload.ts` 或 `src/preload/index.ts` — 暴露新的 IPC 方法

**Step 1: 扩展 preload 暴露方法**

检查 `src/preload.ts`（或 `src/preload/index.ts`），添加：

```typescript
saveAppearance: (appearance: AppearanceSettings) => ipcRenderer.invoke(IPC.CONFIG_SET_APPEARANCE, appearance),
getAppearance: () => ipcRenderer.invoke(IPC.CONFIG_GET_APPEARANCE),
```

**Step 2: 扩展 settings store**

在 `src/renderer/store/settings.ts` 中：

添加 `appearance: AppearanceSettings` 到 state interface。
添加 `loadAppearance`, `setAppearance` 到 state actions。

在 `load()` 中，从 `window.api.getAppearance()` 读取并设置。

添加 `setAppearance` action：

```typescript
setAppearance: async (appearance) => {
  set({ appearance });
  await window.api.saveAppearance(appearance);
}
```

**Step 3: 在 ThemeSelector 中添加透明度配置 UI**

在 `ThemeSelector.tsx` 中添加新的 section：

```tsx
<div className="settings-section">
  <div className="section-title">终端透明度</div>
  <ToggleRow
    label="启用半透明背景"
    checked={appearance.terminalTransparency}
    onChange={(v) => setAppearance({ ...appearance, terminalTransparency: v })}
  />
  {appearance.terminalTransparency && (
    <>
      <div className="slider-row">
        <span className="slider-label">透明度</span>
        <input
          type="range"
          min="30"
          max="100"
          value={appearance.terminalOpacity * 100}
          onChange={(e) => setAppearance({ ...appearance, terminalOpacity: Number(e.target.value) / 100 })}
        />
        <span className="slider-value">{Math.round(appearance.terminalOpacity * 100)}%</span>
      </div>
      <ToggleRow
        label="毛玻璃效果"
        checked={appearance.terminalBackdrop}
        onChange={(v) => setAppearance({ ...appearance, terminalBackdrop: v })}
      />
    </>
  )}
</div>
```

添加对应 CSS：

```css
.slider-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}
.slider-label {
  font-size: 12px;
  color: var(--text2);
  min-width: 56px;
}
.slider-row input[type="range"] {
  flex: 1;
  accent-color: var(--accent);
}
.slider-value {
  font-size: 11px;
  color: var(--text3);
  font-family: var(--mono);
  min-width: 36px;
  text-align: right;
}
```

**Step 4: 验证效果**

运行 `npm run dev`，在 Settings > Appearance 中确认有透明度配置项，调节 slider 后 terminal-output 区域透明度变化。

**Step 5: 提交**

```bash
git add src/preload.ts src/renderer/store/settings.ts src/renderer/components/Settings/ThemeSelector.tsx
git commit -m "feat(settings): add terminal transparency controls to Appearance settings"
```

---

## Task 5: Electron 透明窗口支持

**Files:**
- Modify: `src/main/index.ts` — BrowserWindow 配置添加 `transparent: true`
- Modify: `src/renderer/App.tsx` — 应用 `terminal-opacity` CSS 变量到 `.terminal-output`
- Modify: `src/renderer/styles/global.css` — 添加 `--terminal-opacity` 变量

**Step 1: 主进程添加透明窗口配置**

在 `src/main/index.ts` 的 `createWindow` 函数中，找到 `webPreferences` 配置，添加：

```typescript
webPreferences: {
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: false,
  preload: path.join(__dirname, '../preload/index.js'),
  transparent: false  // 先设为 false，避免开发环境出问题
}
```

> 注：Electron 透明窗口在开发模式下可能有渲染问题。生产环境打包时才设置为 `true`。可以在环境变量中控制：
> `transparent: process.env.NODE_ENV === 'production'`

**Step 2: global.css 添加终端透明度 CSS 变量**

在 `:root` 中添加：

```css
:root {
  /* 新增 */
  --terminal-bg: #0f1115;
  --terminal-opacity: 1;
  --terminal-blur: 0px;
  /* 现有变量保持不变 */
}
```

**Step 3: App.tsx 中应用透明度样式**

在 `<style>` 块中 `.terminal-output` 应用：

```css
.terminal-output {
  flex: 1;
  padding: 16px 20px;
  overflow: hidden;
  cursor: text;
  background: rgba(15, 17, 21, var(--terminal-opacity));
  backdrop-filter: blur(var(--terminal-blur));
}
```

**Step 4: settings store 应用透明度到 CSS 变量**

在 `applyThemeToDocument` 函数末尾（settings.ts），添加：

```typescript
// 应用终端透明度
const ta = get().appearance;
document.documentElement.style.setProperty('--terminal-opacity', ta.terminalTransparency ? String(ta.terminalOpacity) : '1');
document.documentElement.style.setProperty('--terminal-blur', ta.terminalTransparency && ta.terminalBackdrop ? '20px' : '0px');
document.documentElement.dataset.terminalTransparent = String(ta.terminalTransparency);
```

**Step 5: 验证效果**

运行 `npm run dev`，确认：
- 透明度关闭时，终端区域完全不透明
- 开启透明度后，背景按配置的 opacity 显示
- 毛玻璃开关影响 backdrop-filter

> 注意：透明窗口在 `npm run dev` 时可能无法正常显示透明效果（Electron 限制），以 `npm run build && npm run package:win` 打包后为准。

**Step 6: 提交**

```bash
git add src/main/index.ts src/renderer/App.tsx src/renderer/styles/global.css src/renderer/store/settings.ts
git commit -m "feat(ui): add Electron transparent window support for terminal area"
```

---

## Task 6: 收尾 — Terminal Shell Bar 简化

**Files:**
- Modify: `src/renderer/components/Terminal/index.tsx:93-178` — shell-bar 样式

**Step 1: 简化 shell-bar 样式**

替换 `.shell-bar` 相关样式为：

```css
.shell-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 16px;
  min-height: 42px;
  border-bottom: 1px solid var(--border);
  background: transparent;  /* 让终端背景透上来 */
}

.shell-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 10px;
  border-radius: 6px;  /* 原来是 999px */
  font-size: 11px;
  font-family: var(--mono);
  color: var(--text2);  /* 原来是 var(--text) */
  border: none;          /* 去掉蓝色边框 */
  background: transparent; /* 去掉蓝色背景 */
}

.shell-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--green);
}

.shell-kind {
  padding: 3px 8px;
  border-radius: 6px;
  background: transparent;  /* 去掉背景 */
  border: 1px solid var(--border);
  color: var(--text3);    /* 原来是 var(--accent) */
  font-size: 10px;
  font-family: var(--mono);
  flex-shrink: 0;
}
```

**Step 2: 验证效果**

运行 `npm run dev`，确认 shell bar 更简洁，蓝色的强调色减少。

**Step 3: 提交**

```bash
git add src/renderer/components/Terminal/index.tsx
git commit -m "feat(ui): simplify shell bar visual style"
```

---

## 验证清单

完成所有 Task 后，确认以下内容：

- [ ] AI Chat Panel 默认隐藏，点击按钮从右侧滑入
- [ ] TitleBar 背景为纯灰色，非渐变，无 "AI Native Terminal" 文字
- [ ] Settings > Appearance 中有透明度开关、透明度 slider、毛玻璃开关
- [ ] 开启透明度后终端内容区背景变为半透明
- [ ] Shell bar 简洁，蓝紫色装饰减少
- [ ] `npm run build` 编译通过
- [ ] 所有 commit 已创建
