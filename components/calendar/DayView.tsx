'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
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
  onEventUpdate: (event: CalendarEvent) => void;
  filteredEventIds?: Set<string> | null;
}

export function DayView({
  date,
  events,
  onDateChange,
  onEventClick,
  onSlotClick,
  onEventUpdate,
  filteredEventIds,
}: DayViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);

  // 过滤后的事件
  const filteredEvents = filteredEventIds
    ? events.filter(e => filteredEventIds.has(e.id))
    : events;

  // 全天待办事件
  const todoEvents = filteredEvents.filter(event => event.isAllDay);
  // 定时事件
  const timedEvents = filteredEvents.filter(event => !event.isAllDay && event.startTime && event.endTime);

  // 当前时间红线位置
  const now = new Date();
  const isToday = isSameDay(date, now);
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeTop = isToday ? ((currentHour - 8) * 60 + currentMinute) : -1;

  // 滚动到当前时间
  useEffect(() => {
    if (timelineScrollRef.current && isToday) {
      const scrollTop = Math.max(0, currentTimeTop - 100);
      timelineScrollRef.current.scrollTop = scrollTop;
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

  // 拖拽处理：将待办拖拽到时间轴
  const handleTodoDragEnd = useCallback((event: CalendarEvent, hour: number) => {
    if (!event.isAllDay) return;

    const startTime = `${hour.toString().padStart(2, '0')}:00`;
    const endHour = hour + 1;
    const endTime = `${endHour.toString().padStart(2, '0')}:00`;

    const updatedEvent: CalendarEvent = {
      ...event,
      isAllDay: false,
      startTime,
      endTime,
    };
    onEventUpdate(updatedEvent);
  }, [onEventUpdate]);

  // 拖拽处理：将定时事件拖拽到待办区
  const handleTimedToTodo = useCallback((event: CalendarEvent) => {
    if (event.isAllDay) return;

    const updatedEvent: CalendarEvent = {
      ...event,
      isAllDay: true,
      startTime: undefined,
      endTime: undefined,
      reminderEnabled: false,
    };
    onEventUpdate(updatedEvent);
  }, [onEventUpdate]);

  // 切换待办完成状态
  const toggleTodoComplete = useCallback((event: CalendarEvent) => {
    const updatedEvent: CalendarEvent = {
      ...event,
      completed: !event.completed,
    };
    onEventUpdate(updatedEvent);
  }, [onEventUpdate]);

  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const dayOfWeek = weekdays[date.getDay()];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 日期头部 */}
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

      {/* 两栏布局：左侧待办(1份) + 右侧时间轴(2份) */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧：待办列表 */}
        <div className="w-1/3 border-r border-slate-200 flex flex-col bg-slate-50">
          <div className="px-3 py-2 border-b border-slate-200 bg-white">
            <span className="text-sm font-medium text-slate-700">待办事项</span>
            <span className="ml-2 text-xs text-slate-400">({todoEvents.filter(e => !e.completed).length} 未完成)</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {todoEvents.length === 0 ? (
              <div className="text-center text-xs text-slate-400 py-8">
                暂无待办事项
                <br />
                <span className="text-slate-300">拖拽事件到此处可转为待办</span>
              </div>
            ) : (
              <div className="space-y-1">
                {todoEvents.map((event) => (
                  <div
                    key={event.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('event', JSON.stringify(event));
                      e.dataTransfer.setData('source', 'todo');
                    }}
                    className={`group px-2 py-2 rounded-lg cursor-pointer transition-all ${
                      event.completed
                        ? 'bg-slate-100 opacity-60'
                        : event.isUrgent
                        ? 'bg-red-50 border border-red-200 hover:bg-red-100'
                        : 'bg-white border border-slate-200 hover:border-blue-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleTodoComplete(event)}
                        className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                          event.completed
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-slate-300 hover:border-green-400'
                        }`}
                      >
                        {event.completed && (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <div
                        className="flex-1 text-sm truncate"
                        onClick={() => onEventClick(event)}
                      >
                        <span className={event.completed ? 'line-through text-slate-400' : ''}>
                          {event.title}
                        </span>
                      </div>
                      <button
                        onClick={() => handleTimedToTodo(event)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-500 transition-opacity"
                        title="转为定时事件"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    </div>
                    {event.description && (
                      <p className="mt-1 text-xs text-slate-400 truncate pl-6">{event.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 右侧：时间轴 */}
        <div className="w-2/3 flex flex-col">
          <div className="px-3 py-2 border-b border-slate-200 bg-white">
            <span className="text-sm font-medium text-slate-700">定时提醒</span>
            <span className="ml-2 text-xs text-slate-400">({timedEvents.length} 个)</span>
          </div>
          <div
            ref={timelineScrollRef}
            className="flex-1 overflow-y-auto"
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(e) => {
              e.preventDefault();
              const data = e.dataTransfer.getData('event');
              const source = e.dataTransfer.getData('source');
              if (data && source === 'todo') {
                const event = JSON.parse(data) as CalendarEvent;
                const rect = e.currentTarget.getBoundingClientRect();
                const y = e.clientY - rect.top + timelineScrollRef.current!.scrollTop;
                const hour = Math.floor(y / HOUR_HEIGHT) + 8;
                if (hour >= 8 && hour <= 22) {
                  handleTodoDragEnd(event, hour);
                }
              }
            }}
          >
            <div className="flex" style={{ height: `${15 * HOUR_HEIGHT}px` }}>
              {/* 左侧时间标签 */}
              <div className="w-12 flex-shrink-0 bg-slate-50 border-r border-slate-200">
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

              {/* 时间列 */}
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
                  {timedEvents.map((event) => (
                    <div
                      key={event.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('event', JSON.stringify(event));
                        e.dataTransfer.setData('source', 'timeline');
                      }}
                      className="absolute left-1 right-1 pointer-events-auto"
                      style={{
                        top: `${((parseInt(event.startTime!.split(':')[0]) - 8) * 60 + parseInt(event.startTime!.split(':')[1])) / 60 * HOUR_HEIGHT}px`,
                        height: `${((parseInt(event.endTime!.split(':')[0]) * 60 + parseInt(event.endTime!.split(':')[1])) - (parseInt(event.startTime!.split(':')[0]) * 60 + parseInt(event.startTime!.split(':')[1]))) / 60 * HOUR_HEIGHT}px`,
                      }}
                    >
                      <EventBlock
                        event={event}
                        onClick={onEventClick}
                        height={((parseInt(event.endTime!.split(':')[0]) * 60 + parseInt(event.endTime!.split(':')[1])) - (parseInt(event.startTime!.split(':')[0]) * 60 + parseInt(event.startTime!.split(':')[1]))) / 60 * HOUR_HEIGHT}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
