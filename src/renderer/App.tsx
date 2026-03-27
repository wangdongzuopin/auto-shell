import React, { useEffect, useState } from 'react';
import { TabBar } from './components/TabBar';
import { Terminal } from './components/Terminal';
import { Settings } from './components/Settings';
import { QuickCommands } from './components/QuickCommands';
import { ToastContainer } from './components/Toast';
import { useSettingsStore } from './store/settings';
import { useTabsStore } from './store/tabs';

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'appearance' | 'ai' | 'system'>('ai');
  const loadSettings = useSettingsStore(s => s.load);
  const sidebarOpen = useTabsStore(s => s.sidebarOpen);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return (
    <div className="app">
      <TabBar onSettings={() => { setSettingsTab('ai'); setSettingsOpen(true); }} />
      <div className="main">
        <QuickCommands />
        <Terminal />
      </div>
      <Settings
        open={settingsOpen}
        defaultTab={settingsTab}
        onClose={() => setSettingsOpen(false)}
      />
      <ToastContainer />
      <style>{`
        .app { display: grid; grid-template-rows: var(--tab-h) 1fr; height: 100vh; }
        .main { display: flex; overflow: hidden; position: relative; }
      `}</style>
    </div>
  );
}
