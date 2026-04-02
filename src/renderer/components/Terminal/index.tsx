import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAIStore } from '../../store/ai';
import { useSettingsStore } from '../../store/settings';
import { useTabsStore } from '../../store/tabs';
import { useTerminal } from '../../hooks/useTerminal';
import { AICard } from '../AICard';
import { ExplainTooltip } from '../ExplainTooltip';
import { CommandProgressBar } from '../CommandProgressBar';
import { useCommandProgress } from '../../hooks/useCommandProgress';
import { usePetStore } from '../../store/pet';
import { classifyCommand } from '../../../tools/commandClassifier';

export function Terminal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ text: string; position: { x: number; y: number } } | null>(null);
  const { progress, isVisible, startTracking, complete } = useCommandProgress();

  const activeTabId = useTabsStore((state) => state.activeTabId);
  const tabs = useTabsStore((state) => state.tabs);
  const recordCommand = useTabsStore((state) => state.recordCommand);
  const setTabCwd = useTabsStore((state) => state.setTabCwd);
  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const errorCardOpen = useAIStore((state) => state.errorCardOpen);
  const theme = useSettingsStore((state) => state.theme);
  const appearance = useSettingsStore((state) => state.appearance);
  const startPetWorking = usePetStore((state) => state.startWorking);

  const handleSelectionChange = useCallback((selection: string, position: { x: number; y: number }) => {
    setTooltip({ text: selection, position });
  }, []);

  const handleCommandStart = useCallback((command: string) => {
    startTracking(command);
    const classified = classifyCommand(command);
    startPetWorking(command, classified?.isLongRunning ? 12000 : 2600);

    if (!activeTabId || !activeTab) {
      return;
    }

    void recordCommand(activeTab.cwd, command);

    const nextCwd = parseNextCwd(activeTab.shell, activeTab.cwd, command);
    if (nextCwd) {
      setTabCwd(activeTabId, nextCwd);
    }
  }, [activeTab, activeTabId, recordCommand, setTabCwd, startPetWorking, startTracking]);

  const { focus } = useTerminal(
    containerRef,
    activeTabId || '1',
    activeTab?.shell,
    activeTab?.cwd,
    theme,
    appearance,
    handleSelectionChange,
    handleCommandStart,
    complete
  );

  useEffect(() => {
    setTooltip(null);
  }, [activeTabId]);

  if (!activeTab) {
    return <div className="terminal-empty">没有活动终端</div>;
  }

  return (
    <div className="terminal-container">
      <div
        className="terminal-output"
        ref={containerRef}
        tabIndex={0}
        onMouseDown={() => focus()}
        onFocus={() => focus()}
      />
      {isVisible && progress && <CommandProgressBar progress={progress} />}
      {errorCardOpen && <AICard />}
      {tooltip && (
        <ExplainTooltip
          selectedText={tooltip.text}
          position={tooltip.position}
          onClose={() => setTooltip(null)}
        />
      )}
      <style>{`
        .terminal-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: transparent;
          overflow: hidden;
          position: relative;
        }
        .terminal-output {
          flex: 1;
          padding: 12px 16px;
          overflow: hidden;
          cursor: text;
          background: transparent;
        }
        .terminal-output .xterm {
          height: 100%;
        }
        .terminal-empty {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text3);
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}

function parseNextCwd(shell: string, currentCwd: string, command: string): string | null {
  const trimmed = command.trim();
  if (!trimmed) {
    return null;
  }

  const target = extractTargetPath(shell, trimmed);
  if (!target) {
    return null;
  }

  return resolvePath(currentCwd, target, shell === 'powershell' || shell === 'cmd');
}

function extractTargetPath(shell: string, command: string): string | null {
  if (shell === 'powershell') {
    const setLocationMatch = command.match(/^set-location(?:\s+-literalpath|\s+-path)?\s+(.+)$/i);
    if (setLocationMatch) {
      return cleanPathToken(setLocationMatch[1]);
    }
  }

  const cdMatch = command.match(/^(?:cd|chdir)\s+(.+)$/i);
  if (!cdMatch) {
    return null;
  }

  return cleanPathToken(cdMatch[1]);
}

function cleanPathToken(value: string): string {
  const withoutComment = value.split(/\s+#/)[0].trim();
  const unquoted = withoutComment.replace(/^['"]|['"]$/g, '');
  return unquoted.trim();
}

function resolvePath(currentCwd: string, target: string, windowsStyle: boolean): string {
  if (!target || target === '.') {
    return currentCwd;
  }

  if (target === '~') {
    return '~';
  }

  if (target.startsWith('~/')) {
    return target;
  }

  if (windowsStyle) {
    if (/^[a-zA-Z]:[\\/]/.test(target) || target.startsWith('\\\\')) {
      return normalizeSegments(target, true);
    }
  } else if (target.startsWith('/')) {
    return normalizeSegments(target, false);
  }

  const separator = windowsStyle ? '\\' : '/';
  const base = currentCwd === '~' ? '~' : currentCwd;
  const joined = base.endsWith(separator) || base === '~' ? `${base}${target}` : `${base}${separator}${target}`;
  return normalizeSegments(joined, windowsStyle);
}

function normalizeSegments(value: string, windowsStyle: boolean): string {
  const separator = windowsStyle ? '\\' : '/';
  const normalized = windowsStyle ? value.replace(/\//g, '\\') : value.replace(/\\/g, '/');
  const isUnc = windowsStyle && normalized.startsWith('\\\\');
  const driveMatch = windowsStyle ? normalized.match(/^[a-zA-Z]:/) : null;
  const homePrefix = normalized.startsWith('~') ? '~' : '';

  const remainder = homePrefix
    ? normalized.slice(1)
    : driveMatch
      ? normalized.slice(driveMatch[0].length)
      : isUnc
        ? normalized.slice(2)
        : normalized;

  const segments = remainder
    .split(/[\\/]+/)
    .filter(Boolean)
    .reduce<string[]>((parts, segment) => {
      if (segment === '.') {
        return parts;
      }

      if (segment === '..') {
        parts.pop();
        return parts;
      }

      parts.push(segment);
      return parts;
    }, []);

  const body = segments.join(separator);

  if (homePrefix) {
    return body ? `~${separator}${body}` : '~';
  }

  if (driveMatch) {
    return body ? `${driveMatch[0]}${separator}${body}` : `${driveMatch[0]}${separator}`;
  }

  if (isUnc) {
    return body ? `\\\\${body}` : '\\\\';
  }

  return normalized.startsWith(separator) ? `${separator}${body}` : body;
}
