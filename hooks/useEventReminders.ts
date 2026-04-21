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

  const scheduleReminder = useCallback((event: CalendarEvent, customDelayMs?: number) => {
    // 已完成的事件不提醒
    if (event.completed) return;
    if (!event.reminderEnabled && customDelayMs === undefined) return;
    if (!event.startTime) return; // 没有开始时间不提醒

    // 无效时间检查
    const dateTimeStr = `${event.date}T${event.startTime}`;
    if (dateTimeStr.includes('undefined') || dateTimeStr.includes('null')) {
      return;
    }

    // 清除之前的同一个事件的定时器
    const existingTimeout = timeoutIdsRef.current.get(event.id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      timeoutIdsRef.current.delete(event.id);
    }

    let delay: number;

    if (customDelayMs !== undefined) {
      // 使用自定义延迟（用于推迟提醒）
      delay = customDelayMs;
    } else {
      // 计算提醒时间
      const eventTime = parseISO(dateTimeStr).getTime();
      if (isNaN(eventTime)) return; // 无效日期不提醒

      const reminderTime = eventTime - event.reminderMinutes * 60 * 1000;
      const now = Date.now();
      delay = reminderTime - now;
    }

    // 过去的时间不提醒
    if (delay <= 0) {
      return;
    }

    // 设置定时器
    const timeoutId = setTimeout(() => {
      showReminderNotification(event);
      timeoutIdsRef.current.delete(event.id);
    }, delay);
    timeoutIdsRef.current.set(event.id, timeoutId);
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
