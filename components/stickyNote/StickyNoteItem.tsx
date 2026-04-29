'use client';

import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { StickyNote } from '@/types/stickyNote';
import { X, Clock, Check, AlertCircle } from 'lucide-react';

const COLOR_MAP: Record<string, { bg: string; border: string; hover: string; bar: string }> = {
  orange: { bg: 'bg-orange-100', border: 'border-orange-300', hover: 'hover:bg-orange-200', bar: '#f97316' },
  yellow: { bg: 'bg-yellow-100', border: 'border-yellow-300', hover: 'hover:bg-yellow-200', bar: '#eab308' },
  green: { bg: 'bg-green-100', border: 'border-green-300', hover: 'hover:bg-green-200', bar: '#22c55e' },
  blue: { bg: 'bg-blue-100', border: 'border-blue-300', hover: 'hover:bg-blue-200', bar: '#3b82f6' },
  indigo: { bg: 'bg-indigo-100', border: 'border-indigo-300', hover: 'hover:bg-indigo-200', bar: '#6366f1' },
  purple: { bg: 'bg-purple-100', border: 'border-purple-300', hover: 'hover:bg-purple-200', bar: '#a855f7' },
};

interface StickyNoteItemProps {
  note: StickyNote;
  onUpdate: (note: StickyNote) => void;
  onDelete: (id: string) => void;
  onSetReminder: (id: string, date: string, time: string) => void;
  onClearReminder: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onNoteClick?: (id: string) => void;
  isDragging?: boolean;
  isEditing?: boolean;
  onCloseEdit?: () => void;
}

export function StickyNoteItem({
  note,
  onUpdate,
  onDelete,
  onSetReminder,
  onClearReminder,
  onToggleComplete,
  onNoteClick,
  isDragging,
  isEditing = false,
  onCloseEdit,
}: StickyNoteItemProps) {
  const [editTitle, setEditTitle] = useState(note.title);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastClickTimeRef = useRef<number>(0);

  // 当便签更新时，同步本地状态
  useEffect(() => {
    setEditTitle(note.title);
  }, [note.title]);

  const colorStyle = COLOR_MAP[note.color] || COLOR_MAP.blue;

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // 取消待处理的单击事件
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    onToggleComplete(note.id);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onNoteClick) return;

    const now = Date.now();
    // 如果距离上次点击少于 240ms，认为是双击的一部分，不处理
    if (now - lastClickTimeRef.current < 240) {
      return;
    }
    lastClickTimeRef.current = now;

    // 延迟 240ms 处理单击，如果期间发生双击会被取消
    clickTimeoutRef.current = setTimeout(() => {
      onNoteClick(note.id);
    }, 250);
  };

  const handleTitleBlur = () => {
    if (editTitle.trim() && editTitle !== note.title) {
      onUpdate({ ...note, title: editTitle.trim() });
    }
    // 关闭编辑状态
    if (isEditing && onCloseEdit) {
      onCloseEdit();
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleBlur();
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onDelete(note.id);
  };

  const handleInputClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={`
        relative p-2 rounded-lg border ${colorStyle.bg} ${colorStyle.border}
        ${colorStyle.hover} transition-all duration-150
        ${note.completed ? 'opacity-60' : ''}
        ${isDragging ? 'opacity-50 scale-95' : ''}
        group select-none cursor-grab active:cursor-grabbing
      `}
      style={{ minHeight: '48px', maxHeight: '120px' }}
    >
      {/* 紧急标记 */}
      {note.isUrgent && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center z-20 shadow-md">
          <AlertCircle className="w-3 h-3 text-white" />
        </div>
      )}

      {/* 删除按钮 */}
      <button
        onClick={handleDeleteClick}
        className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-400 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-500 z-10"
      >
        <X className="w-3 h-3" />
      </button>

      {/* 颜色条 */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
        style={{ backgroundColor: colorStyle.bar }}
      />

      {/* 内容 */}
      <div className="pl-3 pr-6">
        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            onClick={handleInputClick}
            className="w-full bg-white border border-slate-400 outline-none text-sm"
            autoFocus
          />
        ) : (
          <div>
            <p className={`text-sm font-medium text-slate-800 ${note.completed ? 'line-through' : ''}`}>
              {note.title}
            </p>
            {/* 内容（如果存在） */}
            {note.content && (
              <p className={`text-xs text-slate-500 mt-0.5 line-clamp-3 ${note.completed ? 'line-through' : ''}`}>
                {note.content}
              </p>
            )}
            {/* 提醒时间图标（如果设置了） */}
            {note.reminderTime && (
              <div className="flex items-center gap-1 mt-1">
                <Clock className="w-3 h-3 text-blue-500" />
                <span className="text-[10px] text-slate-400">
                  {note.reminderDate && format(new Date(note.reminderDate), 'M月d日')} {note.reminderTime}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 完成标记 */}
      {note.completed && (
        <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-green-500 text-white flex items-center justify-center">
          <Check className="w-3 h-3" />
        </div>
      )}
    </div>
  );
}
