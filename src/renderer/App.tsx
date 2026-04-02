import React, { useEffect, useState } from 'react';
import { AIChatPanel } from './components/AIChatPanel';
import { QuickCommands } from './components/QuickCommands';
import { Settings } from './components/Settings';
import { TabBar } from './components/TabBar';
import { Terminal } from './components/Terminal';
import { TitleBar } from './components/TitleBar';
import { ToastContainer } from './components/Toast';
import { detectPlatform } from './platform';
import { usePetStore } from './store/pet';
import { useSettingsStore } from './store/settings';
import { useTabsStore } from './store/tabs';

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'appearance' | 'ai' | 'system'>('appearance');
  const loadSettings = useSettingsStore((state) => state.load);
  const loadSession = useTabsStore((state) => state.loadSession);
  const setWindowFocused = usePetStore((state) => state.setWindowFocused);
  const platform = detectPlatform();

  useEffect(() => {
    void loadSettings();
    void loadSession();
  }, [loadSession, loadSettings]);

  useEffect(() => {
    const handleFocus = () => setWindowFocused(true);
    const handleBlur = () => setWindowFocused(false);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    handleFocus();

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [setWindowFocused]);

  return (
    <div className="app" data-platform={platform}>
      {platform !== 'macos' && <TitleBar />}
      <div className="main">
        {/* 左侧边栏 — 固定显示 */}
        <QuickCommands />
        {/* 工作区 */}
        <div className="workspace">
          <div className="workspace-inner">
            {/* TabBar 在工作区内部 */}
            <TabBar
              onOpenChat={() => setChatOpen((current) => !current)}
              onOpenSettings={() => {
                setSettingsTab('appearance');
                setSettingsOpen(true);
              }}
            />
            {/* 终端 — 圆角容器 */}
            <div className="terminal-wrapper">
              <Terminal />
            </div>
          </div>
        </div>
        {/* AI Chat Drawer */}
        <AIChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
      </div>
      <Settings open={settingsOpen} defaultTab={settingsTab} onClose={() => setSettingsOpen(false)} />
      <ToastContainer />
      <style>{`
        .app {
          display: grid;
          grid-template-rows: ${platform === 'macos' ? '0 1fr' : '34px 1fr'};
          height: 100vh;
          background:
            radial-gradient(circle at top, rgba(var(--bg-rgb), 0.12), transparent 36%),
            linear-gradient(180deg, rgba(var(--bg-rgb), 0.58), rgba(var(--bg-rgb), 0.42));
        }
        .app > .title-bar { grid-row: 1; }
        .main {
          display: flex;
          overflow: hidden;
          position: relative;
          min-height: 0;
          background: transparent;
        }
        .workspace {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          padding: 0;
        }
        .workspace-inner {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          background: rgba(var(--bg-rgb), var(--terminal-shell-alpha));
          border-left: 1px solid var(--border);
          overflow: hidden;
          box-shadow: none;
          backdrop-filter: blur(calc(8px + var(--terminal-blur) * 0.2));
          -webkit-backdrop-filter: blur(calc(8px + var(--terminal-blur) * 0.2));
        }
        .terminal-wrapper {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-height: 0;
          border-top: 1px solid var(--border);
          background: rgba(var(--bg-rgb), calc(var(--terminal-shell-alpha) * 0.7));
        }
      `}</style>
    </div>
  );
}
