import Dexie, { type Table } from 'dexie';

export interface LifeDiary {
  id: string;
  date: string; // "YYYY-MM-DD"
  content: string;
  mood?: string; // 心情标签
  weather?: string; // 天气
  createdAt: string;
  updatedAt: string;
}

export interface LifeNote {
  id: string;
  title: string;
  content: string;
  color: string;
  isUrgent: boolean;
  completed: boolean;
  createdAt: string;
  linkedDate?: string; // 关联的日期 "YYYY-MM-DD"
  position?: { x: number; y: number };
}

class LifeCalendarDB extends Dexie {
  diaries!: Table<LifeDiary>;
  notes!: Table<LifeNote>;

  constructor() {
    super('LifeCalendarDB');
    this.version(1).stores({
      diaries: 'id, date, createdAt',
      notes: 'id, createdAt, linkedDate',
    });
  }
}

export const lifeCalendarDB = new LifeCalendarDB();

// 日记操作
export async function addDiary(diary: Omit<LifeDiary, 'id' | 'createdAt' | 'updatedAt'>): Promise<LifeDiary> {
  const id = `diary-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  const newDiary: LifeDiary = {
    ...diary,
    id,
    createdAt: now,
    updatedAt: now,
  };
  await lifeCalendarDB.diaries.add(newDiary);
  return newDiary;
}

export async function updateDiary(id: string, updates: Partial<LifeDiary>): Promise<void> {
  await lifeCalendarDB.diaries.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteDiary(id: string): Promise<void> {
  await lifeCalendarDB.diaries.delete(id);
}

export async function getDiaries(): Promise<LifeDiary[]> {
  return lifeCalendarDB.diaries.toArray();
}

export async function getDiariesByDate(date: string): Promise<LifeDiary[]> {
  return lifeCalendarDB.diaries.where('date').equals(date).toArray();
}

export async function getAllDiariesWithStats() {
  const diaries = await getDiaries();
  return {
    diaryCount: diaries.length,
    diaries,
  };
}

// 便签操作
export async function addNote(note: Omit<LifeNote, 'id' | 'createdAt'>): Promise<LifeNote> {
  const id = `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  const newNote: LifeNote = {
    ...note,
    id,
    createdAt: now,
  };
  await lifeCalendarDB.notes.add(newNote);
  return newNote;
}

export async function updateNote(id: string, updates: Partial<LifeNote>): Promise<void> {
  await lifeCalendarDB.notes.update(id, updates);
}

export async function deleteNote(id: string): Promise<void> {
  await lifeCalendarDB.notes.delete(id);
}

export async function getNotes(): Promise<LifeNote[]> {
  return lifeCalendarDB.notes.toArray();
}

export async function getNotesByDate(date: string): Promise<LifeNote[]> {
  return lifeCalendarDB.notes.where('linkedDate').equals(date).toArray();
}

export async function getAllNotesWithStats() {
  const notes = await getNotes();
  return {
    noteCount: notes.length,
    notes,
  };
}

// 导出生活日历数据
export async function exportLifeCalendarData() {
  const diaries = await getDiaries();
  const notes = await getNotes();
  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    diaries,
    notes,
  };
}

// 导入生活日历数据
export async function importLifeCalendarData(data: { diaries?: LifeDiary[]; notes?: LifeNote[] }, mode: 'merge' | 'replace') {
  if (mode === 'replace') {
    await lifeCalendarDB.diaries.clear();
    await lifeCalendarDB.notes.clear();
  }

  if (data.diaries) {
    if (mode === 'merge') {
      const existingIds = new Set((await getDiaries()).map(d => d.id));
      const newDiaries = data.diaries.filter(d => !existingIds.has(d.id));
      await lifeCalendarDB.diaries.bulkAdd(newDiaries);
    } else {
      await lifeCalendarDB.diaries.bulkAdd(data.diaries);
    }
  }

  if (data.notes) {
    if (mode === 'merge') {
      const existingIds = new Set((await getNotes()).map(n => n.id));
      const newNotes = data.notes.filter(n => !existingIds.has(n.id));
      await lifeCalendarDB.notes.bulkAdd(newNotes);
    } else {
      await lifeCalendarDB.notes.bulkAdd(data.notes);
    }
  }
}

// 清除所有生活日历数据
export async function clearLifeCalendarData() {
  await lifeCalendarDB.diaries.clear();
  await lifeCalendarDB.notes.clear();
}

// 获取存储信息
export async function getLifeStorageInfo() {
  const diaries = await getDiaries();
  const notes = await getNotes();

  // 计算存储大小（估算）
  const dataSize = JSON.stringify({ diaries, notes }).length;

  return {
    diaryCount: diaries.length,
    noteCount: notes.length,
    storageSize: formatBytes(dataSize),
    lastUpdated: diaries.length > 0 || notes.length > 0 ? new Date().toISOString() : null,
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
