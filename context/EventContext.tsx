'use client';

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { CalendarEvent, NewEvent, EventState, EventAction } from '@/types/event';
import { parseISO } from 'date-fns';
import { eventDB } from '@/lib/db';
import { getSettings } from '@/hooks/useSettings';
import { backupEventsToLocal, restoreEventsFromLocal } from '@/lib/autoBackup';

function eventReducer(state: EventState, action: EventAction): EventState {
  switch (action.type) {
    case 'ADD_EVENT':
      return {
        ...state,
        events: [...state.events, action.payload],
        isLoading: false,
      };
    case 'UPDATE_EVENT':
      return {
        ...state,
        events: state.events.map((e) =>
          e.id === action.payload.id ? action.payload : e
        ),
        isLoading: false,
      };
    case 'DELETE_EVENT':
      return {
        ...state,
        events: state.events.filter((e) => e.id !== action.payload),
        isLoading: false,
      };
    case 'LOAD_EVENTS':
      return {
        ...state,
        events: action.payload,
        isLoading: false,
      };
    default:
      return state;
  }
}

interface EventContextType {
  state: EventState;
  dispatch: React.Dispatch<EventAction>;
  addEvent: (event: NewEvent) => CalendarEvent;
  updateEvent: (event: CalendarEvent) => void;
  deleteEvent: (id: string) => void;
  getEventsByDate: (date: string) => CalendarEvent[];
  rescheduleReminders: () => void;
}

const EventContext = createContext<EventContextType | null>(null);

// 存储定时器 ID
const scheduledReminders = new Map<string, NodeJS.Timeout>();

