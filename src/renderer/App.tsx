import React, { useEffect, useState } from 'react';
import { AIChatPanel } from './components/AIChatPanel';
import { QuickCommands } from './components/QuickCommands';
import { Settings } from './components/Settings';
import { TabBar } from './components/TabBar';
import { Terminal } from './components/Terminal';
import { TitleBar } from './components/TitleBar';
import { ToastContainer } from './components/Toast';
import { detectPlatform } from './platform';
import { useSettingsStore } from './store/settings';
import { useTabsStore } from './store/tabs';

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [settingsTab, setSettingsTab] = useState<'appearance' | 'ai' | 'system'>('ai');
  const loadSettings = useSettingsStore((state) => state.load);
  const loadSession = useTabsStore((state) => state.loadSession);
  const platform = detectPlatform();

  useEffect(() => {
    void loadSettings();
    void loadSession();
  }, [loadSession, loadSettings]);

  return (
    <div className="app" data-platform={platform}>
      {platform !== 'macos' && <TitleBar />}
      <TabBar
        onOpenChat={() => setChatOpen((current) => !current)}
        onOpenSettings={() => {
          setSettingsTab('ai');
          setSettingsOpen(true);
        }}
      />
      <div className="main">
        <QuickCommands />
        <Terminal />
        <AIChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
      </div>
      <Settings open={settingsOpen} defaultTab={settingsTab} onClose={() => setSettingsOpen(false)} />
      <ToastContainer />
      <style>{`
        .app {
          display: grid;
          grid-template-rows: ${platform === 'macos' ? 'var(--tab-h) 1fr' : '34px var(--tab-h) 1fr'};
          height: 100vh;
        }
        .main {
          display: flex;
          overflow: hidden;
          position: relative;
          min-height: 0;
        }
      `}</style>
    </div>
  );
}
