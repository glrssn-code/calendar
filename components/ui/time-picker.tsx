'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  className?: string;
}

export function TimePicker({ value, onChange, className = '' }: TimePickerProps) {
  const [hour, minute] = value.split(':').map(Number);
  const containerRef = useRef<HTMLDivElement>(null);

  const hours = Array.from({ length: 15 }, (_, i) => i + 8); // 8-22
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const handleHourChange = (delta: number) => {
    let newHour = hour + delta;
    if (newHour < 8) newHour = 22;
    if (newHour > 22) newHour = 8;
    onChange(`${newHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
  };

  const handleMinuteChange = (delta: number) => {
    let newMinute = minute + delta;
    let newHour = hour;
    if (newMinute < 0) {
      newMinute = 55;
      newHour = hour - 1;
      if (newHour < 8) newHour = 22;
    } else if (newMinute > 55) {
      newMinute = 0;
      newHour = hour + 1;
      if (newHour > 22) newHour = 8;
    }
    onChange(`${newHour.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.deltaY < 0) {
        handleMinuteChange(5);
      } else {
        handleMinuteChange(-5);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [hour, minute]);

  return (
    <div
      ref={containerRef}
      className={`flex items-center gap-1 bg-slate-50 rounded-lg border border-slate-200 p-2 ${className}`}
    >
      {/* 小时选择器 */}
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={() => handleHourChange(1)}
          className="p-0.5 hover:bg-slate-200 rounded transition-colors"
        >
          <ChevronUp className="w-4 h-4 text-slate-500" />
        </button>
        <div className="w-12 text-center font-mono font-semibold text-slate-700">
          {hour.toString().padStart(2, '0')}
        </div>
        <button
          type="button"
          onClick={() => handleHourChange(-1)}
          className="p-0.5 hover:bg-slate-200 rounded transition-colors"
        >
          <ChevronDown className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      <span className="text-slate-400 font-bold">:</span>

      {/* 分钟选择器 */}
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={() => handleMinuteChange(5)}
          className="p-0.5 hover:bg-slate-200 rounded transition-colors"
        >
          <ChevronUp className="w-4 h-4 text-slate-500" />
        </button>
        <div className="w-12 text-center font-mono font-semibold text-slate-700">
          {minute.toString().padStart(2, '0')}
        </div>
        <button
          type="button"
          onClick={() => handleMinuteChange(-5)}
          className="p-0.5 hover:bg-slate-200 rounded transition-colors"
        >
          <ChevronDown className="w-4 h-4 text-slate-500" />
        </button>
      </div>
    </div>
  );
}
