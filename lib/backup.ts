import { CalendarEvent } from '@/types/event';
import { StickyNote } from '@/types/stickyNote';
import { eventDB, stickyNoteDB } from './db';
import { getHighScoreData } from '@/components/FlappyBird';

const BACKUP_VERSION = 2;

export interface BackupData {
  version: number;
  events: CalendarEvent[];
  stickyNotes: StickyNote[];
  createdAt: string;
  appVersion: string;
  gameHighScore?: {
    score: number;
    achievedAt: string;
  };
}

/**
 * 加载所有数据用于备份
 */
export async function loadAllData(): Promise<{ events: CalendarEvent[]; stickyNotes: StickyNote[] }> {
  const events = await eventDB.getAll();
  const stickyNotes = await stickyNoteDB.getAll();
  return { events, stickyNotes };
}

/**
 * 创建完整备份
 */
export async function createBackup(): Promise<BackupData> {
  const { events, stickyNotes } = await loadAllData();
  const highScoreData = getHighScoreData();

  return {
    version: BACKUP_VERSION,
    events,
    stickyNotes,
    createdAt: new Date().toISOString(),
    appVersion: '1.3.2',
    gameHighScore: highScoreData ?? undefined,
  };
}

/**
 * 导出备份为 JSON 文件
 */
export function downloadBackup(data: BackupData, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 生成备份文件名
 */
export function generateBackupFilename(): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  return `calendar-backup-${dateStr}.json`;
}

/**
 * 解析备份文件
 */
export function parseBackupFile(content: string): { success: boolean; data?: BackupData; error?: string } {
  try {
    const data = JSON.parse(content);

    if (!data.version || !data.events || !Array.isArray(data.events)) {
      return { success: false, error: '无效的备份文件格式' };
    }

    if (!data.stickyNotes || !Array.isArray(data.stickyNotes)) {
      data.stickyNotes = [];
    }

    if (!data.gameHighScore) {
      data.gameHighScore = undefined;
    }

    return { success: true, data };
  } catch {
    return { success: false, error: 'JSON 解析失败' };
  }
}

/**
 * 恢复备份 - 合并模式
 */
export async function restoreBackupMerge(data: BackupData): Promise<{ eventsImported: number; notesImported: number }> {
  const existingEvents = await eventDB.getAll();
  const existingNotes = await stickyNoteDB.getAll();

  const existingEventIds = new Set(existingEvents.map(e => e.id));
  const existingNoteIds = new Set(existingNotes.map(n => n.id));

  let eventsImported = 0;
  let notesImported = 0;

  // 导入新事件
  for (const event of data.events) {
    if (!existingEventIds.has(event.id)) {
      await eventDB.add(event);
      eventsImported++;
    }
  }

  // 导入新便签
  for (const note of data.stickyNotes) {
    if (!existingNoteIds.has(note.id)) {
      await stickyNoteDB.add(note);
      notesImported++;
    }
  }

  // 合并游戏最高分（如果备份中有且当前没有）
  if (data.gameHighScore) {
    const currentHighScore = getHighScoreData();
    if (!currentHighScore || data.gameHighScore.score > currentHighScore.score) {
      localStorage.setItem('flappy_bird_high_score', JSON.stringify(data.gameHighScore));
    }
  }

  return { eventsImported, notesImported };
}

/**
 * 恢复备份 - 替换模式
 */
export async function restoreBackupReplace(data: BackupData): Promise<{ eventsImported: number; notesImported: number }> {
  // 清除现有数据
  await eventDB.clear();
  await stickyNoteDB.clear();

  // 导入所有数据
  for (const event of data.events) {
    await eventDB.add(event);
  }

  for (const note of data.stickyNotes) {
    await stickyNoteDB.add(note);
  }

  // 恢复游戏最高分
  if (data.gameHighScore) {
    localStorage.setItem('flappy_bird_high_score', JSON.stringify(data.gameHighScore));
  }

  return { eventsImported: data.events.length, notesImported: data.stickyNotes.length };
}

/**
 * 获取备份统计信息
 */
export async function getBackupStats(): Promise<{ eventCount: number; noteCount: number }> {
  const { events, stickyNotes } = await loadAllData();
  return { eventCount: events.length, noteCount: stickyNotes.length };
}
