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
  sortOrder: number; // 用于便签排序
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
    this.version(2).stores({
      diaries: 'id, date, createdAt',
      notes: 'id, createdAt, linkedDate, sortOrder',
    }).upgrade(tx => {
      // 旧版本数据 sortOrder 默认为 0
      return tx.table('notes').toCollection().modify(note => {
        if (note.sortOrder === undefined) {
          note.sortOrder = 0;
        }
      });
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
export async function addNote(note: Omit<LifeNote, 'id' | 'createdAt' | 'sortOrder'>): Promise<LifeNote> {
  const id = `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  // 计算新的 sortOrder（未关联的便签放最后）
  const existingNotes = await lifeCalendarDB.notes.toArray();
  const maxSortOrder = existingNotes.reduce((max, n) => Math.max(max, n.sortOrder || 0), -1);
  const newNote: LifeNote = {
    ...note,
    id,
    createdAt: now,
    sortOrder: maxSortOrder + 1,
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
  const notes = await lifeCalendarDB.notes.toArray();
  return notes.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
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

// 批量更新便签排序
export async function reorderNotes(noteIds: string[]): Promise<void> {
  await Promise.all(
    noteIds.map((id, index) =>
      lifeCalendarDB.notes.update(id, { sortOrder: index })
    )
  );
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
