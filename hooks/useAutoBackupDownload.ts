'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useEvents } from '@/context/EventContext';
import { downloadAsFullJSON, generateFilename } from '@/lib/export';
import { getSettings } from '@/hooks/useSettings';

const AUTO_BACKUP_KEY = 'lastAutoBackupDate';

export function useAutoBackupDownload() {
  const { state } = useEvents();
  const hasCheckedToday = useRef(false);

  const downloadBackup = useCallback(() => {
    try {
      const events = state.events;
      const filename = generateFilename('calendar-backup', 'json');
      downloadAsFullJSON(events, filename);
      console.log('[AutoBackup] 自动备份已下载');
      return true;
    } catch (error) {
      console.error('[AutoBackup] 自动备份失败:', error);
      return false;
    }
  }, [state.events]);

  useEffect(() => {
    const settings = getSettings();

    // 如果未启用自动备份，直接返回
    if (!settings.autoBackupEnabled) {
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const lastBackup = localStorage.getItem(AUTO_BACKUP_KEY);

    // 检查今天是否已经自动备份过
    if (lastBackup === today) {
      hasCheckedToday.current = true;
      return;
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const targetHour = settings.autoBackupHour;

    // 计算备份窗口：如果当前时间在目标时间后30分钟内
    const isInBackupWindow = currentHour === targetHour && currentMinute <= 30;

    // 如果已经过了目标时间+30分钟，不进行今天的自动备份
    if (currentHour > targetHour || (currentHour === targetHour && currentMinute > 30)) {
      // 记录今天已检查（即使跳过）
      localStorage.setItem(AUTO_BACKUP_KEY, today);
      hasCheckedToday.current = true;
      return;
    }

    // 如果在备份窗口内，触发下载
    if (isInBackupWindow && !hasCheckedToday.current) {
      downloadBackup();
      localStorage.setItem(AUTO_BACKUP_KEY, today);
      hasCheckedToday.current = true;
      return;
    }

    // 设置定时器，在目标时间触发
    const calculateDelay = () => {
      const target = new Date();
      target.setHours(targetHour, 0, 0, 0);

      // 如果已经过了今天的备份时间，设置到明天
      if (target.getTime() <= now.getTime()) {
        target.setDate(target.getDate() + 1);
      }

      return target.getTime() - now.getTime();
    };

    const delay = calculateDelay();
    console.log(`[AutoBackup] 距离下次自动备份 (${settings.autoBackupHour}:00): ${Math.round(delay / 1000 / 60)} 分钟`);

    const timer = setTimeout(() => {
      downloadBackup();
      localStorage.setItem(AUTO_BACKUP_KEY, new Date().toISOString().slice(0, 10));
    }, delay);

    return () => clearTimeout(timer);
  }, [state.events, downloadBackup]);
}
