import { EventColor } from '@/lib/constants';

export interface StickyNote {
  id: string;
  title: string;
  content?: string; // 可选内容
  reminderTime?: string; // "HH:MM" - 提醒时间
  reminderDate?: string; // "YYYY-MM-DD" - 提醒日期
  color: EventColor;
  isUrgent: boolean; // 是否紧急
  completed: boolean;
  order: number; // 排序
  createdAt: string;
  linkedEventIds: string[]; // 关联的事件ID列表
}

export type NewStickyNote = Omit<StickyNote, 'id' | 'createdAt' | 'order' | 'linkedEventIds'>;
