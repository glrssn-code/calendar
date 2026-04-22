'use client';

import Dexie, { Table } from 'dexie';
import { CalendarEvent } from '@/types/event';
import { StickyNote } from '@/types/stickyNote';

export class CalendarDB extends Dexie {
  events!: Table<CalendarEvent, string>;
  stickyNotes!: Table<StickyNote, string>;

  constructor() {
    super('MyCalendar');

    this.version(1).stores({
      events: 'id, date, category, completed, isUrgent, startTime, createdAt',
      stickyNotes: 'id, color, completed, order, createdAt',
    });
  }
}

// 单例
let dbInstance: CalendarDB | null = null;

export function getDB(): CalendarDB {
  if (!dbInstance) {
    dbInstance = new CalendarDB();
  }
  return dbInstance;
}

// 事件相关操作
export const eventDB = {
  // 获取所有事件
  async getAll(): Promise<CalendarEvent[]> {
    return getDB().events.toArray();
  },

  // 添加事件
  async add(event: CalendarEvent): Promise<string> {
    return getDB().events.add(event);
  },

  // 更新事件
  async put(event: CalendarEvent): Promise<string> {
    return getDB().events.put(event);
  },

  // 删除事件
  async delete(id: string): Promise<void> {
    return getDB().events.delete(id);
  },

  // 批量添加
  async bulkAdd(events: CalendarEvent[]): Promise<void> {
    await getDB().events.bulkAdd(events);
  },

  // 清空所有事件
  async clear(): Promise<void> {
    return getDB().events.clear();
  },

  // 按日期查询
  async getByDate(date: string): Promise<CalendarEvent[]> {
    return getDB().events.where('date').equals(date).toArray();
  },

  // 按类别查询
  async getByCategory(category: string): Promise<CalendarEvent[]> {
    return getDB().events.where('category').equals(category).toArray();
  },

  // 搜索标题/描述
  async search(query: string): Promise<CalendarEvent[]> {
    const lowerQuery = query.toLowerCase();
    return getDB().events
      .filter(e =>
        e.title.toLowerCase().includes(lowerQuery) ||
        (e.description?.toLowerCase().includes(lowerQuery) ?? false)
      )
      .toArray();
  },
};

// 便签相关操作
export const stickyNoteDB = {
  // 获取所有便签
  async getAll(): Promise<StickyNote[]> {
    return getDB().stickyNotes.orderBy('order').toArray();
  },

  // 添加便签
  async add(note: StickyNote): Promise<string> {
    return getDB().stickyNotes.add(note);
  },

  // 更新便签
  async put(note: StickyNote): Promise<string> {
    return getDB().stickyNotes.put(note);
  },

  // 删除便签
  async delete(id: string): Promise<void> {
    return getDB().stickyNotes.delete(id);
  },

  // 批量添加
  async bulkAdd(notes: StickyNote[]): Promise<void> {
    await getDB().stickyNotes.bulkAdd(notes);
  },

  // 清空所有便签
  async clear(): Promise<void> {
    return getDB().stickyNotes.clear();
  },

  // 批量更新（用于重排序）
  async bulkPut(notes: StickyNote[]): Promise<void> {
    const db = getDB();
    // 使用 bulkPut (upsert) 而不是 clear + bulkAdd，避免数据丢失风险
    // bulkPut 会插入或替换已有记录，不会删除不在数组中的记录
    return db.transaction('rw', db.stickyNotes, async () => {
      await db.stickyNotes.bulkPut(notes);
    });
  },
};
