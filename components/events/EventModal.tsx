'use client';

import { useEffect } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CalendarEvent, NewEvent } from '@/types/event';
import { EventForm } from './EventForm';
import { useEventReminders } from '@/hooks/useEventReminders';
import { useEvents } from '@/context/EventContext';
import { useUndo } from '@/context/UndoContext';
import { eventDB } from '@/lib/db';
import { toast } from 'sonner';
import { useNoteEventSync } from '@/hooks/useNoteEventSync';

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

  useEffect(() => {
    if (isOpen && initialEvent?.reminderEnabled) {
      requestPermission();
    }
  }, [isOpen, initialEvent?.reminderEnabled, requestPermission]);

  const handleSubmit = async (eventData: NewEvent | CalendarEvent) => {
    if (initialEvent) {
      // 同步事件更新到便签
      if (initialEvent.sourceNoteId) {
        const oldEvent = state.events.find(e => e.id === initialEvent.id);
        syncEventCompletionToNote(eventData as CalendarEvent);
        syncEventColorToNote(eventData as CalendarEvent);
        syncEventTitleToNote(eventData as CalendarEvent);
      }
      updateEvent(eventData as CalendarEvent);
      toast.success('事件已更新');
    } else {
      const newEvent = addEvent(eventData as NewEvent);
      if (newEvent.reminderEnabled) {
        const hasPermission = await requestPermission();
        if (hasPermission) {
          toast.success('事件已创建，提醒已设置');
        } else {
          toast.warning('事件已创建，但需要允许通知权限才能收到提醒');
        }
      } else {
        toast.success('事件已创建');
      }
    }
    onClose();
  };

  const handleDelete = () => {
    if (initialEvent) {
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px] ios-dialog p-4">
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
  );
}
