'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useStickyNotes } from '@/context/StickyNoteContext';
import { StickyNoteItem } from './StickyNoteItem';
import { StickyNote } from '@/types/stickyNote';
import { useSettings } from '@/hooks/useSettings';
import { Plus, StickyNote as StickyNoteIcon, X, Check } from 'lucide-react';
import { EventColor } from '@/lib/constants';
import { StickyNoteModal } from './StickyNoteModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ToggleSwitch } from '@/components/ui/toggle';
import { useUndo } from '@/context/UndoContext';
import { stickyNoteDB } from '@/lib/db';
import { toast } from 'sonner';
import { COLOR_OPTIONS } from '@/lib/constants';
import { useNoteEventSync } from '@/hooks/useNoteEventSync';

const EXPANDED_WIDTH = 280;

interface StickyNotePanelProps {
  onCreateEvent: (date: Date, hour: number) => void;
  filteredNotes?: StickyNote[];
  searchQuery?: string;
}

export function StickyNotePanel({ onCreateEvent, filteredNotes, searchQuery }: StickyNotePanelProps) {
  const { notes, addNote, updateNote, deleteNote, reorderNotes, reloadNotes, setReminder, clearReminder, toggleComplete } = useStickyNotes();
  const { settings } = useSettings();
  const { pushAction } = useUndo();
  const { syncNoteCompletionToEvents, syncNoteColorToEvents, syncNoteTitleToEvents } = useNoteEventSync();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteColor, setNewNoteColor] = useState<EventColor>('blue');
  const [newNoteCompleted, setNewNoteCompleted] = useState(false);

  // 拖拽排序相关状态
  const [isReordering, setIsReordering] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showInsertLine, setShowInsertLine] = useState(false);

  // 使用 ref 来存储插入位置，确保在 drop 时能获取最新值
  const insertIndexRef = useRef<number | null>(null);
  // 存储被拖拽的便签
  const draggingNoteRef = useRef<StickyNote | null>(null);
  // 存储被拖拽的原始索引
  const draggingIndexRef = useRef<number>(-1);

  // 拖动检测 - 是否已经开始拖动
  const hasDragStarted = useRef(false);
  // 鼠标按下位置
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);
  // 当前编辑的便签ID
  const [editingNote, setEditingNote] = useState<StickyNote | null>(null);

  // 搜索模式下使用过滤后的便签，否则使用全部便签
  const displayNotes = searchQuery && filteredNotes !== undefined
    ? (filteredNotes.length > 0 ? filteredNotes : notes)
    : notes;

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  // 删除便签（带撤销）
  const handleDeleteNote = useCallback((id: string) => {
    const noteToDelete = notes.find(n => n.id === id);
    if (!noteToDelete) return;

    // 注册撤销操作
    pushAction({
      type: 'DELETE_STICKY_NOTE',
      description: `删除便签: ${noteToDelete.title}`,
      previousData: noteToDelete,
      undo: async () => {
        // 恢复便签到 IndexedDB
        await stickyNoteDB.add(noteToDelete);
        // 重新加载便签
        await reloadNotes();
        toast.success(`已恢复便签: ${noteToDelete.title}`);
      },
    });

    // 执行删除
    deleteNote(id);
    toast.success('便签已删除，按 Ctrl+Z 撤销');
  }, [notes, deleteNote, pushAction, reloadNotes]);

  // 切换完成状态（带同步）
  const handleToggleComplete = useCallback((id: string) => {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    const newCompleted = !note.completed;
    toggleComplete(id);
    // 同步到关联的事件
    syncNoteCompletionToEvents({ ...note, completed: newCompleted });
  }, [notes, toggleComplete, syncNoteCompletionToEvents]);

  // 更新便签（带同步）
  const handleUpdateNote = useCallback((note: StickyNote) => {
    const oldNote = notes.find(n => n.id === note.id);
    updateNote(note);
    // 同步变更到关联的事件
    if (oldNote) {
      if (oldNote.completed !== note.completed) {
        syncNoteCompletionToEvents(note);
      }
      if (oldNote.color !== note.color) {
        syncNoteColorToEvents(note);
      }
      if (oldNote.title !== note.title || oldNote.content !== note.content) {
        syncNoteTitleToEvents(note);
      }
    }
  }, [notes, updateNote, syncNoteCompletionToEvents, syncNoteColorToEvents, syncNoteTitleToEvents]);

  // 处理便签拖动开始 - 打开编辑弹窗
  const handleNoteClick = useCallback((note: StickyNote) => {
    // 如果已经开始拖动，不处理点击
    if (hasDragStarted.current) {
      hasDragStarted.current = false;
      return;
    }
    setEditingNote(note);
  }, []);

  // 处理便签拖动开始
  const handleDragStart = useCallback((e: React.DragEvent, note: StickyNote, index: number) => {
    try {
      e.dataTransfer.setData('text/plain', JSON.stringify(note));
      e.dataTransfer.effectAllowed = 'move';
    } catch (err) {
      console.error('[StickyNotePanel dragstart] error:', err);
    }
    setIsReordering(true);
    draggingNoteRef.current = note;
    draggingIndexRef.current = index;
    insertIndexRef.current = null;
  }, []);

  // 处理便签在面板内拖动
  const handleNoteDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (!e.dataTransfer.getData('text/plain')) return;

    e.dataTransfer.dropEffect = 'move';

    // 计算放置位置：基于鼠标在元素内的相对位置
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const isAbove = e.clientY < midY;

    const currentIndex = draggingIndexRef.current;
    if (currentIndex === -1) return;

    // 计算新位置
    let newInsertIndex: number;
    if (isAbove) {
      newInsertIndex = index;
    } else {
      newInsertIndex = index + 1;
    }

    // 调整：如果拖拽位置在目标位置之后，插入位置要减1
    if (currentIndex < newInsertIndex) {
      newInsertIndex = newInsertIndex - 1;
    }

    // 边界检查：notes.length 是有效插入位置（表示插入到末尾之后）
    newInsertIndex = Math.max(0, Math.min(notes.length, newInsertIndex))

    // 检查是否需要更新
    if (insertIndexRef.current !== newInsertIndex) {
      insertIndexRef.current = newInsertIndex;
      setDragOverIndex(index);
      setShowInsertLine(true);
    }
  }, [notes.length]);

  const handleNoteDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    const noteData = e.dataTransfer.getData('text/plain');
    if (!noteData) {
      // 数据不在，可能是拖拽到外部了
      setIsReordering(false);
      setDragOverIndex(null);
      setShowInsertLine(false);
      insertIndexRef.current = null;
      draggingNoteRef.current = null;
      draggingIndexRef.current = -1;
      return;
    }

    try {
      const draggedNote: StickyNote = JSON.parse(noteData);
      const draggedIndex = draggingIndexRef.current;

      if (draggedIndex !== -1) {
        let insertIndex = insertIndexRef.current;

        // 如果 insertIndex 为 null（没有经过 handleNoteDragOver），使用 targetIndex
        if (insertIndex === null) {
          insertIndex = targetIndex;
        }

        // 如果插入位置等于拖拽位置，不做任何操作
        if (insertIndex === draggedIndex) {
          // 什么都不做
        } else {
          // 执行排序
          const newNotes = [...notes];
          // 移除拖拽的便签
          newNotes.splice(draggedIndex, 1);

          // 重新计算插入位置（因为数组已经改变）
          let finalInsertIndex = insertIndex;
          if (draggedIndex < insertIndex) {
            // 向下移动：直接使用 insertIndex（移除后会自动填补空缺）
            finalInsertIndex = insertIndex;
          } else if (draggedIndex > insertIndex) {
            // 向上移动：使用 insertIndex
            finalInsertIndex = insertIndex;
          }

          // 插入到目标位置（clamp 到有效范围）
          const safeIndex = Math.max(0, Math.min(finalInsertIndex, newNotes.length));
          newNotes.splice(safeIndex, 0, draggedNote);
          reorderNotes(newNotes);
        }
      }
    } catch (err) {
      console.error('Failed to reorder notes:', err);
    }

    // 重置状态
    setIsReordering(false);
    setDragOverIndex(null);
    setShowInsertLine(false);
    insertIndexRef.current = null;
    draggingNoteRef.current = null;
    draggingIndexRef.current = -1;
  }, [notes, reorderNotes]);

  const handleDragEnd = useCallback(() => {
    setIsReordering(false);
    setDragOverIndex(null);
    setShowInsertLine(false);
    insertIndexRef.current = null;
    // 重置便签拖拽状态 - 通知日历清除预览
    window.dispatchEvent(new CustomEvent('sticky-note-drag-end'));
    draggingNoteRef.current = null;
    draggingIndexRef.current = -1;
  }, []);

  const handlePanelDragOver = useCallback((e: React.DragEvent) => {
    // 只在面板上时允许拖拽
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handlePanelDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 如果 drop 在面板内部，交给 handleNoteDrop 处理
    // 这里只处理拖出面板的情况（比如拖到日历）
    const noteData = e.dataTransfer.getData('text/plain');
    if (!noteData) {
      handleDragEnd();
    }
  }, [handleDragEnd]);

  // 关闭编辑弹窗
  const handleCloseEditModal = useCallback(() => {
    setEditingNote(null);
  }, []);

  const handleNewNoteSubmit = () => {
    if (newNoteTitle.trim()) {
      addNote({
        title: newNoteTitle.trim(),
        content: newNoteContent.trim() || undefined,
        color: newNoteColor,
        isUrgent: false,
        completed: newNoteCompleted,
      });
      setNewNoteTitle('');
      setNewNoteContent('');
      setNewNoteColor('blue');
      setNewNoteCompleted(false);
      setShowColorPicker(false);
    }
  };

  const handleCancel = () => {
    setNewNoteTitle('');
    setNewNoteContent('');
    setNewNoteColor('blue');
    setNewNoteCompleted(false);
    setShowColorPicker(false);
  };

  const uncompletedCount = notes.filter(n => !n.completed).length;

  return (
    <>
      {/* 最小化窄条 - 点击切换展开/收起 */}
      <div
        className="fixed top-1/2 -translate-y-1/2 z-[1000] flex flex-col items-center cursor-pointer"
        style={{
          right: isExpanded ? EXPANDED_WIDTH : 0,
          transition: 'right 0.3s ease',
        }}
        onClick={handleToggle}
      >
        <div
          className={`
            flex flex-col items-center justify-center rounded-l-lg
            shadow-lg transition-all duration-200
            ${settings.theme === 'cartoon'
              ? 'bg-gradient-to-br from-yellow-400 to-orange-400 text-white shadow-orange-500/40'
              : settings.theme === 'frostedGlass'
              ? 'bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-xl backdrop-blur-lg border border-white/20'
              : 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-orange-500/30'
            }
          `}
          style={{ width: 24, height: 48 }}
        >
          <StickyNoteIcon className="w-5 h-5" />
        </div>
        {uncompletedCount > 0 && (
          <div className="mt-1 px-1 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold">
            {uncompletedCount}
          </div>
        )}
      </div>

      {/* 展开面板 - 使用滑动动画 */}
      <div
        className="fixed top-0 bottom-0 z-[1000] flex flex-col transition-transform duration-300 ease-in-out"
        style={{
          right: 0,
          width: EXPANDED_WIDTH,
          transform: isExpanded ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {/* 磨玻璃背景 */}
        <div
          className="absolute inset-0 backdrop-blur-xl border-l border-white/30 shadow-2xl rounded-l-2xl"
          style={{ background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(20px)' }}
        />

          {/* 内容层 */}
          <div className="relative flex flex-col h-full">
            {/* 头部 */}
            <div className="flex items-center justify-between p-3 border-b border-slate-200/50">
              <div className="flex items-center gap-2">
                <StickyNoteIcon className="w-5 h-5 text-slate-600" />
                <span className="font-semibold text-slate-700">便签</span>
                <span className="text-xs text-slate-400">({displayNotes.length})</span>
              </div>
              <button
                onClick={handleToggle}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* 新建便签输入 */}
            <div className="p-2 border-b border-slate-200/50">
              {showColorPicker ? (
                <div className="flex flex-col gap-2 p-2 bg-white/50 rounded-lg">
                  <input
                    type="text"
                    value={newNoteTitle}
                    onChange={(e) => setNewNoteTitle(e.target.value)}
                    placeholder="输入便签标题..."
                    className="w-full px-2 py-1 text-sm border rounded outline-none focus:border-blue-400"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleNewNoteSubmit();
                      }
                      if (e.key === 'Escape') handleCancel();
                    }}
                  />
                  <textarea
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder="输入便签内容（可选）..."
                    className="w-full px-2 py-1 text-sm border rounded outline-none focus:border-blue-400 resize-none"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') handleCancel();
                    }}
                  />
                  {/* 颜色选择（显示类别） */}
                  <div className="flex gap-2 flex-wrap">
                    {COLOR_OPTIONS.map((colorOption) => (
                      <button
                        key={colorOption.value}
                        onClick={() => setNewNoteColor(colorOption.value)}
                        className="flex flex-col items-center gap-0.5 transition-all"
                        style={{
                          outline: newNoteColor === colorOption.value ? '2px solid #64748b' : 'none',
                          outlineOffset: '1px',
                          borderRadius: '6px',
                          padding: '2px 4px',
                        }}
                      >
                        <div
                          className="w-6 h-6 rounded flex items-center justify-center"
                          style={{ backgroundColor: colorOption.hex }}
                        >
                          {newNoteColor === colorOption.value && (
                            <span className="text-white text-xs font-bold">✓</span>
                          )}
                        </div>
                        <span className={`text-xs ${newNoteColor === colorOption.value ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
                          {colorOption.category}
                        </span>
                      </button>
                    ))}
                  </div>
                  {/* 已完成选项 */}
                  <div className="flex items-center justify-between py-1.5 px-2 bg-slate-50 rounded">
                    <div className="flex items-center gap-1.5">
                      <Check className={`w-3.5 h-3.5 ${newNoteCompleted ? 'text-green-500' : 'text-slate-400'}`} />
                      <span className={`text-xs ${newNoteCompleted ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>
                        已完成
                      </span>
                    </div>
                    <ToggleSwitch
                      checked={newNoteCompleted}
                      onChange={setNewNoteCompleted}
                      size="sm"
                    />
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={handleNewNoteSubmit}
                      className="flex-1 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                    >
                      添加
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex-1 py-1.5 bg-slate-200 text-slate-600 text-sm rounded hover:bg-slate-300 transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowColorPicker(true)}
                  className={`
                    w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg
                    shadow-md transition-all duration-200
                    ${settings.theme === 'cartoon'
                      ? 'bg-gradient-to-br from-yellow-400 to-orange-400 text-white shadow-orange-500/40'
                      : settings.theme === 'frostedGlass'
                      ? 'bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-xl backdrop-blur-lg border border-white/20'
                      : 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-orange-500/30'
                    }
                  `}
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">新建便签</span>
                </button>
              )}
            </div>

            {/* 便签列表（可拖拽排序） */}
            <div
              className="flex-1 overflow-y-auto p-2 space-y-1"
              onDragOver={handlePanelDragOver}
              onDrop={handlePanelDrop}
            >
              {displayNotes.length === 0 ? (
                <div className="text-center text-slate-400 text-sm py-8">
                  {searchQuery ? '无匹配便签' : '暂无便签'}
                </div>
              ) : (
                displayNotes.map((note, index) => {
                  // 显示插入线：要么在目标索引上方，要么在列表末尾
                  const showLineAtTop = isReordering && insertIndexRef.current === index;
                  const showLineAtBottom = isReordering && insertIndexRef.current === index + 1 && index === displayNotes.length - 1;
                  const isBeingDragged = dragOverIndex === index;

                  return (
                    <div key={note.id}>
                      {/* 顶部插入线 */}
                      {showLineAtTop && (
                        <div className="h-1 bg-blue-500 rounded-full my-1 animate-pulse" />
                      )}

                      <div
                        draggable
                        onDragStart={(e) => handleDragStart(e, note, index)}
                        onDragOver={(e) => handleNoteDragOver(e, index)}
                        onDrop={(e) => handleNoteDrop(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`
                          transition-all duration-150 cursor-grab active:cursor-grabbing
                          ${isBeingDragged ? 'opacity-40 scale-95' : ''}
                        `}
                      >
                        <StickyNoteItem
                          note={note}
                          onUpdate={handleUpdateNote}
                          onDelete={handleDeleteNote}
                          onSetReminder={setReminder}
                          onClearReminder={clearReminder}
                          onToggleComplete={handleToggleComplete}
                          onNoteClick={(id) => {
                            const note = displayNotes.find(n => n.id === id);
                            if (note) handleNoteClick(note);
                          }}
                        />
                      </div>

                      {/* 底部插入线（仅最后一项时） */}
                      {showLineAtBottom && (
                        <div className="h-1 bg-blue-500 rounded-full my-1 animate-pulse" />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* 拖拽提示 */}
            <div className="p-2 border-t border-slate-200/50">
              <p className="text-xs text-slate-400 text-center">
                拖拽便签到日历创建提醒
              </p>
            </div>
          </div>
        </div>

      {/* 编辑便签弹窗 */}
      {editingNote && (
        <NoteEditModal
          note={editingNote}
          onClose={handleCloseEditModal}
          onUpdate={handleUpdateNote}
          onDelete={handleDeleteNote}
        />
      )}
    </>
  );
}

// 内部编辑弹窗组件
function NoteEditModal({
  note,
  onClose,
  onUpdate,
  onDelete,
}: {
  note: StickyNote;
  onClose: () => void;
  onUpdate: (note: StickyNote) => void;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content || '');
  const [color, setColor] = useState<EventColor>(note.color);
  const [completed, setCompleted] = useState(note.completed);

  // 当便签更新时，同步本地状态
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content || '');
    setColor(note.color);
    setCompleted(note.completed);
  }, [note]);

  const handleSave = () => {
    if (title.trim()) {
      onUpdate({
        ...note,
        title: title.trim(),
        content: content.trim() || undefined,
        color,
        completed,
      });
      onClose();
    }
  };

  const handleDelete = () => {
    onDelete(note.id);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[340px] ios-dialog p-5">
        <DialogHeader className="pb-3">
          <DialogTitle className="text-[#1c1c1e] text-[17px] font-semibold">编辑便签</DialogTitle>
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
                  handleSave();
                }
                if (e.key === 'Escape') onClose();
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
                if (e.key === 'Escape') onClose();
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
            onClick={handleDelete}
            className="px-3 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
          >
            删除
          </button>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-3 py-2 bg-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-300 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
          >
            保存
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
