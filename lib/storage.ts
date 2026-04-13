import { CalendarEvent } from '@/types/event';
import { eventDB } from './db';

const STORAGE_VERSION = 1;

interface StorageData {
  version: number;
  events: CalendarEvent[];
  lastUpdated: string;
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
 * 从 IndexedDB 加载事件
 */
export async function loadEvents(): Promise<CalendarEvent[]> {
  try {
    const events = await eventDB.getAll();
    return events;
  } catch (error) {
    console.error('Failed to load events from IndexedDB:', error);
    return [];
  }
}

/**
 * 保存事件到 IndexedDB（已废弃，使用 eventDB.put）
 */
export async function saveEvents(events: CalendarEvent[]): Promise<boolean> {
  try {
    const db = (await import('./db')).getDB();
    await db.events.clear();
    await db.events.bulkAdd(events);
    return true;
  } catch (error) {
    console.error('Failed to save events to IndexedDB:', error);
    return false;
  }
}

/**
 * 清除所有事件
 */
export async function clearEvents(): Promise<void> {
  await eventDB.clear();
}

/**
 * 导出事件为 JSON 字符串
 */
export function exportEventsToJSON(events: CalendarEvent[]): string {
  const data: StorageData = {
    version: STORAGE_VERSION,
    events,
    lastUpdated: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

/**
 * 从 JSON 导入事件
 */
export function importEventsFromJSON(jsonString: string): { success: boolean; events?: CalendarEvent[]; error?: string } {
  try {
    const data = JSON.parse(jsonString);

    // 检查数据格式
    if (!data.events || !Array.isArray(data.events)) {
      return { success: false, error: '无效的数据格式：缺少 events 数组' };
    }

    // 迁移事件（如果需要）
    const events = migrateEvents(data.events, data.version || 1);

    // 验证每条事件的必要字段
    for (const event of events) {
      if (!event.id || !event.title || !event.date || !event.startTime || !event.endTime) {
        return { success: false, error: '事件数据不完整' };
      }
    }

    return { success: true, events };
  } catch (error) {
    return { success: false, error: 'JSON 解析失败' };
  }
}

/**
 * 迁移旧版本数据到新版本
 */
function migrateEvents(events: CalendarEvent[] | LegacyEvent[], fromVersion: number): CalendarEvent[] {
  // 当前版本不需要迁移
  if (fromVersion >= STORAGE_VERSION) {
    return events as CalendarEvent[];
  }

  // 如果是更早的版本，进行迁移
  // 注意：当前 v1，没有更早的版本，所以直接返回
  return events as CalendarEvent[];
}

/**
 * 获取存储状态信息
 */
export async function getStorageInfo(): Promise<{ eventCount: number; lastUpdated: string | null; storageSize: string }> {
  try {
    const events = await eventDB.getAll();
    const lastEvent = events.length > 0
      ? events.reduce((latest, e) => e.createdAt > latest.createdAt ? e : latest)
      : null;

    // IndexedDB 没有直接的存储大小 API，返回估算值
    const estimatedSize = new Blob([JSON.stringify(events)]).size;

    return {
      eventCount: events.length,
      lastUpdated: lastEvent ? new Date(lastEvent.createdAt).toLocaleString('zh-CN') : null,
      storageSize: formatBytes(estimatedSize),
    };
  } catch (error) {
    console.error('Failed to get storage info:', error);
    return { eventCount: 0, lastUpdated: null, storageSize: '0 B' };
  }
}

/**
 * 格式化字节大小
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
