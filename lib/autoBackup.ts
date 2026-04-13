import { CalendarEvent } from '@/types/event';
import { StickyNote } from '@/types/stickyNote';
import { BackupData } from './backup';

const BACKUP_KEY = 'calendar_local_backup';
const EVENTS_KEY = 'calendar_events_backup';
const NOTES_KEY = 'calendar_notes_backup';
const LAST_SYNC_KEY = 'calendar_last_sync';

/**
 * 保存事件到 localStorage 备用
 */
export function backupEventsToLocal(events: CalendarEvent[]): void {
  try {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  } catch (e) {
    console.error('Failed to backup events to localStorage:', e);
  }
}

/**
 * 保存便签到 localStorage 备用
 */
export function backupNotesToLocal(notes: StickyNote[]): void {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  } catch (e) {
    console.error('Failed to backup notes to localStorage:', e);
  }
}

/**
 * 从 localStorage 恢复事件
 */
export function restoreEventsFromLocal(): CalendarEvent[] {
  try {
    const data = localStorage.getItem(EVENTS_KEY);
    if (!data) return [];
    const events = JSON.parse(data);
    if (!Array.isArray(events)) return [];
    return events;
  } catch {
    return [];
  }
}

/**
 * 从 localStorage 恢复便签
 */
export function restoreNotesFromLocal(): StickyNote[] {
  try {
    const data = localStorage.getItem(NOTES_KEY);
    if (!data) return [];
    const notes = JSON.parse(data);
    if (!Array.isArray(notes)) return [];
    return notes;
  } catch {
    return [];
  }
}

/**
 * 获取最后同步时间
 */
export function getLastSyncTime(): string | null {
  return localStorage.getItem(LAST_SYNC_KEY);
}

/**
 * 检查是否有本地备份
 */
export function hasLocalBackup(): boolean {
  const events = restoreEventsFromLocal();
  const notes = restoreNotesFromLocal();
  return events.length > 0 || notes.length > 0;
}

/**
 * 获取备份统计
 */
export function getLocalBackupStats(): { eventCount: number; noteCount: number; lastSync: string | null } {
  const events = restoreEventsFromLocal();
  const notes = restoreNotesFromLocal();
  return {
    eventCount: events.length,
    noteCount: notes.length,
    lastSync: getLastSyncTime(),
  };
}

/**
 * 清除本地备份
 */
export function clearLocalBackup(): void {
  localStorage.removeItem(EVENTS_KEY);
  localStorage.removeItem(NOTES_KEY);
  localStorage.removeItem(LAST_SYNC_KEY);
}

/**
 * 导出为标准备份格式
 */
export function exportLocalBackup(): BackupData | null {
  const events = restoreEventsFromLocal();
  const notes = restoreNotesFromLocal();

  if (events.length === 0 && notes.length === 0) {
    return null;
  }

  return {
    version: 1,
    events,
    stickyNotes: notes,
    createdAt: new Date().toISOString(),
    appVersion: '1.0.1',
  };
}

/**
 * 恢复本地备份到 IndexedDB
 */
export async function restoreLocalBackupToIndexedDB(): Promise<{ eventsRestored: number; notesRestored: number }> {
  const { eventDB, stickyNoteDB } = await import('./db');

  const events = restoreEventsFromLocal();
  const notes = restoreNotesFromLocal();

  let eventsRestored = 0;
  let notesRestored = 0;

  // 清空 IndexedDB 并恢复
  await eventDB.clear();
  await stickyNoteDB.clear();

  for (const event of events) {
    await eventDB.add(event);
    eventsRestored++;
  }

  for (const note of notes) {
    await stickyNoteDB.add(note);
    notesRestored++;
  }

  return { eventsRestored, notesRestored };
}
