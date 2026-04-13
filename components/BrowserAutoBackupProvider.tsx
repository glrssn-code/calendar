'use client';

import { useBrowserAutoBackup } from '@/hooks/useBrowserAutoBackup';

// 检查是否是 Electron 环境
function isElectron(): boolean {
  return typeof window !== 'undefined' && !!(window as any).electronAPI;
}

/**
 * 浏览器自动备份提供者
 * 仅在非 Electron 环境下生效
 * 定期自动备份数据到 localStorage 并在需要时提醒用户
 */
export function BrowserAutoBackupProvider({ children }: { children: React.ReactNode }) {
  // 仅在非 Electron 环境运行
  if (isElectron()) {
    return <>{children}</>;
  }

  // 使用自动备份 Hook
  useBrowserAutoBackup();

  return <>{children}</>;
}
