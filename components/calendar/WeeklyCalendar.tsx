'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { addWeeks, subWeeks, startOfWeek, addDays, format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { DayColumn } from './DayColumn';
import { useEvents } from '@/context/EventContext';
import { CalendarEvent } from '@/types/event';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface WeeklyCalendarProps {
  onCreateEvent: (date: Date, hour: number) => void;
  onEditEvent: (event: CalendarEvent) => void;
  currentDate: Date;
  onDateChange: (date: Date) => void;
  filteredEventIds?: Set<string> | null;
  weekStartsOn?: 0 | 1;
}

export function WeeklyCalendar({
  onCreateEvent,
  onEditEvent,
  currentDate,
  onDateChange,
  filteredEventIds,
  weekStartsOn = 0,
}: WeeklyCalendarProps) {
  const { getEventsByDate, updateEvent } = useEvents();
  const scrollRef = useRef<HTMLDivElement>(null);

  // 拖动状态（提升到 WeeklyCalendar 层面以支持跨天拖动）
  const [draggingEvent, setDraggingEvent] = useState<CalendarEvent | null>(null);
  const [dragPreview, setDragPreview] = useState<{ date: Date; top: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragHint, setDragHint] = useState<{ x: number; y: number; time: string } | null>(null);
  const dragStartYRef = useRef(0);
  const dragStartMinutesRef = useRef(0);
  const dragStartDateRef = useRef<Date | null>(null);
  const dragMovedRef = useRef(false);

  const weekStart = startOfWeek(currentDate, { weekStartsOn });
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const today = new Date();
  const HOUR_HEIGHT = 700 / 15;
  const hours = Array.from({ length: 15 }, (_, i) => i + 8);

  // 初始化滚动到当前时间附近
  useEffect(() => {
    if (scrollRef.current) {
      const currentHour = new Date().getHours();
      if (currentHour >= 8 && currentHour <= 22) {
        const scrollTop = ((currentHour - 8) / 14) * 700 - 100;
        scrollRef.current.scrollTop = Math.max(0, scrollTop);
      }
    }
  }, []);

  // 拖动开始
  const handleDragStart = useCallback((event: CalendarEvent, e: React.MouseEvent, date: Date) => {
    const scroll = scrollRef.current;
    if (!scroll || event.isAllDay || !event.startTime) return;

    const scrollTop = scroll.scrollTop;
    const [startH, startM] = event.startTime.split(':').map(Number);
    const startMinutes = (startH - 8) * 60 + startM;
    const eventTop = (startMinutes / 60) * HOUR_HEIGHT;

    // 计算鼠标在事件块内的相对偏移量
    const scrollRect = scroll.getBoundingClientRect();
    const mouseRelativeToScroll = e.clientY - scrollRect.top + scrollTop;
    const mouseOffsetInEvent = mouseRelativeToScroll - eventTop;

    setDraggingEvent(event);
    setDragPreview({ date, top: eventTop });
    setIsDragging(true);
    dragStartYRef.current = mouseOffsetInEvent;
    dragStartMinutesRef.current = startMinutes;
    dragStartDateRef.current = date;
    dragMovedRef.current = false;
  }, [HOUR_HEIGHT]);

  // 拖动移动
  const handleDragMove = useCallback((e: React.MouseEvent) => {
    if (!draggingEvent || !dragPreview || !scrollRef.current) return;

    const scroll = scrollRef.current;
    const scrollRect = scroll.getBoundingClientRect();
    const scrollTop = scroll.scrollTop;

    // 计算鼠标相对于滚动区域的位置
    const mouseY = e.clientY - scrollRect.top + scrollTop;
    const mouseX = e.clientX - scrollRect.left;

    // 计算预览位置（Y轴）
    let previewTop = mouseY - dragStartYRef.current;

    // 限制在有效范围内
    const maxTop = (14 * 60 / 60) * HOUR_HEIGHT;
    previewTop = Math.max(0, Math.min(maxTop, previewTop));

    // 根据 X 位置计算列偏移
    // 时间栏宽度是 56px，日期列从那里开始
    const timeColumnWidth = 56;
    const dateColumnWidth = scrollRect.width - timeColumnWidth;
    const columnWidth = dateColumnWidth / 7;
    // 鼠标在日期列区域的位置（减去时间栏宽度）
    const mouseXInDateColumn = mouseX - timeColumnWidth;
    // 只在日期列区域内计算列索引
    const columnIndex = mouseXInDateColumn > 0
      ? Math.floor(mouseXInDateColumn / columnWidth)
      : -1;

    // 使用起始日期计算列索引（固定不变）
    const startColumnIndex = weekDays.findIndex(d =>
      format(d, 'yyyy-MM-dd') === format(dragStartDateRef.current || dragPreview.date, 'yyyy-MM-dd')
    );
    // columnIndex 为 -1 表示在时间栏内，dateOffset 为 0
    const dateOffset = columnIndex >= 0 ? columnIndex - startColumnIndex : 0;

    // 计算分钟并四舍五入到10分钟
    let minutesFrom8 = Math.round(previewTop / HOUR_HEIGHT * 60);
    const roundedMinutes = Math.round(minutesFrom8 / 10) * 10;
    minutesFrom8 = Math.max(0, Math.min(14 * 60, roundedMinutes));

    // 计算新日期
    const newDate = addDays(dragStartDateRef.current || dragPreview.date, dateOffset);

    // 重新计算预览的像素位置（使用四舍五入后的分钟）
    const newPreviewTop = (minutesFrom8 / 60) * HOUR_HEIGHT;

    // 计算提示框的时间 - 使用与左侧时间标尺一致的计算方式
    // 左侧标尺：top = (hour - 8) * HOUR_HEIGHT，即 hour = top / HOUR_HEIGHT + 8
    const totalMinutesFromMidnight = 8 * 60 + minutesFrom8;
    const hintHour = Math.floor(totalMinutesFromMidnight / 60);
    const hintMin = totalMinutesFromMidnight % 60;
    const hintTime = `${hintHour.toString().padStart(2, '0')}:${hintMin.toString().padStart(2, '0')}`;

    // 设置提示框位置（使用鼠标在屏幕上的位置）
    setDragHint({ x: e.clientX, y: e.clientY, time: hintTime });

    setDragPreview({ date: newDate, top: newPreviewTop });
    dragMovedRef.current = true;
  }, [draggingEvent, dragPreview, weekDays, HOUR_HEIGHT]);

  // 拖动结束
  const handleDragEnd = useCallback(() => {
    if (!draggingEvent || !dragStartDateRef.current) {
      setDraggingEvent(null);
      setDragPreview(null);
      setIsDragging(false);
      return;
    }

    // 计算新的日期和时间
    const newDate = dragPreview?.date || dragStartDateRef.current;
    const newTop = dragPreview?.top || 0;

    // 计算分钟并四舍五入到最近的10分钟
    const minutesFrom8 = Math.round(newTop / HOUR_HEIGHT * 60);
    const roundedMinutes = Math.round(minutesFrom8 / 10) * 10;
    let newMinutes = roundedMinutes + 8 * 60;
    newMinutes = Math.max(8 * 60, Math.min(22 * 60, newMinutes));

    // 计算时长
    if (!draggingEvent.startTime || !draggingEvent.endTime) return;
    const [origStartH, origStartM] = draggingEvent.startTime.split(':').map(Number);
    const [origEndH, origEndM] = draggingEvent.endTime.split(':').map(Number);
    const duration = (origEndH * 60 + origEndM) - (origStartH * 60 + origStartM);

    const newEndMinutes = newMinutes + duration;

    // 转换为时间字符串
    const newStartHour = Math.floor(newMinutes / 60);
    const newStartMin = newMinutes % 60;
    const newEndHour = Math.floor(newEndMinutes / 60);
    const newEndMin = newEndMinutes % 60;

    const newStartTime = `${newStartHour.toString().padStart(2, '0')}:${newStartMin.toString().padStart(2, '0')}`;
    const newEndTime = `${newEndHour.toString().padStart(2, '0')}:${newEndMin.toString().padStart(2, '0')}`;
    const newDateStr = format(newDate, 'yyyy-MM-dd');

    // 更新时间（如果时间或日期改变）
    if (newStartTime !== draggingEvent.startTime || newDateStr !== draggingEvent.date) {
      const updatedEvent: CalendarEvent = {
        ...draggingEvent,
        date: newDateStr,
        startTime: newStartTime,
        endTime: newEndTime,
      };
      updateEvent(updatedEvent);
    }

    setDraggingEvent(null);
    setDragPreview(null);
    setDragHint(null);
    setIsDragging(false);
  }, [draggingEvent, dragPreview, updateEvent, HOUR_HEIGHT]);

  // document 级别的拖动结束处理
  useEffect(() => {
    const handleDocumentMouseUp = () => {
      if (isDragging) {
        handleDragEnd();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && draggingEvent) {
        setDraggingEvent(null);
        setDragPreview(null);
        setIsDragging(false);
      }
    };

    document.addEventListener('mouseup', handleDocumentMouseUp);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mouseup', handleDocumentMouseUp);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDragging, draggingEvent, handleDragEnd]);

  // document 级别的拖动移动处理
  useEffect(() => {
    const handleDocumentMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleDragMove(e as unknown as React.MouseEvent);
      }
    };

    document.addEventListener('mousemove', handleDocumentMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleDocumentMouseMove);
    };
  }, [isDragging, handleDragMove]);

  const goToPreviousWeek = () => onDateChange(subWeeks(currentDate, 1));
  const goToNextWeek = () => onDateChange(addWeeks(currentDate, 1));
  const goToToday = () => onDateChange(new Date());

  const handleSlotClick = (date: Date, hour: number) => {
    // 如果刚完成拖动，不触发新建
    if (dragMovedRef.current) {
      return;
    }
    onCreateEvent(date, hour);
  };

  const handleEventClick = (event: CalendarEvent) => {
    onEditEvent(event);
  };

  const handleEventUpdate = (event: CalendarEvent) => {
    updateEvent(event);
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* 拖动提示框 */}
      {dragHint && (
        <div
          className="fixed z-50 px-2 py-1 text-sm font-medium pointer-events-none"
          style={{
            left: dragHint.x + 12,
            top: dragHint.y - 24,
          }}
        >
          {dragHint.time}
        </div>
      )}

      {/* 星期标题栏 - 拟物风格 */}
      <div className="flex border-b border-slate-200 bg-gradient-to-b from-slate-100 to-slate-200">
        <div className="w-14 flex-shrink-0 bg-gradient-to-b from-slate-100 to-slate-200 border-r border-slate-300" />
        {weekDays.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const isToday = format(day, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
          return (
            <div
              key={dateKey}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 ${isToday ? 'bg-gradient-to-b from-blue-100 to-blue-200' : 'bg-gradient-to-b from-white to-slate-50'} ${isToday ? '' : 'hover:bg-gradient-to-b hover:from-slate-50 hover:to-white'}`}
            >
              <span className={`text-xs font-medium ${isToday ? 'text-blue-600' : 'text-slate-500'}`}>
                {format(day, 'EEE', { locale: zhCN }).replace('周', '')}
              </span>
              <span className={`w-7 h-7 flex items-center justify-center rounded-lg text-sm font-semibold shadow-sm ${
                isToday
                  ? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-md'
                  : 'bg-gradient-to-b from-white to-slate-100 text-slate-700 border border-slate-200'
              }`}>
                {format(day, 'd')}
              </span>
            </div>
          );
        })}
      </div>

      {/* 全天待办区域 */}
      {(() => {
        const weekAllDayEvents = weekDays.flatMap(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayEvents = filteredEventIds
            ? getEventsByDate(dateKey).filter(e => filteredEventIds.has(e.id))
            : getEventsByDate(dateKey);
          return dayEvents.filter(e => e.isAllDay);
        });

        if (weekAllDayEvents.length === 0) return null;

        return (
          <div className="flex border-b border-slate-200 bg-slate-50">
            <div className="w-14 flex-shrink-0 bg-slate-100 border-r border-slate-200">
              <div className="h-full flex items-center justify-center">
                <span className="text-xs text-slate-500 font-medium">全天</span>
              </div>
            </div>
            <div className="flex-1 flex gap-1 px-1 py-1 overflow-x-auto">
              {weekAllDayEvents.map((event) => (
                <div
                  key={event.id}
                  className={`flex-shrink-0 px-2 py-0.5 rounded text-xs text-white cursor-pointer hover:opacity-80 transition-opacity ${
                    event.isUrgent ? 'bg-red-500' : 'bg-blue-500'
                  } ${event.completed ? 'opacity-50 line-through' : ''}`}
                  onClick={() => handleEventClick(event)}
                >
                  {event.title}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* 日历主体 */}
      <div className="flex flex-1 overflow-hidden calendar-grid">
        <div
          ref={scrollRef}
          className="flex flex-1 overflow-y-auto overflow-x-hidden"
        >
          <div className="flex flex-1 min-w-0">
            {/* 左侧时间标签栏 */}
            <div className="w-14 flex-shrink-0 bg-slate-50 border-r border-slate-200">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="text-right pr-2 relative"
                  style={{ height: `${HOUR_HEIGHT}px` }}
                >
                  <span className="text-xs text-slate-400 font-medium absolute right-2 top-0">
                    {hour.toString().padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {/* 日期列 - 不再显示星期标题 */}
            <div className="flex flex-1 min-w-0">
              {weekDays.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const allEvents = getEventsByDate(dateKey);
                // 如果有过滤条件，只显示匹配的事件
                const events = filteredEventIds
                  ? allEvents.filter(e => filteredEventIds.has(e.id))
                  : allEvents;
                return (
                  <DayColumn
                    key={dateKey}
                    date={day}
                    events={events}
                    onSlotClick={handleSlotClick}
                    onEventClick={handleEventClick}
                    onEventUpdate={handleEventUpdate}
                    isToday={format(day, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')}
                    showHeader={false}
                    draggingEvent={draggingEvent}
                    dragPreview={dragPreview}
                    isDragging={isDragging}
                    onDragStart={handleDragStart}
                    dragMovedRef={dragMovedRef}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
