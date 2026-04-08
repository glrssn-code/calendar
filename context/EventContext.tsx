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
import { loadEvents, saveEvents, clearEvents } from '@/lib/storage';
import { getSettings } from '@/hooks/useSettings';

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

    // 清除之前的定时器
    const existingTimeout = scheduledReminders.get(event.id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      scheduledReminders.delete(event.id);
    }

    // 计算提醒时间
    const eventTime = parseISO(`${event.date}T${event.startTime}`).getTime();
    const reminderTime = eventTime - event.reminderMinutes * 60 * 1000;
    const now = Date.now();
    const delay = reminderTime - now;

    if (delay <= 0) {
      // 已经过了提醒时间，跳过
      return;
    }

    // 设置定时器
    const timeoutId = setTimeout(() => {
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
        // 使用 Web Audio API 播放提示音
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
        } catch (e) {
          console.warn('Failed to play notification sound:', e);
        }
      }

      scheduledReminders.delete(event.id);
    }, delay);

    scheduledReminders.set(event.id, timeoutId);
  }, []);

  // 重新调度所有事件的提醒
  const rescheduleReminders = useCallback(() => {
    // 清除所有现有的定时器
    scheduledReminders.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    scheduledReminders.clear();

    // 为所有有提醒的事件设置定时器
    if (Notification.permission === 'granted') {
      state.events.forEach((event) => {
        if (event.reminderEnabled) {
          scheduleReminder(event);
        }
      });
    }
  }, [state.events, scheduleReminder]);

  useEffect(() => {
    const events = loadEvents();
    dispatch({ type: 'LOAD_EVENTS', payload: events });
  }, []);

  // 当事件加载完成后，重新调度提醒
  useEffect(() => {
    if (!state.isLoading && state.events.length > 0) {
      // 等待权限确认后再调度
      if (Notification.permission === 'granted') {
        rescheduleReminders();
      }
    }
  }, [state.isLoading]);

  // 监听权限变化
  useEffect(() => {
    const handlePermissionChange = () => {
      if (Notification.permission === 'granted') {
        rescheduleReminders();
      }
    };

    // 定期检查权限状态
    const interval = setInterval(() => {
      handlePermissionChange();
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [rescheduleReminders]);

  useEffect(() => {
    if (!state.isLoading) {
      saveEvents(state.events);
    }
  }, [state.events, state.isLoading]);

  const addEvent = useCallback((eventData: NewEvent): CalendarEvent => {
    const newEvent: CalendarEvent = {
      ...eventData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_EVENT', payload: newEvent });
    return newEvent;
  }, []);

  const updateEvent = useCallback((event: CalendarEvent) => {
    dispatch({ type: 'UPDATE_EVENT', payload: event });
  }, []);

  const deleteEvent = useCallback((id: string) => {
    // 清除该事件的定时器
    const timeoutId = scheduledReminders.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      scheduledReminders.delete(id);
    }
    dispatch({ type: 'DELETE_EVENT', payload: id });
  }, []);

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
