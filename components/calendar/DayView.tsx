'use client';

import { useState, useRef, useEffect } from 'react';
import { format, startOfDay, isSameDay, addDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CalendarEvent } from '@/types/event';
import { EventBlock } from './EventBlock';

const HOUR_HEIGHT = 60; // 每小时 60px 高度

const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 8:00 - 22:00

interface DayViewProps {
  date: Date;
  events: CalendarEvent[];
  onDateChange: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  onSlotClick: (hour: number) => void;
  filteredEventIds?: Set<string> | null;
}

export function DayView({
  date,
  events,
  onDateChange,
  onEventClick,
  onSlotClick,
  filteredEventIds,
}: DayViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [draggingEvent, setDraggingEvent] = useState<CalendarEvent | null>(null);
  const [dragPreview, setDragPreview] = useState<{ top: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // 过滤后的事件 - 按日期过滤
  const dateKey = format(date, 'yyyy-MM-dd');
  const filteredEvents = events.filter(e => {
    if (e.date !== dateKey) return false;
    if (filteredEventIds && !filteredEventIds.has(e.id)) return false;
    return true;
  });

  // 按时间分组事件（排除全天待办）
  const getEventsAtHour = (hour: number) => {
    return filteredEvents.filter(event => {
      if (event.isAllDay || !event.startTime) return false;
      const eventHour = parseInt(event.startTime.split(':')[0]);
      return eventHour === hour;
    });
  };

  // 全天待办事件
  const allDayEvents = filteredEvents.filter(event => event.isAllDay);

  // 当前时间红线位置
  const now = new Date();
  const isToday = isSameDay(date, now);
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeTop = isToday ? ((currentHour - 8) * 60 + currentMinute) : -1;

  // 滚动到当前时间
  useEffect(() => {
    if (scrollRef.current && isToday) {
      const scrollTop = Math.max(0, currentTimeTop - 100);
      scrollRef.current.scrollTop = scrollTop;
    }
  }, [isToday, currentTimeTop]);

  const handleGoToToday = () => {
    onDateChange(startOfDay(new Date()));
  };

  const handlePreviousDay = () => {
    onDateChange(addDays(date, -1));
  };

  const handleNextDay = () => {
    onDateChange(addDays(date, 1));
  };

  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const dayOfWeek = weekdays[date.getDay()];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 日期头部 - 拟物风格 */}
      <div className="flex border-b border-slate-200 bg-gradient-to-b from-slate-100 to-slate-200 py-2">
        <div className="w-14 flex-shrink-0 bg-gradient-to-b from-slate-100 to-slate-200 border-r border-slate-300" />
        <div className="flex-1 flex items-center justify-center gap-2">
          <span className={`w-24 h-7 flex items-center justify-center rounded-lg bg-gradient-to-b from-blue-500 to-blue-600 text-white text-sm font-semibold shadow-md`}>
            {format(date, 'M月d日')}
          </span>
          <span className={`text-sm ${isToday ? 'text-blue-600 font-medium' : 'text-slate-500'}`}>
            {dayOfWeek}
          </span>
        </div>
      </div>

      {/* 全天待办区域 */}
      {allDayEvents.length > 0 && (
        <div className="border-b border-slate-200 bg-slate-50 px-2 py-2">
          <div className="text-xs text-slate-500 mb-1 font-medium">全天待办</div>
          <div className="flex flex-wrap gap-1">
            {allDayEvents.map((event) => (
              <div
                key={event.id}
                className={`px-2 py-1 rounded text-xs text-white cursor-pointer hover:opacity-80 transition-opacity ${
                  event.isUrgent ? 'bg-red-500' : 'bg-blue-500'
                } ${event.completed ? 'opacity-50 line-through' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onEventClick(event);
                }}
              >
                {event.title}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 时间网格 */}
      <div className="flex-1 overflow-hidden">
        <div ref={scrollRef} className="h-full overflow-y-auto">
          <div className="flex" style={{ height: `${15 * HOUR_HEIGHT}px` }}>
            {/* 左侧时间标签 */}
            <div className="w-14 flex-shrink-0 bg-slate-50 border-r border-slate-200">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="text-right pr-2 relative"
                  style={{ height: `${HOUR_HEIGHT}px` }}
                >
                  <span className="text-xs text-slate-400 font-medium absolute right-2 top-0 transform -translate-y-1/2">
                    {hour.toString().padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {/* 日期列 */}
            <div className="flex-1 relative border-l border-slate-200">
              {/* 时间格子 */}
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="border-b border-slate-100 cursor-pointer hover:bg-blue-50/50 transition-colors relative"
                  style={{ height: `${HOUR_HEIGHT}px` }}
                  onClick={() => onSlotClick(hour)}
                >
                  {/* 半点线 */}
                  <div
                    className="absolute left-0 right-0 border-b border-dashed border-slate-100"
                    style={{ top: '50%' }}
                  />
                </div>
              ))}

              {/* 当前时间红线 */}
              {isToday && currentTimeTop >= 0 && (
                <div
                  className="absolute left-0 right-0 h-0.5 bg-red-500 z-20 pointer-events-none"
                  style={{ top: `${currentTimeTop}px` }}
                >
                  <div className="absolute left-0 -top-1 w-2 h-2 bg-red-500 rounded-full" />
                </div>
              )}

              {/* 事件层 */}
              <div className="absolute inset-0 pointer-events-none">
                {filteredEvents.filter(e => !e.isAllDay && e.startTime && e.endTime).map((event) => {
                  const [startH, startM] = event.startTime!.split(':').map(Number);
                  const [endH, endM] = event.endTime!.split(':').map(Number);
                  const startMinutes = (startH - 8) * 60 + startM;
                  const endMinutes = (endH - 8) * 60 + endM;
                  const top = (startMinutes / 60) * HOUR_HEIGHT;
                  const height = ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT;

                  return (
                    <div
                      key={event.id}
                      className="absolute left-1 right-1 pointer-events-auto"
                      style={{
                        top: `${top}px`,
                        height: `${Math.max(height, 20)}px`,
                      }}
                    >
                      <EventBlock
                        event={event}
                        onClick={onEventClick}
                        height={Math.max(height, 20)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
