# Auto Shell

Auto Shell 是一个面向 Windows 开发者的 AI 桌面终端，把多标签终端、AI 对话、自然语言转命令、模型配置和快捷操作整合到同一个工作台中。

## 项目优势

- 更贴近 Windows 桌面语义，不走传统 mac 风格终端壳子的设计路线
- 终端与 AI 协同工作，不需要在浏览器、聊天工具和命令行之间反复切换
- 支持多模型接入，可根据任务自由切换云端模型或本地模型
- 模型配置即时生效，适合调试 API、切换代理网关和验证不同模型能力
- 基于 Electron + React + xterm.js，易于二次开发和扩展

## 功能特性

- 多标签终端工作区
- PowerShell / CMD / WSL / Git Bash 支持
- AI 对话面板
- `#` 自然语言转命令
- 命令解释与错误分析
- 模型配置中心
- 快捷命令面板
- 主题切换与界面设置持久化

## 支持的模型

当前版本已经支持以下模型入口：

- MiniMax
- GLM
- Claude
- OpenAI
- Ollama
- OpenAI Compatible 接口

这意味着你可以接入官方接口，也可以接入兼容 OpenAI 协议的网关服务。

## 下载地址

- 官网：[https://dmfighting.top/autoShell](https://dmfighting.top/autoShell)
- Windows 安装包：[https://dmfighting.top/autoShell/autoShell.exe](https://dmfighting.top/autoShell/autoShell.exe)

## 适合谁用

- 经常使用 PowerShell、命令行和脚本的 Windows 开发者
- 需要一边跑终端一边和 AI 协作的工程师
- 希望把多模型能力接入本地桌面工具的团队
- 想基于 Electron 继续扩展 AI Terminal 产品的开发者

## 技术栈

- Electron
- Electron Vite
- React 18
- TypeScript
- xterm.js
- node-pty
- Zustand

## 本地开发

```bash
npm install
npm run dev
```

## 构建与打包

构建前端与主进程：

```bash
npm run build
```

打包 Windows 安装包：

```bash
npm run package:win
```

打包 macOS 安装包：

```bash
npm run package:mac
```

说明：

- Windows 安装包建议在 Windows 环境下构建
- macOS 安装包建议在 macOS 环境下构建
- 默认图标资源使用项目根目录下的 `logo.png`

## 目录结构

```text
src/
├─ ai/               AI Provider 抽象与实现
├─ main/             Electron 主进程
├─ renderer/         React 渲染层
├─ shared/           主渲染共享类型与 IPC 定义
└─ preload.ts        安全桥接层

site/
└─ autoShell/        官网宣传页与安装包发布目录
```

## 路线方向

Auto Shell 不是单纯给终端加一个聊天窗口，而是希望把下面这套流程做顺：

1. 用自然语言描述需求
2. 选择合适模型处理任务
3. 把结果回落到终端执行
4. 继续在同一工作区内调试、修正和部署

如果你也认同这个方向，欢迎一起把它做成更完整的 AI Native Terminal。

## 赞助与支持

如果这个项目对你有帮助，欢迎请作者喝杯咖啡，支持持续迭代。

### 微信赞助

![微信赞助](./wechat-pay-qr.jpg)

### 支付宝赞助

![支付宝赞助](./alipay-qr.jpg)

## 贡献方式

欢迎通过以下方式参与贡献：

- 提交 Issue 反馈 bug 或产品建议
- 提交 Pull Request 改进功能与体验
- 补充文档、测试和模型接入方案
- 帮忙传播项目，让更多 Windows 开发者看到

如果你准备提交较大改动，建议先开一个 Issue 对齐方向。

## License

MIT
