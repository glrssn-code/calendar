'use client';

import { useState, useMemo, useCallback } from 'react';
import { CalendarEvent } from '@/types/event';
import { CATEGORIES } from '@/types/event';

export type FilterCategory = '全部' | '售前' | '项目' | '会议' | '管理' | '推广' | '其它';
export type FilterDateRange = '全部' | '今天' | '本周' | '本月' | '已过期';
export type FilterStatus = '全部' | '未完成' | '已完成';

interface FilterOptions {
  searchQuery: string;
  category: FilterCategory;
  dateRange: FilterDateRange;
  status: FilterStatus;
  showUrgentOnly: boolean;
}

const initialFilterOptions: FilterOptions = {
  searchQuery: '',
  category: '全部',
  dateRange: '全部',
  status: '全部',
  showUrgentOnly: false,
};

export function useEventFilter(events: CalendarEvent[]) {
  const [filters, setFilters] = useState<FilterOptions>(initialFilterOptions);

  // 更新单个过滤条件
  const setSearchQuery = useCallback((query: string) => {
    setFilters(prev => ({ ...prev, searchQuery: query }));
  }, []);

  const setCategory = useCallback((category: FilterCategory) => {
    setFilters(prev => ({ ...prev, category }));
  }, []);

  const setDateRange = useCallback((dateRange: FilterDateRange) => {
    setFilters(prev => ({ ...prev, dateRange }));
  }, []);

  const setStatus = useCallback((status: FilterStatus) => {
    setFilters(prev => ({ ...prev, status }));
  }, []);

  const setShowUrgentOnly = useCallback((show: boolean) => {
    setFilters(prev => ({ ...prev, showUrgentOnly: show }));
  }, []);

  // 重置所有过滤条件
  const resetFilters = useCallback(() => {
    setFilters(initialFilterOptions);
  }, []);

  // 检查是否有任何过滤条件生效
  const hasActiveFilters = useMemo(() => {
    return filters.searchQuery !== '' ||
      filters.category !== '全部' ||
      filters.dateRange !== '全部' ||
      filters.status !== '全部' ||
      filters.showUrgentOnly;
  }, [filters]);

  // 过滤后的事件
  const filteredEvents = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    return events.filter(event => {
      // 搜索过滤（标题或描述）
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const titleMatch = event.title.toLowerCase().includes(query);
        const descMatch = event.description?.toLowerCase().includes(query);
        if (!titleMatch && !descMatch) return false;
      }

      // 类别过滤
      if (filters.category !== '全部' && event.category !== filters.category) {
        return false;
      }

      // 日期范围过滤
      if (filters.dateRange !== '全部') {
        const eventDate = new Date(event.date);
        switch (filters.dateRange) {
          case '今天':
            if (eventDate < today || eventDate >= new Date(today.getTime() + 24 * 60 * 60 * 1000)) {
              return false;
            }
            break;
          case '本周':
            if (eventDate < today || eventDate >= weekEnd) {
              return false;
            }
            break;
          case '本月':
            if (eventDate < today || eventDate > monthEnd) {
              return false;
            }
            break;
          case '已过期':
            const eventEndDateTime = new Date(`${event.date}T${event.endTime}`);
            if (eventEndDateTime >= now) {
              return false;
            }
            break;
        }
      }

      // 完成状态过滤
      if (filters.status !== '全部') {
        if (filters.status === '已完成' && !event.completed) return false;
        if (filters.status === '未完成' && event.completed) return false;
      }

      // 紧急过滤
      if (filters.showUrgentOnly && !event.isUrgent) {
        return false;
      }

      return true;
    });
  }, [events, filters]);

  // 统计信息
  const stats = useMemo(() => ({
    total: events.length,
    filtered: filteredEvents.length,
    completed: events.filter(e => e.completed).length,
    urgent: events.filter(e => e.isUrgent).length,
  }), [events, filteredEvents]);

  return {
    filters,
    filteredEvents,
    stats,
    hasActiveFilters,
    setSearchQuery,
    setCategory,
    setDateRange,
    setStatus,
    setShowUrgentOnly,
    resetFilters,
  };
}
