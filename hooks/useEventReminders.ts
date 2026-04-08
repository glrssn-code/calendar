'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { CalendarEvent } from '@/types/event';
import { parseISO, format } from 'date-fns';

interface ReminderState {
  isActive: boolean;
  event: CalendarEvent | null;
}

export function useEventReminders() {
  const [reminderState, setReminderState] = useState<ReminderState>({ isActive: false, event: null });
  const [permissionStatus, setPermissionStatus] = useState<'default' | 'granted' | 'denied'>('default');
  const timeoutIdsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // 检查通知权限状态
  useEffect(() => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      return false;
    }

    const permission = await Notification.requestPermission();
    setPermissionStatus(permission);
    return permission === 'granted';
  }, []);

  const showReminderNotification = useCallback((event: CalendarEvent) => {
    // 发送浏览器通知
    if (Notification.permission === 'granted') {
      const notification = new Notification(`提醒: ${event.title}`, {
        body: `时间: ${format(parseISO(`${event.date}T${event.startTime}`), 'M月d日 HH:mm')}`,
        tag: event.id,
        requireInteraction: true, // 保持打开直到用户点击
        badge: '/calendar-icon.png',
        silent: false, // 播放声音
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }

    // 显示应用内弹窗提醒
    setReminderState({ isActive: true, event });
  }, []);

  const scheduleReminder = useCallback((event: CalendarEvent) => {
    if (!event.reminderEnabled) return;

    // 清除之前的同一个事件的定时器
    const existingTimeout = timeoutIdsRef.current.get(event.id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      timeoutIdsRef.current.delete(event.id);
    }

    // 计算提醒时间
    const eventTime = parseISO(`${event.date}T${event.startTime}`).getTime();
    const reminderTime = eventTime - event.reminderMinutes * 60 * 1000;
    const now = Date.now();
    const delay = reminderTime - now;

    if (delay <= 0) {
      // 已经到了提醒时间，立即提醒（但要等组件挂载后）
      const timeoutId = setTimeout(() => {
        showReminderNotification(event);
      }, 100);
      timeoutIdsRef.current.set(event.id, timeoutId);
    } else {
      // 设置定时器
      const timeoutId = setTimeout(() => {
        showReminderNotification(event);
        timeoutIdsRef.current.delete(event.id);
      }, delay);
      timeoutIdsRef.current.set(event.id, timeoutId);
    }
  }, [showReminderNotification]);

  const closeReminderModal = useCallback(() => {
    setReminderState({ isActive: false, event: null });
  }, []);

  const cancelReminder = useCallback((eventId: string) => {
    const timeoutId = timeoutIdsRef.current.get(eventId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutIdsRef.current.delete(eventId);
    }
  }, []);

  // 组件卸载时清除所有定时器
  useEffect(() => {
    return () => {
      timeoutIdsRef.current.forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      timeoutIdsRef.current.clear();
    };
  }, []);

  return {
    requestPermission,
    scheduleReminder,
    cancelReminder,
    closeReminderModal,
    reminderState,
    permissionStatus,
  };
}
