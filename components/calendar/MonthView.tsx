'use client';

import { useState, useMemo, useRef } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isToday } from 'date-fns';
import { CalendarEvent } from '@/types/event';
import { createPortal } from 'react-dom';

const MIN_CELL_HEIGHT = 120;

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDateChange: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  onCreateEvent: (date: Date, hour: number) => void;
  filteredEventIds?: Set<string> | null;
  weekStartsOn?: 0 | 1;
}

const EVENT_COLORS: Record<string, string> = {
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  yellow: 'bg-amber-500',
  orange: 'bg-orange-500',
  indigo: 'bg-indigo-500',
  purple: 'bg-purple-500',
};

const DEFAULT_EVENT_COLOR = 'bg-blue-500';

function getEventColor(color: string | undefined, isUrgent: boolean): string {
  if (isUrgent) return 'bg-red-500';
  if (!color || !(color in EVENT_COLORS)) return DEFAULT_EVENT_COLOR;
  return EVENT_COLORS[color];
}

export function MonthView({
  currentDate,
  events,
  onDateChange,
  onEventClick,
  onCreateEvent,
  filteredEventIds,
  weekStartsOn = 0,
}: MonthViewProps) {
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [moreTooltip, setMoreTooltip] = useState<{ dateKey: string; events: CalendarEvent[]; x: number; y: number } | null>(null);
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // 过滤后的事件
  const filteredEvents = filteredEventIds
    ? events.filter(e => filteredEventIds.has(e.id))
    : events;

  // 计算当前月的日历网格
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const calStart = startOfWeek(monthStart, { weekStartsOn });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn });

    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentDate]);

  // 根据 weekStartsOn 计算星期顺序
  const weekdays = useMemo(() => {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    if (weekStartsOn === 1) {
      // 周一在前
      return [...days.slice(1), days[0]];
    }
    return days;
  }, [weekStartsOn]);

  // 按日期分组事件
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    filteredEvents.forEach(event => {
      const existing = map.get(event.date) || [];
      map.set(event.date, [...existing, event]);
    });
    return map;
  }, [filteredEvents]);

  const handleGoToToday = () => {
    onDateChange(new Date());
  };

  const handlePreviousMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    onDateChange(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    onDateChange(newDate);
  };

  // 星期几
  const dayOfWeek = weekdays[currentDate.getDay()];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 星期标题 - 拟物风格 */}
      <div className="flex border-b border-slate-200 bg-gradient-to-b from-slate-100 to-slate-200 py-2">
        {weekdays.map((day) => (
          <div
            key={day}
            className="flex-1 text-center text-xs font-medium text-slate-600"
          >
            {day}
          </div>
        ))}
      </div>

      {/* 日历网格 */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-7 min-h-0" style={{ minHeight: `${MIN_CELL_HEIGHT * 6}px` }}>
          {calendarDays.map((day, index) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDate.get(dateKey) || [];
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isDayToday = isToday(day);
            const isHovered = hoveredDate && isSameDay(day, hoveredDate);

            return (
              <div
                key={dateKey}
                ref={(el) => {
                  if (el) cellRefs.current.set(dateKey, el);
                }}
                className={`border-b border-r border-slate-100 p-1 cursor-pointer transition-colors ${
                  isCurrentMonth ? 'bg-white' : 'bg-slate-50'
                } ${isHovered ? 'bg-blue-50' : ''}`}
                style={{ minHeight: `${MIN_CELL_HEIGHT}px` }}
                onClick={() => onCreateEvent(day, 9)}
                onMouseEnter={() => setHoveredDate(day)}
                onMouseLeave={() => setHoveredDate(null)}
              >
                {/* 日期数字 */}
                <div className="flex items-center justify-center mb-1">
                  <div
                    className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium ${
                      isDayToday
                        ? 'bg-blue-500 text-white'
                        : isCurrentMonth
                        ? 'text-slate-700'
                        : 'text-slate-400'
                    }`}
                  >
                    {format(day, 'd')}
                  </div>
                </div>

                {/* 事件列表 */}
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 5).map((event) => (
                    <div
                      key={event.id}
                      className={`px-1 py-0.5 rounded text-[10px] text-white truncate cursor-pointer hover:opacity-80 transition-opacity ${getEventColor(event.color, event.isUrgent)} ${event.completed ? 'opacity-50 line-through' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                      }}
                    >
                      {event.isAllDay ? event.title : `${event.startTime?.slice(0, 5) || ''} ${event.title}`}
                    </div>
                  ))}
                  {dayEvents.length > 5 && (
                    <div
                      className="text-[10px] text-blue-500 px-1 cursor-pointer hover:text-blue-600 font-medium"
                      onClick={(e) => {
                        e.stopPropagation();
                        // 点击更多时不打开弹窗，而是显示 tooltip
                      }}
                      onMouseEnter={(e) => {
                        const rect = (e.target as HTMLElement).getBoundingClientRect();
                        setMoreTooltip({
                          dateKey,
                          events: dayEvents.slice(5),
                          x: rect.left,
                          y: rect.top,
                        });
                      }}
                      onMouseLeave={() => setMoreTooltip(null)}
                    >
                      +{dayEvents.length - 5} 更多
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 更多事项 Tooltip */}
      {moreTooltip && createPortal(
        <div
          className="fixed z-[100] bg-white rounded-lg shadow-xl border border-slate-200 p-2 max-w-48 text-xs"
          style={{
            left: moreTooltip.x,
            top: moreTooltip.y + 20,
          }}
          onMouseEnter={() => setMoreTooltip(moreTooltip)}
          onMouseLeave={() => setMoreTooltip(null)}
        >
          <div className="text-[10px] text-slate-500 mb-1.5 pb-1 border-b border-slate-100">
            剩余 {moreTooltip.events.length} 项
          </div>
          {moreTooltip.events.map((event) => (
            <div
              key={event.id}
              className={`px-1.5 py-0.5 rounded text-white truncate cursor-pointer hover:opacity-80 mb-0.5 ${getEventColor(event.color, event.isUrgent)} ${event.completed ? 'opacity-50 line-through' : ''}`}
              onClick={() => {
                setMoreTooltip(null);
                onEventClick(event);
              }}
            >
              {event.isAllDay ? event.title : `${event.startTime?.slice(0, 5) || ''} ${event.title}`}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
