# Auto Shell UI 美化方案

## 当前问题

1. **视觉层次浅** — 无阴影体系，元素漂浮感弱
2. **配色平淡** —  accent 色 `#4c8dff` 偏标准蓝，缺少品牌个性
3. **TabBar 渐变过时** — `color-mix` 叠层效果粗糙
4. **Shell Bar 信息过载** — "PowerShell" 重复出现，hint 文字拥挤
5. **图标简陋** — SVG 无精修，视觉粗糙
6. **无噪点/纹理** — 纯色背景缺少质感
7. **xterm.js 主题平淡** — ANSI 颜色未定制

---

## 美化方向

### 1. CSS 变量体系增强

**新增变量：**

```css
/* 阴影体系 */
--shadow-sm: 0 2px 8px rgba(0,0,0,0.18);
--shadow-md: 0 8px 24px rgba(0,0,0,0.22);
--shadow-lg: 0 16px 48px rgba(0,0,0,0.28);

/* 新的 accent 色调 — 更偏青蓝，更有品牌感 */
--accent: #5b8eff;
--accent-light: #8aadff;
--accent-glow: rgba(91,142,255,0.25);

/* 背景层次 */
--surface-raised: rgba(255,255,255,0.03);
--surface-overlay: rgba(255,255,255,0.06);

/* 文字层次 */
--text-primary: #e8ecf0;
--text-secondary: #9ba8b8;
--text-muted: #5c6677;

/* 边框精化 */
--border-subtle: rgba(255,255,255,0.06);
--border-default: rgba(255,255,255,0.10);
--border-strong: rgba(255,255,255,0.16);
```

### 2. 全局背景增强

```css
/* 去掉过度的 radial-gradient，改为更克制的角落光晕 */
body {
  background:
    radial-gradient(ellipse 80% 50% at 50% -20%, rgba(91,142,255,0.08) 0%, transparent 60%),
    linear-gradient(180deg, #0f1115 0%, #131620 100%);
}

/* 添加细微噪点纹理 */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: 0.025;
  pointer-events: none;
  z-index: 0;
}
```

### 3. TabBar 美化

- 去掉 `color-mix` 渐变背景，改为微妙的 solid + 顶部高光线
- Tab 选中态添加底部 accent 指示条（2px）
- Tab hover 添加subtle 提升效果
- 图标按钮添加 press 反馈动画

```css
#tabbar {
  background: var(--bg2);
  border-bottom: 1px solid var(--border-subtle);
  box-shadow: 0 1px 0 rgba(255,255,255,0.03);
  /* 去掉 backdrop-filter blur — 太耗性能且效果不明显 */
}

.tab.active {
  background: var(--surface-raised);
  border: 1px solid var(--border-default);
  border-bottom: 2px solid var(--accent); /* 底部 accent 指示条 */
  box-shadow: var(--shadow-sm);
}
```

### 4. Shell Bar 精简

当前问题：信息过载 — shell 名出现 3 次

改进方案：
- 只保留：绿色状态点 + Tab 名称 + 当前目录路径
- 去掉 "PowerShell" badge（Tab 上已有）
- 去掉 hint 文字（用户已知如何在终端输入）
- 目录路径使用更柔和的文字色

```css
.shell-bar {
  background: rgba(255,255,255,0.015);
  border-bottom: 1px solid var(--border-subtle);
  padding: 0 20px;
}

.shell-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 只保留 shell-kind（badge），去掉重复信息 */
.shell-hint { display: none; }  /* hint 文字不需要，太拥挤 */
```

### 5. 图标精细化

当前图标太粗且无精修感。替换为更精细的 SVG：

**菜单图标（hamburger）** — 3 条细线，圆角端点
**AI 对话图标** — 更圆润的气泡造型
**设置图标** — 齿轮更圆润

### 6. 终端区域质感

- 添加内阴影增加深度感
- 边框改为 `--border-subtle`
- xterm.js 背景使用深色 `#0a0b0f` 而非纯黑

### 7. Settings 面板美化

- 卡片去掉边框，改为阴影 + 微透明背景
- 圆角统一为 16px
- 设置项之间用留白分隔，不用分割线

---

## 实现计划

| 优先级 | 改动 | 范围 |
|--------|------|------|
| P0 | CSS 变量增强 + 全局背景 | global.css |
| P0 | TabBar 视觉提升 | TabBar/index.tsx |
| P0 | Shell Bar 信息精简 | Terminal/index.tsx |
| P1 | 精细图标替换 | TabBar/index.tsx |
| P1 | 终端区域质感 | global.css + Terminal |
| P2 | Settings 面板美化 | Settings/index.tsx |

