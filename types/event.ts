// Re-export all constants and types from lib/constants for backwards compatibility
export {
  CATEGORIES,
  CATEGORY_COLORS,
  COLOR_CATEGORY_ORDER,
  COLOR_CATEGORY_MAP,
  CATEGORY_OPTIONS,
  COLOR_OPTIONS,
} from '@/lib/constants';

// Import EventColor for use in this file (re-export alone doesn't make it usable locally)
import type { EventColor } from '@/lib/constants';
export type { EventColor };

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string; // 事件内容（可选）
  date: string; // "YYYY-MM-DD"
  startTime?: string; // "HH:MM" - 可选，为空表示全天待办
  endTime?: string; // "HH:MM" - 可选
  reminderEnabled: boolean;
  reminderMinutes: number; // 0, 5, 10, 15, 30, 60
  isUrgent: boolean; // 紧急事件，红色高亮
  category: string; // 事件类别：售前/项目/开发/会议/管理/推广
  color: EventColor; // 颜色，根据类别自动生成
  completed: boolean; // 是否已完成
  isAllDay?: boolean; // 是否为全天待办（无时间）
  createdAt: string;
  sourceNoteId?: string; // 来源便签ID，用于同步
}

export type NewEvent = Omit<CalendarEvent, 'id' | 'createdAt'>;

export interface EventState {
  events: CalendarEvent[];
  isLoading: boolean;
}

export type EventAction =
  | { type: 'ADD_EVENT'; payload: CalendarEvent }
  | { type: 'UPDATE_EVENT'; payload: CalendarEvent }
  | { type: 'DELETE_EVENT'; payload: string }
  | { type: 'LOAD_EVENTS'; payload: CalendarEvent[] };
