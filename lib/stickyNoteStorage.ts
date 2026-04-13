import { StickyNote } from '@/types/stickyNote';

const STORAGE_KEY = 'calendar_sticky_notes';
const STORAGE_VERSION = 1;

interface StorageData {
  version: number;
  notes: StickyNote[];
  lastUpdated: string;
}

/**
 * 从 LocalStorage 加载便签
 */
export function loadStickyNotes(): StickyNote[] {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];

    const parsed: StorageData = JSON.parse(data);
    return parsed.notes || [];
  } catch (error) {
    console.error('Failed to load sticky notes from localStorage:', error);
    return [];
  }
}

/**
 * 保存便签到 LocalStorage
 */
export function saveStickyNotes(notes: StickyNote[]): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const data: StorageData = {
      version: STORAGE_VERSION,
      notes,
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Failed to save sticky notes to localStorage:', error);
    return false;
  }
}

/**
 * 清除所有便签
 */
export function clearStickyNotes(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Failed to clear sticky notes from localStorage:', error);
    return false;
  }
}
