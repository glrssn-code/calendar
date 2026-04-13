'use client';

import { useEffect } from 'react';
import { useElectronAutoBackup, restoreFromElectronBackup } from '@/hooks/useElectronBackup';

/**
 * Electron 自动备份提供者
 * 在 Electron 环境下自动备份数据到文件
 */
export function ElectronBackupProvider({ children }: { children: React.ReactNode }) {
  // 使用自动备份 Hook
  useElectronAutoBackup();

  // 启动时尝试恢复数据
  useEffect(() => {
    const tryRestore = async () => {
      const result = await restoreFromElectronBackup();
      if (result.success && (result.eventsRestored > 0 || result.notesRestored > 0)) {
        console.log(`[ElectronBackup] Recovered ${result.eventsRestored} events and ${result.notesRestored} notes`);
        // 刷新页面以加载恢复的数据
        window.location.reload();
      }
    };

    tryRestore();
  }, []);

  return <>{children}</>;
}