export function EventProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(eventReducer, {
    events: [],
    isLoading: true,
  });

  // 调度提醒
  const scheduleReminder = useCallback((event: CalendarEvent) => {
    if (!event.reminderEnabled) return;
    if (!event.startTime) return; // 没有开始时间不提醒

    // 清除之前的定时器
    const existingTimeout = scheduledReminders.get(event.id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      scheduledReminders.delete(event.id);
    }

    // 计算提醒时间
    const dateTimeStr = `${event.date}T${event.startTime}`;
    if (!event.startTime || dateTimeStr.includes('undefined') || dateTimeStr.includes('null')) {
      console.log('[scheduleReminder] 跳过，无效时间字符串:', dateTimeStr);
      return; // 无效时间不提醒
    }

    const eventTime = parseISO(dateTimeStr).getTime();
    if (isNaN(eventTime)) {
      console.log('[scheduleReminder] 跳过，eventTime 是 NaN');
      return; // 无效日期不提醒
    }

    const reminderTime = eventTime - event.reminderMinutes * 60 * 1000;
    const now = Date.now();
    const delay = reminderTime - now;
    console.log('[scheduleReminder] 事件:', event.title, '日期:', event.date, '时间:', event.startTime, 'reminderMinutes:', event.reminderMinutes, 'eventTime:', eventTime, 'reminderTime:', reminderTime, 'now:', now, 'delay:', delay);

    // 过去的时间不提醒
    if (delay <= 0) {
      console.log('[scheduleReminder] 跳过，delay <= 0');
      return;
    }

    // delay 超过 1 年不设置（防止异常）
    const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
    if (delay > ONE_YEAR_MS) {
      console.log('[scheduleReminder] 跳过，delay > 1年');
      return;
    }

    // JavaScript setTimeout 最大延迟约 24.8 天，超过会立即触发
    const MAX_DELAY = 2147483647;
    if (delay > MAX_DELAY) {
      console.log('[scheduleReminder] 跳过，delay > MAX_DELAY (24.8天)，实际延迟:', delay);
      return;
    }

    // 设置定时器
    console.log('[scheduleReminder] 调用 setTimeout，delay:', delay, 'now:', Date.now());
    const timeoutId = setTimeout(() => {
      console.log('[scheduleReminder] setTimeout 回调执行! 事件:', event.title, '日期:', event.date, '时间:', event.startTime, '延迟了', Date.now() - (reminderTime), 'ms');
      const settings = getSettings();

      // 触发浏览器通知
      if (settings.enableDesktopNotifications && Notification.permission === 'granted') {
        new Notification(`提醒: ${event.title}`, {
          body: `事件 "${event.title}" 即将开始`,
          tag: event.id,
          requireInteraction: true,
        });
      }

      // 触发应用内弹窗事件
      window.dispatchEvent(new CustomEvent('calendar-reminder', {
        detail: { event }
      }));

      // 播放声音
      if (settings.enableSound) {
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          oscillator.frequency.value = 800;
          oscillator.type = 'sine';
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.5);
          // 确保 AudioContext 被关闭，防止内存泄漏
          setTimeout(() => audioContext.close(), 600);
        } catch (e) {
          console.warn('Failed to play notification sound:', e);
        }
      }

      scheduledReminders.delete(event.id);
    }, delay);

    scheduledReminders.set(event.id, timeoutId);
    console.log('[scheduleReminder] 已设置定时器，事件:', event.title, '将在', new Date(reminderTime).toLocaleString(), '触发，delay:', delay);
  }, []);

  // 重新调度所有事件的提醒
  const rescheduleReminders = useCallback(() => {
    console.log('[rescheduleReminders] 清除所有旧定时器，当前数量:', scheduledReminders.size);
    // 清除所有现有的定时器
    scheduledReminders.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    scheduledReminders.clear();

    // 为所有有提醒且未完成的事件设置定时器
    console.log('[rescheduleReminders] 设置新定时器，事件总数:', state.events.length);
    if (Notification.permission === 'granted') {
      state.events.forEach((event) => {
        if (event.reminderEnabled && !event.completed) {
          scheduleReminder(event);
        }
      });
    }
  }, [state.events, scheduleReminder]);

  // 加载事件
  useEffect(() => {
    const loadAndMigrate = async () => {
      try {
        // 先检查 IndexedDB 是否有数据
        let events = await eventDB.getAll();

        // 如果 IndexedDB 为空，检查 localStorage 自动备份
        if (events.length === 0) {
          const localEvents = restoreEventsFromLocal();
          if (localEvents.length > 0) {
            console.log('Found local backup, restoring to IndexedDB...');
            for (const event of localEvents) {
              await eventDB.add(event);
            }
            events = localEvents;
          }
        }

        // 如果还是没有，检查旧版 localStorage 迁移
        if (events.length === 0) {
          const { migrateFromLocalStorage, hasLegacyData } = await import('@/lib/migrateFromLocalStorage');
          if (hasLegacyData()) {
            console.log('Found legacy data in localStorage, migrating...');
            const result = await migrateFromLocalStorage();
            if (result.success && !result.alreadyMigrated) {
              console.log(`Migrated ${result.eventsMigrated} events and ${result.notesMigrated} notes from localStorage`);
              // 重新加载数据
              events = await eventDB.getAll();
            }
          }
        }

        // 备份到 localStorage
        if (events.length > 0) {
          backupEventsToLocal(events);
        }

        dispatch({ type: 'LOAD_EVENTS', payload: events });
      } catch (err) {
        console.error('Failed to load events:', err);
        dispatch({ type: 'LOAD_EVENTS', payload: [] });
      }
    };

    loadAndMigrate();
  }, []);

  // 统一调度提醒：只在事件列表、加载状态或权限变化时触发
  useEffect(() => {
    if (!state.isLoading && state.events.length > 0 && Notification.permission === 'granted') {
      rescheduleReminders();
    }
  }, [state.events, state.isLoading, rescheduleReminders]);

  // 组件卸载时清除所有定时器
  useEffect(() => {
    return () => {
      scheduledReminders.forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      scheduledReminders.clear();
    };
  }, []);

  const addEvent = useCallback((eventData: NewEvent): CalendarEvent => {
    const newEvent: CalendarEvent = {
      ...eventData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    // 保存到 IndexedDB
    eventDB.add(newEvent).catch(err => console.error('Failed to add event:', err));
    dispatch({ type: 'ADD_EVENT', payload: newEvent });
    // 备份到 localStorage
    const updatedEvents = [...state.events, newEvent];
    backupEventsToLocal(updatedEvents);
    return newEvent;
  }, [state.events]);

  const updateEvent = useCallback((event: CalendarEvent) => {
    // 更新 IndexedDB
    eventDB.put(event).catch(err => console.error('Failed to update event:', err));
    dispatch({ type: 'UPDATE_EVENT', payload: event });
    // 备份到 localStorage
    const updatedEvents = state.events.map(e => e.id === event.id ? event : e);
    backupEventsToLocal(updatedEvents);
  }, [state.events]);

  const deleteEvent = useCallback((id: string) => {
    // 清除该事件的定时器
    const timeoutId = scheduledReminders.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      scheduledReminders.delete(id);
    }
    // 从 IndexedDB 删除
    eventDB.delete(id).catch(err => console.error('Failed to delete event:', err));
    dispatch({ type: 'DELETE_EVENT', payload: id });
    // 备份到 localStorage
    const updatedEvents = state.events.filter(e => e.id !== id);
    backupEventsToLocal(updatedEvents);
  }, [state.events]);

  const getEventsByDate = useCallback(
    (date: string) => {
      return state.events.filter((event) => event.date === date);
    },
    [state.events]
  );

  return (
    <EventContext.Provider
      value={{ state, dispatch, addEvent, updateEvent, deleteEvent, getEventsByDate, rescheduleReminders }}
    >
      {children}
    </EventContext.Provider>
  );
}

export function useEvents() {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEvents must be used within an EventProvider');
  }
  return context;
}
