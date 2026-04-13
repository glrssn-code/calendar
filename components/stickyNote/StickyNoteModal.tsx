'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { useStickyNotes } from '@/context/StickyNoteContext';
import { EventColor } from '@/lib/constants';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ToggleSwitch } from '@/components/ui/toggle';
import { COLOR_OPTIONS } from '@/lib/constants';

interface StickyNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StickyNoteModal({ isOpen, onClose }: StickyNoteModalProps) {
  const { addNote } = useStickyNotes();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState<EventColor>('orange');
  const [completed, setCompleted] = useState(false);

  const handleSubmit = () => {
    if (title.trim()) {
      addNote({
        title: title.trim(),
        content: content.trim() || undefined,
        color,
        isUrgent: false,
        completed,
      });
      setTitle('');
      setContent('');
      setColor('orange');
      setCompleted(false);
      onClose();
    }
  };

  const handleClose = () => {
    setTitle('');
    setContent('');
    setColor('orange');
    setCompleted(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[340px] ios-dialog p-5">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-[#1c1c1e] text-[17px] font-semibold">新建便签</DialogTitle>
        </DialogHeader>

        {/* 内容 */}
        <div className="space-y-4">
          {/* 标题 */}
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入便签标题..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
                if (e.key === 'Escape') handleClose();
              }}
            />
          </div>

          {/* 内容 */}
          <div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="输入便签内容（可选）..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 text-sm resize-none"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Escape') handleClose();
              }}
            />
          </div>

          {/* 颜色选择（显示类别） */}
          <div>
            <label className="block text-xs text-slate-500 mb-2">选择颜色</label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map((colorOption) => {
                return (
                  <button
                    key={colorOption.value}
                    onClick={() => setColor(colorOption.value)}
                    className="flex flex-col items-center gap-1 transition-all"
                    style={{
                      outline: color === colorOption.value ? '3px solid #64748b' : 'none',
                      outlineOffset: '2px',
                      borderRadius: '8px',
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: colorOption.hex }}
                    >
                      {color === colorOption.value && (
                        <span className="text-white text-sm font-bold">✓</span>
                      )}
                    </div>
                    <span className={`text-xs ${color === colorOption.value ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
                      {colorOption.category}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 已完成选项 */}
          <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Check className={`w-4 h-4 ${completed ? 'text-green-500' : 'text-slate-400'}`} />
              <span className={`text-sm ${completed ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>
                已完成
              </span>
            </div>
            <ToggleSwitch checked={completed} onChange={setCompleted} />
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex gap-2 pt-3 border-t border-slate-100">
          <button
            onClick={handleClose}
            className="flex-1 py-2 px-4 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            创建
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
