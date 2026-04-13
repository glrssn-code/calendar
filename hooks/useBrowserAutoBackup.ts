'use client';

import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { backupEventsToLocal, backupNotesToLocal, getLastSyncTime } from '@/lib/autoBackup';

/**
 * 检查是否需要显示备份提醒
 * 如果距离上次备份超过30分钟，显示提醒
 */
function shouldShowBackupReminder(): boolean {
  const lastSync = getLastSyncTime();
  if (!lastSync) return true;

  const lastSyncDate = new Date(lastSync);
  const now = new Date();
  const diffMinutes = (now.getTime() - lastSyncDate.getTime()) / (1000 * 60);

  // 超过30分钟没备份，显示提醒
  return diffMinutes > 30;
}

/**
 * 浏览器自动备份 Hook
 * 在浏览器环境下定期自动备份数据到 localStorage
 */
export function useBrowserAutoBackup() {
  const backupIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reminderShownRef = useRef(false);

  // 执行备份
  const performBackup = useCallback(async () => {
    try {
      const { eventDB, stickyNoteDB } = await import('@/lib/db');

      // 从 IndexedDB 获取所有数据
      const events = await eventDB.getAll();
      const notes = await stickyNoteDB.getAll();

      // 备份到 localStorage
      backupEventsToLocal(events);
      backupNotesToLocal(notes);

      return { eventsCount: events.length, notesCount: notes.length };
    } catch (error) {
      console.error('[BrowserAutoBackup] backup failed:', error);
      return null;
    }
  }, []);

  // 显示备份提醒
  const showBackupReminder = useCallback(() => {
    if (reminderShownRef.current) return;
    reminderShownRef.current = true;

    toast('📦 数据备份提醒', {
      description: '您已经超过30分钟没有备份数据了，建议您手动备份以防数据丢失',
      duration: 10000,
      action: {
        label: '立即备份',
        onClick: async () => {
          const result = await performBackup();
          if (result) {
            toast.success(`已备份 ${result.eventsCount} 个事件和 ${result.notesCount} 个便签`);
          } else {
            toast.error('备份失败，请重试');
          }
        },
      },
    });
  }, [performBackup]);

  useEffect(() => {
    // 仅在浏览器环境执行
    if (typeof window === 'undefined') return;

    // 执行一次初始备份
    performBackup();

    // 设置定期备份（每5分钟一次）
    backupIntervalRef.current = setInterval(() => {
      performBackup();

      // 检查是否需要显示备份提醒
      if (shouldShowBackupReminder()) {
        showBackupReminder();
      }
    }, 5 * 60 * 1000); // 5分钟

    return () => {
      if (backupIntervalRef.current) {
        clearInterval(backupIntervalRef.current);
      }
    };
  }, [performBackup, showBackupReminder]);

  return { performBackup };
}
