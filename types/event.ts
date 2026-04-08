export type EventColor = 'orange' | 'yellow' | 'green' | 'blue' | 'indigo' | 'purple';

// 事件类别映射到颜色
export const CATEGORY_COLORS: Record<string, EventColor> = {
  '售前': 'orange',
  '项目': 'yellow',
  '会议': 'blue',
  '管理': 'indigo',
  '推广': 'purple',
  '其它': 'green',
};

export const CATEGORIES = ['售前', '项目', '会议', '管理', '推广', '其它'];

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
