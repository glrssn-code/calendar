'use client';

/**
 * 从 localStorage 迁移数据到 IndexedDB
 * 用于从旧版本升级
 */

import { CalendarEvent } from '@/types/event';
import { StickyNote } from '@/types/stickyNote';
import { eventDB, stickyNoteDB } from './db';

// localStorage keys
const EVENTS_STORAGE_KEY = 'calendar_events';
const STICKY_NOTES_STORAGE_KEY = 'sticky_notes';

// 迁移标志（确保只迁移一次）
const MIGRATION_DONE_KEY = 'has_migrated_to_indexeddb';

/**
 * 检查迁移是否已完成
 */
export function isMigrationDone(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(MIGRATION_DONE_KEY) === 'true';
}

/**
 * 标记迁移已完成
 */
function markMigrationDone(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(MIGRATION_DONE_KEY, 'true');
}

interface LegacyEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  reminderEnabled: boolean;
  reminderMinutes: number;
  isUrgent: boolean;
  category: string;
  color: string;
  completed: boolean;
  createdAt: string;
}

/**
 * 从 localStorage 加载事件（旧格式）
 */
function loadEventsFromLocalStorage(): CalendarEvent[] {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(EVENTS_STORAGE_KEY);
    if (!data) return [];

    const parsed = JSON.parse(data);

    // 兼容新格式（直接是数组）
    if (Array.isArray(parsed)) {
      return parsed as CalendarEvent[];
    }

    // 兼容旧格式（包含 version 和 events）
    if (parsed.events && Array.isArray(parsed.events)) {
      return parsed.events as CalendarEvent[];
    }

    return [];
  } catch {
    return [];
  }
}

/**
 * 从 localStorage 加载便签（旧格式）
 */
function loadStickyNotesFromLocalStorage(): StickyNote[] {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(STICKY_NOTES_STORAGE_KEY);
    if (!data) return [];

    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];

    return parsed as StickyNote[];
  } catch {
    return [];
  }
}

/**
 * 检查是否有可迁移的数据
 */
export function hasLegacyData(): boolean {
  if (typeof window === 'undefined') return false;

  const events = loadEventsFromLocalStorage();
  const notes = loadStickyNotesFromLocalStorage();

  return events.length > 0 || notes.length > 0;
}

/**
 * 获取迁移统计信息
 */
export function getLegacyDataInfo(): { eventCount: number; noteCount: number } {
  const events = loadEventsFromLocalStorage();
  const notes = loadStickyNotesFromLocalStorage();

  return {
    eventCount: events.length,
    noteCount: notes.length,
  };
}

/**
 * 执行迁移（只执行一次）
 */
export async function migrateFromLocalStorage(): Promise<{
  success: boolean;
  eventsMigrated: number;
  notesMigrated: number;
  alreadyMigrated: boolean;
  error?: string;
}> {
  // 检查是否已经迁移过
  if (isMigrationDone()) {
    return {
      success: true,
      eventsMigrated: 0,
      notesMigrated: 0,
      alreadyMigrated: true,
    };
  }

  try {
    const events = loadEventsFromLocalStorage();
    const notes = loadStickyNotesFromLocalStorage();

    // 如果没有数据，直接标记完成
    if (events.length === 0 && notes.length === 0) {
      markMigrationDone();
      return {
        success: true,
        eventsMigrated: 0,
        notesMigrated: 0,
        alreadyMigrated: false,
      };
    }

    let eventsMigrated = 0;
    let notesMigrated = 0;

    // 迁移事件
    for (const event of events) {
      await eventDB.add(event);
      eventsMigrated++;
    }

    // 迁移便签
    for (const note of notes) {
      await stickyNoteDB.add(note);
      notesMigrated++;
    }

    // 标记迁移完成
    markMigrationDone();

    return {
      success: true,
      eventsMigrated,
      notesMigrated,
      alreadyMigrated: false,
    };
  } catch (error) {
    console.error('Migration failed:', error);
    return {
      success: false,
      eventsMigrated: 0,
      notesMigrated: 0,
      alreadyMigrated: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 清除 localStorage 中的旧数据
 * （迁移完成后调用）
 */
export function clearLegacyData(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(EVENTS_STORAGE_KEY);
    localStorage.removeItem(STICKY_NOTES_STORAGE_KEY);
  } catch {
    // ignore
  }
}
