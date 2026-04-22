'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CalendarEvent, EventColor } from '@/types/event';

interface EventBlockProps {
  event: CalendarEvent;
  onClick: (event: CalendarEvent) => void;
  height?: number;
  theme?: 'skeuomorphic' | 'cartoon' | 'frostedGlass';
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

export function EventBlock({ event, onClick, height, theme = 'skeuomorphic', onDragStart, onDragEnd, onToggleComplete }: EventBlockProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
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

  // 计算事件时长
  const getEventDuration = (() => {
    if (!event.startTime || !event.endTime) return 60;
    const [startH, startM] = event.startTime.split(':').map(Number);
    const [endH, endM] = event.endTime.split(':').map(Number);
    return (endH * 60 + endM) - (startH * 60 + startM);
  })();

  // 是否小于50分钟（单行省略号）
  const isShortEvent = getEventDuration < 50;
  // 是否小于1小时（不显示类别）
  const isNoCategoryEvent = getEventDuration >= 50 && getEventDuration < 60;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekday = weekdays[date.getDay()];
    return `${month}月${day}日 ${weekday}`;
  };

  // 毛玻璃主题的水晶效果
  const isFrostedGlass = theme === 'frostedGlass';

  // 颜色到渐变的映射（水晶效果）- 减少白色高光
  const COLOR_GRADIENTS: Record<EventColor, string> = {
    blue: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(59,130,246,0.85) 50%, rgba(99,102,241,0.9) 100%)',
    green: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(34,197,94,0.85) 50%, rgba(22,163,74,0.9) 100%)',
    yellow: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(250,204,21,0.85) 50%, rgba(234,179,8,0.9) 100%)',
    orange: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(249,115,22,0.85) 50%, rgba(234,88,6,0.9) 100%)',
    indigo: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(99,102,241,0.85) 50%, rgba(79,70,229,0.9) 100%)',
    purple: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(168,85,247,0.85) 50%, rgba(147,51,234,0.9) 100%)',
  };

  const URGENT_GRADIENT = 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(239,68,68,0.85) 50%, rgba(220,38,38,0.9) 100%)';

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        className={`absolute left-1 right-1 rounded-lg px-2.5 py-1.5 text-xs text-white overflow-hidden cursor-grab active:cursor-grabbing hover:opacity-85 flex flex-col min-w-0 ${isShortEvent || isNoCategoryEvent ? 'items-center justify-center' : 'items-stretch justify-start'} ${isFrostedGlass ? '' : 'shadow-lg shadow-black/20 ring-1 ring-black/10'} ${colorClass} ${event.isUrgent ? 'ring-2 ring-white/50 animate-pulse' : ''} ${isDragging ? 'opacity-50 cursor-grabbing' : ''}`}
        style={{
          top: '0',
          height: height ? `${height}px` : '100%',
          transition: isDragging ? 'none' : 'opacity 0.15s ease, box-shadow 0.15s ease',
          ...(isFrostedGlass ? {
            background: event.isUrgent ? URGENT_GRADIENT : COLOR_GRADIENTS[event.color],
            backdropFilter: 'blur(12px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15), inset 0 1px 2px rgba(255,255,255,0.5), inset 0 -1px 2px rgba(0,0,0,0.1)',
            border: '1px solid rgba(255,255,255,0.4)',
          } : {}),
        }}
        onClick={(e) => {
          // 如果发生过拖动，不触发点击
          if (isDraggingRef.current) return;

          // 检查是否真的有移动（防止误触）
          if (dragStartPosRef.current) {
            const dx = Math.abs(e.clientX - dragStartPosRef.current.x);
            const dy = Math.abs(e.clientY - dragStartPosRef.current.y);
            // 如果移动距离超过5px，认为是拖动而非点击
            if (dx > 5 || dy > 5) return;
          }

          const now = Date.now();
          // 如果距离上次点击少于 240ms，认为是双击的一部分，不处理
          if (now - lastClickTimeRef.current < 240) {
            return;
          }
          lastClickTimeRef.current = now;

          e.stopPropagation();
          // 延迟处理单击，如果期间发生双击会被取消
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
          dragStartPosRef.current = { x: e.clientX, y: e.clientY };
          onDragStart?.(event, e);
        }}
        onMouseUp={() => {
          if (isDraggingRef.current) {
            setIsDragging(false);
            isDraggingRef.current = false;
            // 延迟重置 dragStartPosRef，确保 onClick 能访问到
            setTimeout(() => {
              dragStartPosRef.current = null;
            }, 300);
            onDragEnd?.();
          }
        }}
      >
        {/* 毛玻璃水晶高光效果 - 减少高光 */}
        {isFrostedGlass && (
          <>
            {/* 左上角主高光 - 小一点，柔和一点 */}
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                width: '25%',
                height: '25%',
                top: '8%',
                left: '8%',
                background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
              }}
            />
          </>
        )}
        {/* 标题 */}
        <div
          ref={titleRef}
          className={`font-semibold text-[13px] leading-tight text-center px-1 w-full max-w-full ${isShortEvent ? 'whitespace-nowrap truncate' : 'whitespace-pre-wrap'} ${isFrostedGlass ? 'text-slate-900' : 'text-white'} ${event.completed ? 'line-through opacity-70' : ''}`}
          style={{ wordBreak: isShortEvent ? 'normal' : 'break-all' }}
        >{event.title}</div>
        {/* 分类 */}
        {!isShortEvent && !isNoCategoryEvent && (
          <div className={`text-[11px] leading-tight text-center px-1 w-full ${isFrostedGlass ? 'text-slate-700' : 'opacity-90'} ${event.completed ? 'line-through opacity-70' : ''}`}>
            {event.category}
          </div>
        )}
        {event.isUrgent && (
          <div className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-bold backdrop-blur-sm ${isFrostedGlass ? 'bg-white/50 text-red-600' : 'bg-white/30 text-white'}`}>
            紧急
          </div>
        )}
        {event.reminderEnabled && !event.isUrgent && (
          <div className={`absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center backdrop-blur-sm ${isFrostedGlass ? 'bg-white/50' : 'bg-white/30'}`}>
            <svg className={`w-2.5 h-2.5 ${isFrostedGlass ? 'text-red-500' : 'text-white'}`} fill="currentColor" viewBox="0 0 20 20">
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
