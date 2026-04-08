'use client';

import { useState, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CalendarEvent } from '@/types/event';
import { EventBlock } from './EventBlock';
import { TIME_SLOTS } from '@/lib/dateUtils';
import { Plus } from 'lucide-react';

const HOUR_HEIGHT = 700 / 15;

// 每天不同的暖色背景
const DAY_COLORS = [
  { bg: 'bg-[#fff5f5]', text: 'text-[#ff6b6b]' }, // 周日 - 浅红
  { bg: 'bg-[#fff9e6]', text: 'text-[#f5a623]' }, // 周一 - 浅橙
  { bg: 'bg-[#fffbe6]', text: 'text-[#d4a100]' }, // 周二 - 浅黄
  { bg: 'bg-[#e6fff5]', text: 'text-[#10b981]' }, // 周三 - 浅绿
  { bg: 'bg-[#e6f5ff]', text: 'text-[#007aff]' }, // 周四 - 浅蓝
  { bg: 'bg-[#f5e6ff]', text: 'text-[#8b5cf6]' }, // 周五 - 浅紫
  { bg: 'bg-[#ffe6f0]', text: 'text-[#ec4899]' }, // 周六 - 浅粉
];

const getDayColor = (date: Date) => {
  return DAY_COLORS[date.getDay()];
};

// 计算事件是否重叠（假设传入的都是有时长的非全天事件）
function eventsOverlap(e1: CalendarEvent, e2: CalendarEvent): boolean {
  if (!e1.startTime || !e1.endTime || !e2.startTime || !e2.endTime) return false;
  const [s1h, s1m] = e1.startTime.split(':').map(Number);
  const [e1h, e1m] = e1.endTime.split(':').map(Number);
  const [s2h, s2m] = e2.startTime.split(':').map(Number);
  const [e2h, e2m] = e2.endTime.split(':').map(Number);

  const s1 = s1h * 60 + s1m;
  const e1t = e1h * 60 + e1m;
  const s2 = s2h * 60 + s2m;
  const e2t = e2h * 60 + e2m;

  return s1 < e2t && s2 < e1t;
}

// 为事件分配重叠组和列信息（排除全天事件）
function calculateEventLayout(events: CalendarEvent[]): Map<string, { col: number; cols: number }> {
  const layout = new Map<string, { col: number; cols: number }>();

  if (events.length === 0) return layout;

  // 过滤掉全天事件并排序
  const timedEvents = events.filter(e => !e.isAllDay && e.startTime && e.endTime);
  if (timedEvents.length === 0) return layout;

  const sorted = [...timedEvents].sort((a, b) => {
    const [ah, am] = a.startTime!.split(':').map(Number);
    const [bh, bm] = b.startTime!.split(':').map(Number);
    return (ah * 60 + am) - (bh * 60 + bm);
  });

  const groups: CalendarEvent[][] = [];
  let currentGroup: CalendarEvent[] = [];

  for (const event of sorted) {
    if (currentGroup.length === 0) {
      currentGroup.push(event);
    } else {
      const overlaps = currentGroup.some(e => eventsOverlap(e, event));
      if (overlaps) {
        currentGroup.push(event);
      } else {
        groups.push([...currentGroup]);
        currentGroup = [event];
      }
    }
  }
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  for (const group of groups) {
    const cols = group.length;
    group.forEach((event, idx) => {
      layout.set(event.id, { col: idx, cols });
    });
  }

  return layout;
}

interface DayColumnProps {
  date: Date;
  events: CalendarEvent[];
  onSlotClick: (date: Date, hour: number) => void;
  onEventClick: (event: CalendarEvent) => void;
  onEventUpdate?: (event: CalendarEvent) => void;
  isToday: boolean;
  showHeader?: boolean;
  // 拖动相关（由父组件管理）
  draggingEvent?: CalendarEvent | null;
  dragPreview?: { date: Date; top: number } | null;
  isDragging?: boolean;
  onDragStart?: (event: CalendarEvent, e: React.MouseEvent, date: Date) => void;
  dragMovedRef?: React.MutableRefObject<boolean>;
}

