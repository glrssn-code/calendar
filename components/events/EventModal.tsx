'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CalendarEvent, NewEvent } from '@/types/event';
import { EventForm } from './EventForm';
import { useEventReminders } from '@/hooks/useEventReminders';
import { useEvents } from '@/context/EventContext';
import { useUndo } from '@/context/UndoContext';
import { eventDB } from '@/lib/db';
import { toast } from 'sonner';
import { useNoteEventSync } from '@/hooks/useNoteEventSync';
import { AlertTriangle } from 'lucide-react';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: Date;
  initialHour?: number;
  initialEvent?: CalendarEvent | null;
  defaultUseSmartInput?: boolean;
  defaultDuration?: number;
}

export function EventModal({
  isOpen,
  onClose,
  initialDate,
  initialHour,
  initialEvent,
  defaultUseSmartInput = false,
  defaultDuration = 30,
}: EventModalProps) {
  const { addEvent, updateEvent, deleteEvent, state, dispatch } = useEvents();
  const { pushAction } = useUndo();
  const { requestPermission } = useEventReminders();
  const { syncEventCompletionToNote, syncEventColorToNote, syncEventTitleToNote } = useNoteEventSync();

  // 删除重复事件确认
  const [showDeleteRepeatDialog, setShowDeleteRepeatDialog] = useState(false);
  const [deleteRepeatChoice, setDeleteRepeatChoice] = useState<'single' | 'all' | null>(null);

  // 修改重复事件提醒确认
  const [showReminderRepeatDialog, setShowReminderRepeatDialog] = useState(false);
  const [pendingReminderUpdate, setPendingReminderUpdate] = useState<{ event: CalendarEvent; reminderEnabled: boolean; reminderMinutes: number } | null>(null);

  useEffect(() => {
    if (isOpen && initialEvent?.reminderEnabled) {
      requestPermission();
    }
  }, [isOpen, initialEvent?.reminderEnabled, requestPermission]);

  // 处理删除重复事件
  const handleDeleteRepeatEvent = (choice: 'single' | 'all') => {
    if (!initialEvent) return;

    if (choice === 'all' && initialEvent.repeatId) {
      // 删除所有重复事件
      const eventsToDelete = state.events.filter(e => e.repeatId === initialEvent.repeatId);
      eventsToDelete.forEach(event => {
        deleteEvent(event.id);
      });
      toast.success(`已删除所有 ${eventsToDelete.length} 个重复事件`);
    } else {
      // 只删除当前事件
      deleteEvent(initialEvent.id);
      toast.success('事件已删除');
    }

    setShowDeleteRepeatDialog(false);
    onClose();
  };

  // 处理修改重复事件提醒
  const handleUpdateRepeatReminder = (choice: 'single' | 'all') => {
    if (!pendingReminderUpdate) return;

    const { event, reminderEnabled, reminderMinutes } = pendingReminderUpdate;

    if (choice === 'all' && event.repeatId) {
      // 修改所有重复事件的提醒
      const eventsToUpdate = state.events.filter(e => e.repeatId === event.repeatId);
      eventsToUpdate.forEach(e => {
        updateEvent({ ...e, reminderEnabled, reminderMinutes });
      });
      toast.success(`已修改所有 ${eventsToUpdate.length} 个重复事件的提醒`);
    } else {
      // 只修改当前事件的提醒 - 但需要取消该事件系列的所有旧定时器
      // 通过更新事件来触发 rescheduleReminders

      // 先更新当前事件
      updateEvent({ ...event, reminderEnabled, reminderMinutes });
      toast.success('提醒已修改');

      // 取消其他相同 repeatId 事件的旧定时器（通过重新调度）
      if (event.repeatId) {
        // 触发重新调度，这会清除所有旧定时器并为当前事件设置新的
        const otherEvents = state.events.filter(e => e.repeatId === event.repeatId && e.id !== event.id);
        // 这些其他事件的提醒设置没有改变，但它们的定时器会被清除
        // 因为 rescheduleReminders 会基于当前 state.events 重新设置所有定时器
      }
    }

    setShowReminderRepeatDialog(false);
    setPendingReminderUpdate(null);
    onClose(); // 关闭编辑弹窗
  };

  const handleSubmit = async (eventData: NewEvent | CalendarEvent | NewEvent[]) => {
    // 处理重复事件数组
    const events = Array.isArray(eventData) ? eventData : [eventData];

    // 如果是编辑已有事件
    if (initialEvent) {
      // 同步事件更新到便签
      if (initialEvent.sourceNoteId) {
        syncEventCompletionToNote(events[0] as CalendarEvent);
        syncEventColorToNote(events[0] as CalendarEvent);
        syncEventTitleToNote(events[0] as CalendarEvent);
      }

      // 如果是重复事件且提醒设置改变了，显示确认对话框
      if (initialEvent.repeatId && initialEvent.reminderEnabled !== (eventData as CalendarEvent).reminderEnabled) {
        setPendingReminderUpdate({
          event: initialEvent,
          reminderEnabled: (eventData as CalendarEvent).reminderEnabled,
          reminderMinutes: (eventData as CalendarEvent).reminderMinutes,
        });
        setShowReminderRepeatDialog(true);
        return;
      }

      // 普通更新
      updateEvent(events[0] as CalendarEvent);
      toast.success('事件已更新');
    } else {
      // 新建事件
      for (const event of events) {
        addEvent(event as NewEvent);
      }

      if (events.length > 1) {
        toast.success(`事件已创建，共 ${events.length} 个重复事件`);
      } else {
        toast.success('事件已创建');
      }
    }

    // 处理提醒权限
    const eventsWithReminder = events.filter(e => e.reminderEnabled);
    if (eventsWithReminder.length > 0) {
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        toast.warning('事件已创建，但需要允许通知权限才能收到提醒');
      }
    }

    onClose();
  };

  const handleDelete = () => {
    if (initialEvent) {
      // 如果是重复事件，显示确认对话框
      if (initialEvent.repeatId) {
        setShowDeleteRepeatDialog(true);
        return;
      }

      // 注册撤销操作
      pushAction({
        type: 'DELETE_EVENT',
        description: `删除事件: ${initialEvent.title}`,
        previousData: initialEvent,
        undo: async () => {
          await eventDB.add(initialEvent);
          dispatch({ type: 'ADD_EVENT', payload: initialEvent });
          toast.success(`已恢复事件: ${initialEvent.title}`);
        },
      });

      // 删除事件
      deleteEvent(initialEvent.id);
      toast.success('事件已删除，按 Ctrl+Z 撤销');
      onClose();
    }
  };

  const getModalTitle = () => {
    if (initialEvent) {
      return '编辑事件';
    }
    if (initialDate && initialHour !== undefined) {
      return `新建事件 - ${format(initialDate, 'M月d日')} ${initialHour}:00`;
    }
    return '新建事件';
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[400px] ios-dialog p-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-[#1c1c1e] text-[17px] font-semibold">{getModalTitle()}</DialogTitle>
          </DialogHeader>
          <EventForm
            initialDate={initialDate}
            initialHour={initialHour}
            initialEvent={initialEvent || undefined}
            onSubmit={handleSubmit}
            onCancel={onClose}
            onDelete={initialEvent ? handleDelete : undefined}
            defaultUseSmartInput={defaultUseSmartInput}
            defaultDuration={defaultDuration}
          />
        </DialogContent>
      </Dialog>

      {/* 删除重复事件确认对话框 */}
      <Dialog open={showDeleteRepeatDialog} onOpenChange={setShowDeleteRepeatDialog}>
        <DialogContent className="sm:max-w-[360px] ios-dialog p-4">
          <DialogHeader className="pb-2">
            <div className="mx-auto w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mb-2">
              <AlertTriangle className="w-6 h-6 text-rose-500" />
            </div>
            <DialogTitle className="text-center text-lg">删除重复事件</DialogTitle>
            <DialogDescription className="text-center text-sm text-slate-500">
              这是一个重复事件，选择删除范围
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              onClick={() => handleDeleteRepeatEvent('single')}
              className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700"
            >
              只删除这一条
            </Button>
            <Button
              onClick={() => handleDeleteRepeatEvent('all')}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white"
            >
              删除所有重复事件
            </Button>
            <Button
              onClick={() => setShowDeleteRepeatDialog(false)}
              variant="outline"
              className="w-full"
            >
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 修改重复事件提醒确认对话框 */}
      <Dialog open={showReminderRepeatDialog} onOpenChange={setShowReminderRepeatDialog}>
        <DialogContent className="sm:max-w-[360px] ios-dialog p-4">
          <DialogHeader className="pb-2">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
              <AlertTriangle className="w-6 h-6 text-blue-500" />
            </div>
            <DialogTitle className="text-center text-lg">修改重复事件提醒</DialogTitle>
            <DialogDescription className="text-center text-sm text-slate-500">
              选择修改范围
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              onClick={() => handleUpdateRepeatReminder('single')}
              className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700"
            >
              只修改这一条
            </Button>
            <Button
              onClick={() => handleUpdateRepeatReminder('all')}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white"
            >
              修改所有重复事件
            </Button>
            <Button
              onClick={() => {
                setShowReminderRepeatDialog(false);
                setPendingReminderUpdate(null);
              }}
              variant="outline"
              className="w-full"
            >
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
