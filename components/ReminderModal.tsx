'use client';

import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell, Clock, Calendar } from 'lucide-react';

interface ReminderEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
}

interface ReminderModalProps {
  isOpen: boolean;
  event: ReminderEvent | null;
  onClose: () => void;
}

export function ReminderModal({ isOpen, event, onClose }: ReminderModalProps) {
  if (!event) return null;

  const eventDate = parseISO(`${event.date}T${event.startTime}`);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[360px] ios-dialog p-6">
        <DialogHeader className="text-center pb-4">
          <div className="mx-auto w-14 h-14 bg-[#007aff]/10 rounded-full flex items-center justify-center mb-3">
            <Bell className="w-7 h-7 text-[#007aff]" />
          </div>
          <DialogTitle className="text-xl font-semibold text-[#1c1c1e]">
            事件提醒
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 事件标题 */}
          <div className="text-center">
            <h3 className="text-[17px] font-semibold text-[#1c1c1e]">
              {event.title}
            </h3>
          </div>

          {/* 时间信息 */}
          <div className="bg-[#f2f2f7] rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#007aff]/10 rounded-xl">
                <Calendar className="w-4 h-4 text-[#007aff]" />
              </div>
              <span className="text-[#1c1c1e] text-[15px]">
                {format(eventDate, 'M月d日 EEEE', { weekStartsOn: 1 })}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#34c759]/10 rounded-xl">
                <Clock className="w-4 h-4 text-[#34c759]" />
              </div>
              <span className="text-[#1c1c1e] text-[15px]">
                {event.startTime} - {event.endTime}
              </span>
            </div>
          </div>

          {/* 提示文字 */}
          <p className="text-center text-[#8e8e93] text-[13px]">
            事件时间已到
          </p>
        </div>

        <div className="flex justify-center pt-2">
          <Button
            onClick={onClose}
            className="ios-button bg-[#007aff] hover:bg-[#007aff]/90 text-white px-10 py-2.5 text-[17px] font-medium"
          >
            我知道了
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// 全局提醒组件 - 放在 page.tsx 中使用
export function GlobalReminderHandler() {
  const [reminderEvent, setReminderEvent] = useState<ReminderEvent | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleReminder = (e: CustomEvent<{ event: ReminderEvent }>) => {
      setReminderEvent(e.detail.event);
      setIsOpen(true);
    };

    window.addEventListener('calendar-reminder', handleReminder as EventListener);

    return () => {
      window.removeEventListener('calendar-reminder', handleReminder as EventListener);
    };
  }, []);

  return (
    <ReminderModal
      isOpen={isOpen}
      event={reminderEvent}
      onClose={() => setIsOpen(false)}
    />
  );
}
