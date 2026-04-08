import { CalendarEvent } from '@/types/event';

const STORAGE_KEY = 'calendar_events';
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
 * 从 LocalStorage 加载事件
 */
export function loadEvents(): CalendarEvent[] {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];

    const parsed: StorageData = JSON.parse(data);

    // 版本迁移
    const events = migrateEvents(parsed.events, parsed.version);

    return events;
  } catch (error) {
    console.error('Failed to load events from localStorage:', error);
    return [];
  }
}

/**
 * 保存事件到 LocalStorage
 */
export function saveEvents(events: CalendarEvent[]): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const data: StorageData = {
      version: STORAGE_VERSION,
      events,
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Failed to save events to localStorage:', error);
    return false;
  }
}

/**
 * 清除所有事件
 */
export function clearEvents(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Failed to clear events from localStorage:', error);
    return false;
  }
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
export function getStorageInfo(): { eventCount: number; lastUpdated: string | null; storageSize: string } {
  if (typeof window === 'undefined') {
    return { eventCount: 0, lastUpdated: null, storageSize: '0 B' };
  }

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return { eventCount: 0, lastUpdated: null, storageSize: '0 B' };
    }

    const parsed: StorageData = JSON.parse(data);
    const size = new Blob([data]).size;

    return {
      eventCount: parsed.events.length,
      lastUpdated: parsed.lastUpdated ? new Date(parsed.lastUpdated).toLocaleString('zh-CN') : null,
      storageSize: formatBytes(size),
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
