import * as XLSX from 'xlsx';
import { CalendarEvent } from '@/types/event';
import { exportEventsToJSON } from './storage';

/**
 * 导出事件为 JSON 文件（简化格式）
 * 格式：类别：标题（每个事件一行）
 */
export function downloadAsJSON(events: CalendarEvent[], filename: string = 'calendar-events.json'): void {
  // 按类别分组并生成简化文本
  const lines = events.map(event => `${event.category}：${event.title}`);
  const content = lines.join('\n');
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, filename);
}

/**
 * 导出事件为 JSON 文件（完整 JSON 格式）
 */
export function downloadAsFullJSON(events: CalendarEvent[], filename: string = 'calendar-events.json'): void {
  const jsonString = exportEventsToJSON(events);
  const blob = new Blob([jsonString], { type: 'application/json' });
  downloadBlob(blob, filename);
}

/**
 * 导出事件为 Excel 文件
 */
export function downloadAsExcel(events: CalendarEvent[], filename: string = 'calendar-events.xlsx'): void {
  // 准备 Excel 数据
  const excelData = events.map((event, index) => ({
    '序号': index + 1,
    '标题': event.title,
    '日期': event.date,
    '开始时间': event.startTime,
    '结束时间': event.endTime,
    '类别': event.category,
    '紧急': event.isUrgent ? '是' : '否',
    '已完成': event.completed ? '是' : '否',
    '提醒': event.reminderEnabled ? (event.reminderMinutes === 0 ? '开始时提醒' : `提前${event.reminderMinutes}分钟`) : '否',
    '描述': event.description || '',
    '创建时间': event.createdAt,
  }));

  // 创建工作簿和工作表
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // 设置列宽
  worksheet['!cols'] = [
    { wch: 6 },   // 序号
    { wch: 20 },  // 标题
    { wch: 12 },  // 日期
    { wch: 10 },  // 开始时间
    { wch: 10 },  // 结束时间
    { wch: 8 },   // 类别
    { wch: 6 },   // 紧急
    { wch: 8 },   // 已完成
    { wch: 12 },  // 提醒
    { wch: 30 },  // 描述
    { wch: 20 },  // 创建时间
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '日程事件');

  // 生成 Excel 文件并下载
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, filename);
}

/**
 * 下载 Blob 文件
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 生成带时间戳的文件名
 */
export function generateFilename(prefix: string, extension: string): string {
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 10); // YYYY-MM-DD
  return `${prefix}-${timestamp}.${extension}`;
}
