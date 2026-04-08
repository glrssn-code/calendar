import {
  startOfWeek,
  addDays,
  format,
  isSameDay,
  parseISO,
  isAfter,
  isBefore,
  setHours,
  setMinutes,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 08:00 到 22:00，每小时一格
export const TIME_SLOTS = [
  { hour: 8, minute: 0 },
  { hour: 9, minute: 0 },
  { hour: 10, minute: 0 },
  { hour: 11, minute: 0 },
  { hour: 12, minute: 0 },
  { hour: 13, minute: 0 },
  { hour: 14, minute: 0 },
  { hour: 15, minute: 0 },
  { hour: 16, minute: 0 },
  { hour: 17, minute: 0 },
  { hour: 18, minute: 0 },
  { hour: 19, minute: 0 },
  { hour: 20, minute: 0 },
  { hour: 21, minute: 0 },
  { hour: 22, minute: 0 },
];

export const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0-23

export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date, { weekStartsOn: 0 }); // Sunday
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function formatTime(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}

export function formatDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function formatDisplayDate(date: Date): string {
  return format(date, 'M月d日', { locale: zhCN });
}

export function formatDayOfWeek(date: Date): string {
  return format(date, 'EEE', { locale: zhCN });
}

export function formatFullDate(date: Date): string {
  return format(date, 'yyyy年M月d日', { locale: zhCN });
}

export function isSameDayCheck(date1: Date, date2: Date): boolean {
  return isSameDay(date1, date2);
}

export function isEventInPast(eventDate: string, eventTime: string): boolean {
  const eventDateTime = parseISO(`${eventDate}T${eventTime}`);
  return isBefore(eventDateTime, new Date());
}

// 计算事件在时间网格中的位置（基于 TIME_SLOTS）
export function getEventPosition(
  startTime: string,
  endTime: string
): { top: number; height: number } {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  // 计算从 08:00 开始的分钟数
  const startMinutesFrom8 = (startHour - 8) * 60 + startMin;
  const endMinutesFrom8 = (endHour - 8) * 60 + endMin;
  const duration = endMinutesFrom8 - startMinutesFrom8;

  // 总共有 (22-8)*2 + 1 = 29 个时间槽
  const totalSlots = TIME_SLOTS.length;
  const totalMinutes = (22 - 8) * 60; // 14小时 = 840分钟

  const top = (startMinutesFrom8 / totalMinutes) * 100;
  const height = (duration / totalMinutes) * 100;

  return { top, height };
}

// 获取点击的时间槽对应的时间字符串
export function getTimeFromSlot(index: number): string {
  const slot = TIME_SLOTS[index];
  return `${slot.hour.toString().padStart(2, '0')}:${slot.minute.toString().padStart(2, '0')}`;
}
