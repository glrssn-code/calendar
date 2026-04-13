'use client';

import { useEffect, useRef } from 'react';
import { CalendarEvent } from '@/types/event';
import { StickyNote } from '@/types/stickyNote';
import { eventDB, stickyNoteDB } from '@/lib/db';

const BACKUP_FILENAME = 'auto-backup.json';

// 检查是否是 Electron 环境
function isElectron(): boolean {
  return typeof window !== 'undefined' && !!(window as any).electronAPI;
}

// 获取 Electron API
function getElectronAPI() {
  if (isElectron()) {
    return (window as any).electronAPI;
  }
  return null;
}

/**
 * 自动备份 Hook - 在 Electron 环境下自动保存数据到文件
 */
export function useElectronAutoBackup() {
  const lastBackupRef = useRef<string>('');

  useEffect(() => {
    const electronAPI = getElectronAPI();
    if (!electronAPI) return; // 非 Electron 环境，跳过

    const performBackup = async () => {
      try {
        const events = await eventDB.getAll();
        const notes = await stickyNoteDB.getAll();

        const backupData = {
          version: 1,
          events,
          stickyNotes: notes,
          createdAt: new Date().toISOString(),
          appVersion: '1.0.1',
        };

        const jsonStr = JSON.stringify(backupData);

        // 只有数据变化时才写入
        if (jsonStr !== lastBackupRef.current) {
          const result = await electronAPI.writeBackupFile(BACKUP_FILENAME, jsonStr);
          if (result.success) {
            console.log('[ElectronBackup] Auto-backup saved to:', result.path);
          } else {
            console.error('[ElectronBackup] Backup failed:', result.error);
          }
          lastBackupRef.current = jsonStr;
        }
      } catch (error) {
        console.error('[ElectronBackup] Backup error:', error);
      }
    };

    // 启动时执行一次备份
    performBackup();

    // 监听数据变化（通过定时检查）
    const interval = setInterval(performBackup, 30000); // 每30秒检查一次

    return () => clearInterval(interval);
  }, []);
}

/**
 * 从 Electron 自动备份恢复数据
 */
export async function restoreFromElectronBackup(): Promise<{
  success: boolean;
  eventsRestored: number;
  notesRestored: number;
}> {
  const electronAPI = getElectronAPI();
  if (!electronAPI) {
    return { success: false, eventsRestored: 0, notesRestored: 0 };
  }

  try {
    const exists = await electronAPI.backupFileExists(BACKUP_FILENAME);
    if (!exists) {
      console.log('[ElectronBackup] No backup file found');
      return { success: false, eventsRestored: 0, notesRestored: 0 };
    }

    const result = await electronAPI.readBackupFile(BACKUP_FILENAME);
    if (!result.success || !result.content) {
      console.error('[ElectronBackup] Failed to read backup:', result.error);
      return { success: false, eventsRestored: 0, notesRestored: 0 };
    }

    const backupData = JSON.parse(result.content);

    // 检查 IndexedDB 是否为空
    const existingEvents = await eventDB.getAll();
    const existingNotes = await stickyNoteDB.getAll();

    if (existingEvents.length > 0 || existingNotes.length > 0) {
      console.log('[ElectronBackup] IndexedDB has data, skipping restore');
      return { success: false, eventsRestored: 0, notesRestored: 0 };
    }

    // 恢复数据
    let eventsRestored = 0;
    let notesRestored = 0;

    if (backupData.events && Array.isArray(backupData.events)) {
      for (const event of backupData.events) {
        await eventDB.add(event);
        eventsRestored++;
      }
    }

    if (backupData.stickyNotes && Array.isArray(backupData.stickyNotes)) {
      for (const note of backupData.stickyNotes) {
        await stickyNoteDB.add(note);
        notesRestored++;
      }
    }

    console.log(`[ElectronBackup] Restored ${eventsRestored} events and ${notesRestored} notes`);
    return { success: true, eventsRestored, notesRestored };
  } catch (error) {
    console.error('[ElectronBackup] Restore error:', error);
    return { success: false, eventsRestored: 0, notesRestored: 0 };
  }
}

/**
 * 获取 Electron 备份路径
 */
export async function getElectronBackupPath(): Promise<string | null> {
  const electronAPI = getElectronAPI();
  if (!electronAPI) return null;
  return await electronAPI.getBackupPath();
}
