# Auto Shell QClaw 风格重构方案

## 目标

参考 QClaw 的设计语言，将 Auto Shell 重构为 QClaw 风格的浅色主题布局。

## 布局结构

```
┌─────────────────────────────────────────────────────────┐
│  TitleBar (极简，纯色，窗口控制按钮)                        │
├──────────┬──────────────────────────────────────────────┤
│          │  TabBar (内嵌工作区顶部，圆角 Tab)               │
│  左侧     ├──────────────────────────────────────────────┤
│  边栏     │                                              │
│          │              终端工作区                         │
│  - Logo  │         (圆角容器，独立感强)                    │
│  - 搜索  │                                              │
│  - 命令  │                                              │
│    分组  │                                              │
│          │                                              │
│          ├──────────────────────────────────────────────┤
│          │  Shell Bar (精简: 绿点+名称+路径)              │
├──────────┴──────────────────────────────────────────────┤
│                                              [AI Drawer] │
└─────────────────────────────────────────────────────────┘
```

## 颜色系统

| 区域 | 颜色 |
|------|------|
| 全局背景 | `#ffffff` |
| 左侧边栏背景 | `#fafafa` |
| TabBar/工作区背景 | `#ffffff` |
| 边框 | `rgba(0,0,0,0.08)` |
| 文字主色 | `#1a1a1a` |
| 文字次色 | `#6b7280` |
| 文字弱色 | `#9ca3af` |
| Accent | `#4f8cff` |
| Accent 柔 | `rgba(79,140,255,0.08)` |
| 成功绿 | `#22c55e` |
| Tab 激活背景 | `#f5f5f5` |
| Tab 圆角 | 16px |

## 组件改动

### 1. global.css — 浅色主题变量

```css
:root {
  --bg: #ffffff;
  --bg2: #fafafa;
  --bg3: #f0f0f0;
  --bg4: #e5e5e5;
  --border: rgba(0,0,0,0.08);
  --border2: rgba(0,0,0,0.12);
  --text-primary: #1a1a1a;
  --text: #374151;
  --text2: #6b7280;
  --text3: #9ca3af;
  --accent: #4f8cff;
  --accent-light: #93b8ff;
  --accent-dim: rgba(79,140,255,0.08);
  --green: #22c55e;
  --yellow: #f59e0b;
  --red: #ef4444;
  --cyan: #06b6d4;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.06);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
  --shadow-lg: 0 12px 32px rgba(0,0,0,0.10);
  --tab-h: 44px;
  --sidebar-w: 220px;
}
```

### 2. App.tsx — 新布局

```
app
├── TitleBar
└── main
    ├── QuickCommands (左侧边栏, 固定宽度)
    └── workspace (flex: 1)
        ├── TabBar (工作区内部顶栏)
        └── Terminal (圆角容器)
```

### 3. QuickCommands → 左侧边栏

- 顶部 Logo "Auto Shell" (细体字)
- 搜索框 (pill 形，圆角)
- 命令分组列表 (QClaw 风格)
- 底部: 设置图标按钮

### 4. TabBar → 工作区内部

- Tab 圆角 16px，激活态有背景色
- 去掉外层 TabBar，整个应用只有一个 TabBar（在工作区内部）
- AI 按钮移到工作区右上角

### 5. Terminal 容器

- 四周 16px 圆角边框
- 内阴影增加深度
- TabBar + Terminal 整体在圆角容器内

### 6. AI Chat Panel

- 保持 drawer，从右侧滑入
- 样式适配浅色主题

## 执行步骤

1. global.css — 完整浅色主题变量重写
2. App.tsx — 新布局结构（去除外层 TabBar）
3. QuickCommands — QClaw 风格侧边栏（固定显示，不折叠）
4. TabBar — 移入 Terminal 容器内部
5. Terminal — 圆角容器包裹
6. AIChatPanel — 适配浅色主题
7. TitleBar — 简化
