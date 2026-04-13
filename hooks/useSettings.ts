import { useState, useEffect, useCallback } from 'react';

export interface CalendarSettings {
  userName: string;
  weekStartsOn: '0' | '1';
  defaultEventDuration: '15' | '30' | '60' | '90' | '120';
  enableSound: boolean;
  enableDesktopNotifications: boolean;
  defaultView: 'day' | 'week' | 'month';
  theme: 'skeuomorphic' | 'cartoon' | 'frostedGlass';
}

const DEFAULT_SETTINGS: CalendarSettings = {
  userName: '张三',
  weekStartsOn: '0',
  defaultEventDuration: '60',
  enableSound: true,
  enableDesktopNotifications: true,
  defaultView: 'week',
  theme: 'skeuomorphic',
};

const SETTINGS_KEY = 'calendarSettings';

export function useSettings() {
  const [settings, setSettings] = useState<CalendarSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // 加载设置
  useEffect(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch {
        setSettings(DEFAULT_SETTINGS);
      }
    }
    setIsLoaded(true);
  }, []);

  // 保存设置
  const saveSettings = useCallback((newSettings: Partial<CalendarSettings>) => {
    const updated = { ...settings, ...newSettings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    setSettings(updated);
  }, [settings]);

  return {
    settings,
    isLoaded,
    saveSettings,
  };
}

export function getSettings(): CalendarSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  const saved = localStorage.getItem(SETTINGS_KEY);
  if (saved) {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }
  return DEFAULT_SETTINGS;
}
