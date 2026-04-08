'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CalendarEvent, EventColor } from '@/types/event';

interface EventBlockProps {
  event: CalendarEvent;
  onClick: (event: CalendarEvent) => void;
  height?: number;
  onDragStart?: (event: CalendarEvent, e: React.MouseEvent) => void;
  onDragEnd?: () => void;
  onToggleComplete?: (event: CalendarEvent) => void;
}

// 颜色映射
const COLOR_CLASSES: Record<EventColor, string> = {
  blue: 'event-block-blue',
  green: 'event-block-emerald',
  yellow: 'event-block-amber',
  orange: 'event-block-orange',
  indigo: 'event-block-indigo',
  purple: 'event-block-purple',
};

export function EventBlock({ event, onClick, height, onDragStart, onDragEnd, onToggleComplete }: EventBlockProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isDraggingRef = useRef(false);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastClickTimeRef = useRef(0);

  // 监听 document 级别的 mouseUp，确保拖动结束能被正确处理
  useEffect(() => {
    const handleDocumentMouseUp = () => {
      if (isDraggingRef.current) {
        setIsDragging(false);
        isDraggingRef.current = false;
        onDragEnd?.();
      }
    };

    document.addEventListener('mouseup', handleDocumentMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleDocumentMouseUp);
    };
  }, [onDragEnd]);

  // 紧急事件用红色，普通事件用选中的颜色
  const colorClass = event.isUrgent ? 'event-block-urgent' : COLOR_CLASSES[event.color];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekday = weekdays[date.getDay()];
    return `${month}月${day}日 ${weekday}`;
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        className={`absolute left-1 right-1 rounded-lg px-2.5 py-1.5 text-xs text-white overflow-hidden cursor-grab active:cursor-grabbing hover:opacity-85 hover:shadow-lg ${colorClass} ${event.isUrgent ? 'ring-2 ring-white/50 animate-pulse' : ''} ${isDragging ? 'opacity-50 cursor-grabbing' : ''}`}
        style={{
          top: '0',
          height: height ? `${height}px` : '100%',
          transition: isDragging ? 'none' : 'opacity 0.15s ease, box-shadow 0.15s ease',
        }}
        onClick={(e) => {
          if (isDraggingRef.current) return;

          const now = Date.now();
          // 如果距离上次点击少于 250ms，认为是双击的一部分，不处理
          if (now - lastClickTimeRef.current < 250) {
            return;
          }
          lastClickTimeRef.current = now;

          e.stopPropagation();
          // 延迟 250ms 处理单击，如果期间发生双击会被取消
          clickTimeoutRef.current = setTimeout(() => {
            onClick(event);
          }, 250);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          // 取消待处理的单击事件
          if (clickTimeoutRef.current) {
            clearTimeout(clickTimeoutRef.current);
            clickTimeoutRef.current = null;
          }
          onToggleComplete?.(event);
        }}
        onMouseEnter={(e) => {
          setShowTooltip(true);
          if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setTooltipPosition({ x: rect.right, y: rect.top + rect.height / 2 });
          }
        }}
        onMouseLeave={() => setShowTooltip(false)}
        onMouseDown={(e) => {
          e.stopPropagation();
          setIsDragging(true);
          isDraggingRef.current = true;
          onDragStart?.(event, e);
        }}
        onMouseUp={() => {
          if (isDraggingRef.current) {
            setIsDragging(false);
            isDraggingRef.current = false;
            onDragEnd?.();
          }
        }}
      >
        <div className={`font-semibold text-[13px] leading-tight ${event.completed ? 'line-through opacity-70' : ''}`}>{event.title}</div>
        <div className={`opacity-90 text-[11px] mt-0.5 ${event.completed ? 'line-through opacity-70' : ''}`}>
          {event.category}
        </div>
        {event.isUrgent && (
          <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-white/30 rounded text-[10px] font-bold">
            紧急
          </div>
        )}
        {event.reminderEnabled && !event.isUrgent && (
          <div className="absolute top-1 right-1 w-4 h-4 bg-white/30 rounded-full flex items-center justify-center backdrop-blur-sm">
            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a6 6 0 0 0-6 6v3.586l-.707.707A1 1 0 0 0 4 14h12a1 1 0 0 0 .707-1.707L16 11.586V8a6 6 0 0 0-6-6zm0 16a3 3 0 0 1-3-3h6a3 3 0 0 1-3 3z"/>
            </svg>
          </div>
        )}
      </button>

      {/* 悬浮提示框 - 使用 Portal 渲染到 body 级别 */}
      {!isDragging && showTooltip && createPortal(
        <div
          className="absolute pointer-events-none z-[99999]"
          style={{
            left: tooltipPosition.x + 12,
            top: tooltipPosition.y,
            transform: 'translateY(-50%)',
          }}
        >
          <div className="ml-3 ios-tooltip rounded-2xl p-4 space-y-3 min-w-[180px]">
            <div className="flex items-center gap-3">
              <div className={`w-3.5 h-3.5 rounded-full ${event.isUrgent ? 'bg-red-500' : `bg-${event.color}-500`}`} />
              <div className="font-semibold text-[#1c1c1e] text-[15px]">
                {event.title}
              </div>
            </div>

            <div className="flex items-center gap-3 text-[13px] text-[#8e8e93]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{formatDate(event.date)}</span>
            </div>

            <div className="flex items-center gap-3 text-[13px] text-[#8e8e93]">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{event.startTime} - {event.endTime}</span>
            </div>

            {event.isUrgent && (
              <div className="flex items-center gap-3 text-[13px] text-red-500 font-medium">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>紧急事件</span>
              </div>
            )}

            {event.completed && (
              <div className="flex items-center gap-3 text-[13px] text-green-500 font-medium">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>已完成</span>
              </div>
            )}

            {event.reminderEnabled && (
              <div className="flex items-center gap-3 text-[13px] text-[#007aff]">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a6 6 0 0 0-6 6v3.586l-.707.707A1 1 0 0 0 4 14h12a1 1 0 0 0 .707-1.707L16 11.586V8a6 6 0 0 0-6-6zm0 16a3 3 0 0 1-3-3h6a3 3 0 0 1-3 3z"/>
                </svg>
                <span>{event.reminderMinutes === 0 ? '开始时提醒' : `提前 ${event.reminderMinutes} 分钟提醒`}</span>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
