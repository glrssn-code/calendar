'use client';

import { createContext, useContext, useCallback, useRef, useEffect, ReactNode } from 'react';

// 操作类型
type ActionType = 'DELETE_EVENT' | 'DELETE_STICKY_NOTE' | 'UPDATE_EVENT' | 'UPDATE_STICKY_NOTE' | 'DELETE_DIARY' | 'DELETE_LIFE_NOTE';

interface UndoAction {
  type: ActionType;
  timestamp: number;
  description: string;
  // 操作前的数据（用于撤销）
  previousData: unknown;
  // 恢复操作
  undo: () => void;
}

interface UndoContextType {
  pushAction: (action: Omit<UndoAction, 'timestamp'>) => void;
  undo: () => boolean;
  canUndo: () => boolean;
  getUndoDescription: () => string | null;
  clearHistory: () => void;
}

const UndoContext = createContext<UndoContextType | null>(null);

const MAX_HISTORY = 50; // 最多保留50条历史记录

export function UndoProvider({ children }: { children: ReactNode }) {
  const historyRef = useRef<UndoAction[]>([]);

  // 监听 Ctrl+Z 快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z 或 Cmd+Z (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        const undone = undoInternal();
        if (undone) {
          // 可以添加视觉反馈，比如 toast
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const undoInternal = useCallback((): boolean => {
    const history = historyRef.current;
    if (history.length === 0) return false;

    // 取出最近的操作
    const action = history.pop();
    if (!action) return false;

    // 执行撤销
    try {
      action.undo();
      return true;
    } catch (err) {
      console.error('Failed to undo:', err);
      return false;
    }
  }, []);

  const pushAction = useCallback((action: Omit<UndoAction, 'timestamp'>) => {
    const newAction: UndoAction = {
      ...action,
      timestamp: Date.now(),
    };

    historyRef.current.push(newAction);

    // 限制历史记录数量
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    }
  }, []);

  const undo = useCallback((): boolean => {
    return undoInternal();
  }, [undoInternal]);

  const canUndo = useCallback((): boolean => {
    return historyRef.current.length > 0;
  }, []);

  const getUndoDescription = useCallback((): string | null => {
    const history = historyRef.current;
    if (history.length === 0) return null;
    return history[history.length - 1].description;
  }, []);

  const clearHistory = useCallback(() => {
    historyRef.current = [];
  }, []);

  return (
    <UndoContext.Provider value={{ pushAction, undo, canUndo, getUndoDescription, clearHistory }}>
      {children}
    </UndoContext.Provider>
  );
}

export function useUndo() {
  const context = useContext(UndoContext);
  if (!context) {
    throw new Error('useUndo must be used within an UndoProvider');
  }
  return context;
}

// 便捷函数：包装需要撤销的操作
export function withUndo<T extends (...args: any[]) => any>(
  action: T,
  getUndoAction: (result: ReturnType<T>) => Omit<UndoAction, 'timestamp' | 'undo'>
): T {
  return ((...args: Parameters<T>) => {
    const result = action(...args);
    return result;
  }) as T;
}