export function DayColumn({
  date,
  events,
  onSlotClick,
  onEventClick,
  onEventUpdate,
  isToday,
  showHeader = true,
  draggingEvent: externalDraggingEvent,
  dragPreview: externalDragPreview,
  isDragging: externalIsDragging,
  onDragStart: externalOnDragStart,
  dragMovedRef,
}: DayColumnProps) {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const totalMinutes = (22 - 8) * 60;
  const currentMinutesFrom8 = (currentHour - 8) * 60 + currentMinute;
  const currentTimePosition = currentMinutesFrom8 >= 0 && currentMinutesFrom8 <= totalMinutes
    ? (currentMinutesFrom8 / 60) * HOUR_HEIGHT
    : -1;

  const dayColor = getDayColor(date);
  const [hoveredSlot, setHoveredSlot] = useState<{ hour: number; top: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 判断是否正在拖动（来自外部）
  const isDraggingFromExternal = externalIsDragging || false;
  const isThisColumnBeingDraggedTo = externalDragPreview &&
    format(externalDragPreview.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');

  // 计算当前日期的事件中是否有正在被拖动的
  const draggingEventId = externalDraggingEvent?.id;

  // 检查某时间点是否有事件
  const slotHasEvent = (hour: number) => {
    return events.some(event => {
      if (event.isAllDay || !event.startTime || !event.endTime) return false;
      const [startH] = event.startTime.split(':').map(Number);
      const [endH] = event.endTime.split(':').map(Number);
      return hour >= startH && hour < endH;
    });
  };

  // 处理事件块拖动开始
  const handleEventDragStart = useCallback((event: CalendarEvent, e: React.MouseEvent) => {
    if (externalOnDragStart) {
      externalOnDragStart(event, e, date);
    }
  }, [externalOnDragStart, date]);

  // 处理时间格子点击
  const handleSlotClick = useCallback((slotHour: number) => {
    if (dragMovedRef?.current) {
      return;
    }
    onSlotClick(date, slotHour);
  }, [date, onSlotClick, dragMovedRef]);

  // 处理悬停
  const handleHover = useCallback((hovered: boolean, hour: number, top: number) => {
    if (hovered && !slotHasEvent(hour) && !isDraggingFromExternal) {
      setHoveredSlot({ hour, top });
    } else if (!hovered) {
      setHoveredSlot(null);
    }
  }, [isDraggingFromExternal]);

  return (
    <div className="flex-1 min-w-0 border-r border-[#e5e5ea] last:border-r-0 bg-white relative">
      {showHeader && (
        <div className={`text-center py-3 border-b border-[#e5e5ea] ${dayColor.bg} rounded-0`}>
          <div className={`text-xs font-medium tracking-wide ${isToday ? 'text-[#007aff]' : dayColor.text}`}>
            {format(date, 'EEE', { locale: zhCN }).replace('周', '')}
          </div>
          <div
            className={`text-lg font-semibold mt-0.5 ${
              isToday
                ? 'text-white bg-[#007aff] w-8 h-8 rounded-full flex items-center justify-center mx-auto shadow-md'
                : `${dayColor.text}`
            }`}
          >
            {format(date, 'd')}
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className="relative"
        style={{ height: '700px' }}
      >
        {/* 时间格子 */}
        {TIME_SLOTS.map((slot, index) => {
          const top = index * HOUR_HEIGHT;
          return (
            <TimeSlot
              key={index}
              hour={slot.hour}
              top={top}
              height={HOUR_HEIGHT}
              onSlotClick={handleSlotClick}
              onHover={handleHover}
              isDragging={isDraggingFromExternal}
            />
          );
        })}

        {/* 事件层 */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ height: '700px' }}
        >
          {(() => {
            const timedEvents = events.filter(e => !e.isAllDay && e.startTime && e.endTime);
            const layout = calculateEventLayout(timedEvents);
            const MIN_HEIGHT = HOUR_HEIGHT / 2;

            return timedEvents.map((event) => {
              const [startH, startM] = event.startTime!.split(':').map(Number);
              const [endH, endM] = event.endTime!.split(':').map(Number);
              const startMinutes = (startH - 8) * 60 + startM;
              const endMinutes = (endH - 8) * 60 + endM;
              const top = (startMinutes / (15 * 60)) * 700;
              const calculatedHeight = ((endMinutes - startMinutes) / (15 * 60)) * 700;
              const height = Math.max(calculatedHeight, MIN_HEIGHT);

              const { col, cols } = layout.get(event.id) || { col: 0, cols: 1 };
              const gap = 2;
              const totalGaps = (cols - 1) * gap;
              const availWidth = 100 - totalGaps;
              const width = availWidth / cols;
              const left = col * (width + gap);

              // 检查是否是正在拖动的事件
              const isDragging = draggingEventId === event.id;

              return (
                <div
                  key={event.id}
                  className="absolute pointer-events-auto"
                  style={{
                    top: `${top}px`,
                    height: `${height}px`,
                    left: `${left}%`,
                    width: `${width}%`,
                    zIndex: isDragging ? 20 : 10,
                    opacity: isDragging ? 0.5 : 1,
                  }}
                >
                  <EventBlock
                    event={event}
                    onClick={() => {
                      if (dragMovedRef?.current) {
                        return;
                      }
                      onEventClick(event);
                    }}
                    height={height}
                    onDragStart={handleEventDragStart}
                    onDragEnd={() => {}} // 由父组件处理
                    onToggleComplete={onEventUpdate ? (e) => {
                      const updated = { ...e, completed: !e.completed };
                      onEventUpdate(updated);
                    } : undefined}
                  />
                </div>
              );
            });
          })()}

          {/* 跨天拖动预览 - 显示在目标列 */}
          {externalDraggingEvent && externalDragPreview && isThisColumnBeingDraggedTo && externalDraggingEvent.startTime && externalDraggingEvent.endTime && (
            <div
              className="absolute pointer-events-none"
              style={{
                top: `${externalDragPreview.top}px`,
                height: `${((parseInt(externalDraggingEvent.endTime.split(':')[0]) * 60 + parseInt(externalDraggingEvent.endTime.split(':')[1])) - (parseInt(externalDraggingEvent.startTime.split(':')[0]) * 60 + parseInt(externalDraggingEvent.startTime.split(':')[1]))) / 60 * HOUR_HEIGHT}px`,
                left: '4%',
                width: '92%',
                zIndex: 25,
              }}
            >
              <div className="w-full h-full border-2 border-dashed border-blue-400 rounded-lg bg-blue-50/50 backdrop-blur-sm flex items-center justify-center">
                <span className="text-xs text-blue-500 font-medium">{externalDraggingEvent.title}</span>
              </div>
            </div>
          )}
        </div>

        {/* 加号悬浮层 */}
        {hoveredSlot && !slotHasEvent(hoveredSlot.hour) && (
          <div
            className="absolute left-0 right-0 pointer-events-none"
            style={{
              top: `${hoveredSlot.top}px`,
              height: `${HOUR_HEIGHT}px`,
              zIndex: 15,
            }}
          >
            <div
              className="absolute inset-0 flex items-center justify-center"
              onClick={() => handleSlotClick(hoveredSlot.hour)}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(0, 122, 255, 0.9)' }}
              >
                <Plus className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        )}

        {isToday && currentTimePosition >= 0 && (
          <div
            className="absolute left-0 right-0 h-0.5 current-time-line z-20 pointer-events-none"
            style={{ top: `${currentTimePosition}px` }}
          />
        )}
      </div>
    </div>
  );
}

// 单个时间格子组件
function TimeSlot({
  hour,
  top,
  height,
  onSlotClick,
  onHover,
  isDragging,
}: {
  hour: number;
  top: number;
  height: number;
  onSlotClick: (hour: number) => void;
  onHover: (hovered: boolean, hour: number, top: number) => void;
  isDragging?: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="absolute left-0 right-0 cursor-pointer"
      style={{
        top: `${top}px`,
        height: `${height}px`,
        zIndex: isHovered && !isDragging ? 5 : 1,
      }}
      onMouseEnter={() => {
        if (!isDragging) {
          setIsHovered(true);
          onHover(true, hour, top);
        }
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        onHover(false, hour, top);
      }}
      onClick={() => onSlotClick(hour)}
    >
      <div
        className="w-full h-full"
        style={{
          backgroundColor: isHovered ? 'rgba(0, 122, 255, 0.08)' : 'transparent',
          borderRadius: isHovered ? 8 : 0,
        }}
      >
        <div
          className="w-full h-full border-t"
          style={{ borderColor: '#e5e5ea' }}
        />
      </div>
    </div>
  );
}