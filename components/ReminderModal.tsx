'use client';

import { useEffect, useState } from 'react';
import { format, parseISO, addHours, addDays, isWeekend } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell, Clock, Calendar } from 'lucide-react';
import { CalendarEvent } from '@/types/event';

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
  onMoveEvent?: (event: ReminderEvent, newDate: string, newStartTime: string, newEndTime: string) => void;
}

export function ReminderModal({ isOpen, event, onClose, onMoveEvent }: ReminderModalProps) {
  if (!event) return null;

  const eventDate = parseISO(`${event.date}T${event.startTime}`);

  // 计算下一个工作日（跳过周末）
  const getNextWorkday = (date: Date): Date => {
    let nextDay = addDays(date, 1);
    while (isWeekend(nextDay)) {
      nextDay = addDays(nextDay, 1);
    }
    return nextDay;
  };

  const handleSnooze1Hour = () => {
    if (onMoveEvent) {
      // 计算新的时间（+1小时）
      const [startH, startM] = event.startTime.split(':').map(Number);
      const [endH, endM] = event.endTime.split(':').map(Number);

      let newStartH = startH + 1;
      let newEndH = endH + 1;

      // 如果超过22点，限制在22点
      if (newStartH > 22) newStartH = 22;
      if (newEndH > 22) newEndH = 22;

      const newStartTime = `${newStartH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`;
      const newEndTime = `${newEndH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

      onMoveEvent(event, event.date, newStartTime, newEndTime);
    }
    onClose();
  };

  const handleSnoozeTomorrow = () => {
    if (onMoveEvent) {
      // 计算下一个工作日
      const tomorrow = addDays(eventDate, 1);
      const nextWorkday = getNextWorkday(tomorrow);
      const newDate = format(nextWorkday, 'yyyy-MM-dd');

      onMoveEvent(event, newDate, event.startTime, event.endTime);
    }
    onClose();
  };

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

        {/* 操作按钮 */}
        <div className="space-y-2 pt-2">
          <Button
            onClick={handleSnooze1Hour}
            className="w-full bg-[#ff9500] hover:bg-[#ff9500]/90 text-white py-3 text-[15px] font-medium rounded-xl"
          >
            <Clock className="w-4 h-4 mr-2" />
            推迟1小时提醒我
          </Button>
          <Button
            onClick={handleSnoozeTomorrow}
            className="w-full bg-[#5856d6] hover:bg-[#5856d6]/90 text-white py-3 text-[15px] font-medium rounded-xl"
          >
            <Calendar className="w-4 h-4 mr-2" />
            明天相同时间提醒我
          </Button>
          <Button
            onClick={onClose}
            className="w-full bg-[#007aff] hover:bg-[#007aff]/90 text-white py-4 text-[17px] font-semibold rounded-xl"
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
  const [snoozedEvent, setSnoozedEvent] = useState<{ event: ReminderEvent; timeoutId: NodeJS.Timeout } | null>(null);

  // 清除之前可能的snooze定时器
  useEffect(() => {
    return () => {
      if (snoozedEvent) {
        clearTimeout(snoozedEvent.timeoutId);
      }
    };
  }, [snoozedEvent]);

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

  const handleMoveEvent = (event: ReminderEvent, newDate: string, newStartTime: string, newEndTime: string) => {
    // 触发自定义事件，让日历更新事件
    window.dispatchEvent(new CustomEvent('calendar-event-move', {
      detail: {
        eventId: event.id,
        newDate,
        newStartTime,
        newEndTime,
      }
    }));
  };

  return (
    <ReminderModal
      isOpen={isOpen}
      event={reminderEvent}
      onClose={() => setIsOpen(false)}
      onMoveEvent={handleMoveEvent}
    />
  );
}
