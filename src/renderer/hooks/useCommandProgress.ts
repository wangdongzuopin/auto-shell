import { useState, useEffect, useRef, useCallback } from 'react';
import { classifyCommand, ClassifiedCommand } from '../../tools/commandClassifier';

export interface ProgressInfo {
  command: string;
  type: ClassifiedCommand['type'];
  startTime: number;
  elapsed: number;        // 秒
  progress: number;       // 0-100
  output: string[];        // 最新输出行
  isComplete: boolean;
}

interface UseCommandProgressOptions {
  minDuration: number;     // 最小显示时间(ms)
  autoHideDelay: number;   // 完成后自动隐藏延迟(ms)
}

const DEFAULT_OPTIONS: UseCommandProgressOptions = {
  minDuration: 3000,
  autoHideDelay: 2000,
};

export function useCommandProgress(options: Partial<UseCommandProgressOptions> = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const outputBufferRef = useRef<string[]>([]);

  // 启动进度跟踪
  const startTracking = useCallback((command: string) => {
    const classified = classifyCommand(command);

    if (!classified) {
      // 非长时命令，不显示进度
      return;
    }

    const startTime = Date.now();
    outputBufferRef.current = [];

    setProgress({
      command: classified.raw,
      type: classified.type,
      startTime,
      elapsed: 0,
      progress: 0,
      output: [],
      isComplete: false,
    });
    setIsVisible(true);

    // 启动定时器更新 elapsed
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setProgress((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          elapsed,
          // 基于时间的伪进度（无法准确估算时）
          progress: Math.min(95, elapsed * 10),
        };
      });
    }, 1000);
  }, []);

  // 添加输出行
  const addOutput = useCallback((line: string) => {
    outputBufferRef.current.push(line);
    if (outputBufferRef.current.length > 5) {
      outputBufferRef.current.shift();
    }
    setProgress((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        output: [...outputBufferRef.current],
      };
    });
  }, []);

  // 完成命令
  const complete = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setProgress((prev) => {
      if (!prev) return null;
      return { ...prev, progress: 100, isComplete: true };
    });

    // 自动隐藏
    setTimeout(() => {
      setIsVisible(false);
      setProgress(null);
    }, opts.autoHideDelay);
  }, [opts.autoHideDelay]);

  // 取消跟踪
  const cancel = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsVisible(false);
    setProgress(null);
    outputBufferRef.current = [];
  }, []);

  // 清理
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    progress,
    isVisible,
    startTracking,
    addOutput,
    complete,
    cancel,
  };
}
