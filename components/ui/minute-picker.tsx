'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface MinutePickerProps {
  value: number; // 0-60
  onChange: (minute: number) => void;
  className?: string;
}

export function MinutePicker({ value, onChange, className = '' }: MinutePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMinuteChange = (delta: number) => {
    let newMinute = value + delta;
    if (newMinute < 0) newMinute = 60;
    if (newMinute > 60) newMinute = 0;
    onChange(newMinute);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.deltaY < 0) {
        handleMinuteChange(1);
      } else {
        handleMinuteChange(-1);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [value]);

  return (
    <div
      ref={containerRef}
      className={`flex items-center gap-1 bg-slate-50 rounded-lg border border-slate-200 p-2 ${className}`}
    >
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={() => handleMinuteChange(1)}
          className="p-0.5 hover:bg-slate-200 rounded transition-colors"
        >
          <ChevronUp className="w-4 h-4 text-slate-500" />
        </button>
        <div className="w-12 text-center font-mono font-semibold text-slate-700">
          {value.toString().padStart(2, '0')}
        </div>
        <button
          type="button"
          onClick={() => handleMinuteChange(-1)}
          className="p-0.5 hover:bg-slate-200 rounded transition-colors"
        >
          <ChevronDown className="w-4 h-4 text-slate-500" />
        </button>
      </div>
      <span className="text-slate-400 font-medium text-sm">分钟</span>
    </div>
  );
}