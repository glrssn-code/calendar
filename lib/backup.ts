import { CalendarEvent } from '@/types/event';
import { StickyNote } from '@/types/stickyNote';
import { LifeDiary, LifeNote, lifeCalendarDB } from './lifeStorage';
import { eventDB, stickyNoteDB } from './db';
import { getHighScoreData } from '@/components/FlappyBird';

const BACKUP_VERSION = 3;

export interface BackupData {
  version: number;
  events: CalendarEvent[];
  stickyNotes: StickyNote[];
  diaries: LifeDiary[];
  lifeNotes: LifeNote[];
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
export async function loadAllData(): Promise<{ events: CalendarEvent[]; stickyNotes: StickyNote[]; diaries: LifeDiary[]; lifeNotes: LifeNote[] }> {
  const [events, stickyNotes, diaries, lifeNotes] = await Promise.all([
    eventDB.getAll(),
    stickyNoteDB.getAll(),
    lifeCalendarDB.diaries.toArray(),
    lifeCalendarDB.notes.toArray(),
  ]);
  return { events, stickyNotes, diaries, lifeNotes };
}

/**
 * 创建完整备份
 */
export async function createBackup(): Promise<BackupData> {
  const { events, stickyNotes, diaries, lifeNotes } = await loadAllData();
  const highScoreData = getHighScoreData();

  return {
    version: BACKUP_VERSION,
    events,
    stickyNotes,
    diaries,
    lifeNotes,
    createdAt: new Date().toISOString(),
    appVersion: '1.3.4',
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

    // 兼容旧版本备份（没有生活日历数据）
    if (!data.diaries || !Array.isArray(data.diaries)) {
      data.diaries = [];
    }
    if (!data.lifeNotes || !Array.isArray(data.lifeNotes)) {
      data.lifeNotes = [];
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
export async function restoreBackupMerge(data: BackupData): Promise<{ eventsImported: number; notesImported: number; diariesImported: number; lifeNotesImported: number }> {
  const [existingEvents, existingNotes, existingDiaries, existingLifeNotes] = await Promise.all([
    eventDB.getAll(),
    stickyNoteDB.getAll(),
    lifeCalendarDB.diaries.toArray(),
    lifeCalendarDB.notes.toArray(),
  ]);

  const existingEventIds = new Set(existingEvents.map(e => e.id));
  const existingNoteIds = new Set(existingNotes.map(n => n.id));
  const existingDiaryIds = new Set(existingDiaries.map(d => d.id));
  const existingLifeNoteIds = new Set(existingLifeNotes.map(n => n.id));

  let eventsImported = 0;
  let notesImported = 0;
  let diariesImported = 0;
  let lifeNotesImported = 0;

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

  // 导入新日记
  for (const diary of data.diaries) {
    if (!existingDiaryIds.has(diary.id)) {
      await lifeCalendarDB.diaries.add(diary);
      diariesImported++;
    }
  }

  // 导入新生活便签
  for (const note of data.lifeNotes) {
    if (!existingLifeNoteIds.has(note.id)) {
      await lifeCalendarDB.notes.add(note);
      lifeNotesImported++;
    }
  }

  // 合并游戏最高分（如果备份中有且当前没有）
  if (data.gameHighScore) {
    const currentHighScore = getHighScoreData();
    if (!currentHighScore || data.gameHighScore.score > currentHighScore.score) {
      localStorage.setItem('flappy_bird_high_score', JSON.stringify(data.gameHighScore));
    }
  }

  return { eventsImported, notesImported, diariesImported, lifeNotesImported };
}

/**
 * 恢复备份 - 替换模式
 */
export async function restoreBackupReplace(data: BackupData): Promise<{ eventsImported: number; notesImported: number; diariesImported: number; lifeNotesImported: number }> {
  // 清除现有数据
  await Promise.all([
    eventDB.clear(),
    stickyNoteDB.clear(),
    lifeCalendarDB.diaries.clear(),
    lifeCalendarDB.notes.clear(),
  ]);

  // 导入所有数据
  for (const event of data.events) {
    await eventDB.add(event);
  }

  for (const note of data.stickyNotes) {
    await stickyNoteDB.add(note);
  }

  for (const diary of data.diaries) {
    await lifeCalendarDB.diaries.add(diary);
  }

  for (const note of data.lifeNotes) {
    await lifeCalendarDB.notes.add(note);
  }

  // 恢复游戏最高分
  if (data.gameHighScore) {
    localStorage.setItem('flappy_bird_high_score', JSON.stringify(data.gameHighScore));
  }

  return {
    eventsImported: data.events.length,
    notesImported: data.stickyNotes.length,
    diariesImported: data.diaries.length,
    lifeNotesImported: data.lifeNotes.length,
  };
}

/**
 * 获取备份统计信息
 */
export async function getBackupStats(): Promise<{ eventCount: number; noteCount: number; diaryCount: number; lifeNoteCount: number }> {
  const { events, stickyNotes, diaries, lifeNotes } = await loadAllData();
  return {
    eventCount: events.length,
    noteCount: stickyNotes.length,
    diaryCount: diaries.length,
    lifeNoteCount: lifeNotes.length,
  };
}
