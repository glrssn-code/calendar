'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { EventProvider, useEvents } from '@/context/EventContext';
import { useStickyNotes } from '@/context/StickyNoteContext';
import { UndoProvider, useUndo } from '@/context/UndoContext';
import { WeeklyCalendar } from '@/components/calendar/WeeklyCalendar';
import { DayView } from '@/components/calendar/DayView';
import { MonthView } from '@/components/calendar/MonthView';
import { EventModal } from '@/components/events/EventModal';
import { CalendarEvent } from '@/types/event';
import { Settings, Plus, ChevronLeft, ChevronRight, StickyNote, HelpCircle, Download } from 'lucide-react';
import { ExportDialog } from '@/components/export/ExportDialog';
import { downloadAsJSON, generateFilename } from '@/lib/export';
import { CATEGORIES } from '@/types/event';
import { GlobalReminderHandler } from '@/components/ReminderModal';
import { useEventFilter } from '@/hooks/useEventFilter';
import { useSettings } from '@/hooks/useSettings';
import { StickyNotePanel } from '@/components/stickyNote/StickyNotePanel';
import { StickyNoteModal } from '@/components/stickyNote/StickyNoteModal';
import { HelpModal } from '@/components/HelpModal';
import { createBackup, downloadBackup, generateBackupFilename } from '@/lib/backup';
import { StatsPanel } from '@/components/stats/StatsPanel';

type ViewType = 'day' | 'week' | 'month';

// 主题配置
const themes = {
  skeuomorphic: {
    // 页面背景
    pageBg: 'bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-50',
    // 顶部工具栏
    toolbar: 'bg-gradient-to-b from-white to-slate-50 border-slate-200',
    // 视图切换容器
    viewSwitcherBg: 'bg-gradient-to-b from-slate-100 to-slate-200 rounded-lg p-0.5 shadow-inner',
    viewSwitcherBtnActive: 'bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-md',
    viewSwitcherBtnInactive: 'bg-gradient-to-b from-white to-slate-100 text-slate-600 hover:from-slate-50 hover:to-slate-100 border border-slate-200',
    // 导航按钮
    navBtn: 'bg-gradient-to-b from-white to-slate-50 hover:from-slate-50 hover:to-white shadow-sm border border-slate-200',
    navBtnText: 'text-slate-600',
    todayBtn: 'bg-gradient-to-b from-white to-slate-50 hover:from-slate-50 hover:to-white shadow-sm border border-slate-200 text-slate-600',
    // 搜索框
    searchInput: 'border border-slate-200 bg-gradient-to-b from-white to-slate-50 focus:border-blue-400 shadow-inner',
    // 下拉框
    select: 'border border-slate-200 bg-gradient-to-b from-white to-slate-50 text-slate-600 hover:border-slate-300',
    // 紧急按钮激活
    urgentBtnActive: 'bg-gradient-to-b from-red-400 to-red-500 text-white border-red-500 shadow-md',
    urgentBtnInactive: 'bg-gradient-to-b from-white to-slate-50 text-slate-400 border-slate-200 hover:border-slate-300',
    // 统计标签
    statsBadge: 'bg-gradient-to-b from-blue-100 to-blue-200 text-blue-700 shadow-inner',
    // 重置按钮
    resetBtn: 'bg-gradient-to-b from-white to-slate-50 text-slate-500 hover:from-slate-50 hover:to-slate-100 border border-slate-200 shadow-sm',
    // 悬浮按钮
    fabStickyNote: 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30',
    fabSmartCreate: 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30',
    fabSettings: 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/30',
    // 日期标题
    dateTitle: 'text-slate-800',
    // 清除按钮
    clearBtn: 'bg-slate-200 text-slate-500 hover:bg-slate-300',
  },
  cartoon: {
    pageBg: 'bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100',
    toolbar: 'bg-gradient-to-b from-white to-pink-50 border-pink-200',
    viewSwitcherBg: 'bg-pink-100 rounded-2xl p-1',
    viewSwitcherBtnActive: 'bg-gradient-to-r from-pink-400 to-purple-400 text-white shadow-lg',
    viewSwitcherBtnInactive: 'text-slate-600 hover:bg-pink-200',
    navBtn: 'bg-white shadow-md border-2 border-pink-200 hover:bg-pink-100',
    navBtnText: 'text-pink-500',
    todayBtn: 'bg-white shadow-md border-2 border-pink-200 text-pink-600 hover:bg-pink-100',
    searchInput: 'border-2 border-pink-200 bg-white/80 focus:border-pink-400 shadow-md',
    select: 'border-2 border-pink-200 bg-white/80 text-pink-600 hover:border-pink-300',
    urgentBtnActive: 'bg-gradient-to-r from-red-400 to-pink-500 text-white border-red-300 shadow-lg',
    urgentBtnInactive: 'bg-white/80 border-pink-200 text-pink-400 hover:bg-pink-100',
    statsBadge: 'bg-gradient-to-r from-pink-400 to-purple-400 text-white shadow-lg',
    resetBtn: 'bg-white/80 border-2 border-pink-200 text-pink-500 hover:bg-pink-100 shadow-md',
    fabStickyNote: 'bg-gradient-to-br from-yellow-400 to-orange-400 text-white shadow-lg shadow-orange-500/40',
    fabSmartCreate: 'bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-400 text-white shadow-lg shadow-pink-500/40',
    fabSettings: 'bg-gradient-to-br from-cyan-400 via-blue-400 to-purple-400 text-white shadow-lg shadow-blue-500/40',
    dateTitle: 'text-slate-800',
    clearBtn: 'bg-pink-200 text-pink-500 hover:bg-pink-300',
  },
  frostedGlass: {
    // 淡雅的蓝紫渐变背景
    pageBg: 'bg-gradient-to-br from-sky-400 via-indigo-400 to-purple-500',
    toolbar: 'bg-white/25 backdrop-blur-xl border border-white/20 shadow-lg',
    viewSwitcherBg: '',
    viewSwitcherBtnActive: 'bg-white/90 backdrop-blur-lg text-indigo-600 shadow-xl border border-white/40 rounded-full',
    viewSwitcherBtnInactive: 'text-white/90 hover:bg-white/40 rounded-full backdrop-blur',
    navBtn: 'bg-white/25 backdrop-blur-lg shadow-md border border-white/30 hover:bg-white/40',
    navBtnText: 'text-white',
    todayBtn: 'bg-white/35 backdrop-blur-lg shadow-md border border-white/40 text-white hover:bg-white/45',
    searchInput: 'border border-white/40 bg-white/20 backdrop-blur text-white placeholder:text-white/60 shadow-inner',
    select: 'border border-white/40 bg-white/20 backdrop-blur text-white',
    urgentBtnActive: 'bg-white/40 backdrop-blur border border-white/40 text-red-400 shadow-lg',
    urgentBtnInactive: 'bg-white/20 backdrop-blur border-white/30 text-white/90 hover:bg-white/30',
    statsBadge: 'bg-white/35 backdrop-blur text-white shadow-lg border border-white/30',
    resetBtn: 'bg-white/25 backdrop-blur border border-white/30 text-white hover:bg-white/35 shadow-md',
    fabStickyNote: 'bg-gradient-to-br from-yellow-300 to-orange-400 text-orange-700 shadow-2xl backdrop-blur-xl border border-white/30',
    fabSmartCreate: 'bg-white/70 backdrop-blur-xl shadow-2xl border border-white/40 text-indigo-600',
    fabSettings: 'bg-white/70 backdrop-blur-xl shadow-2xl border border-white/40 text-indigo-600',
    dateTitle: 'text-white font-bold',
    clearBtn: 'bg-white/30 text-white hover:bg-white/40',
  },
} as const;

type ThemeKey = keyof typeof themes;

function HomeContent() {
  const { state, updateEvent } = useEvents();
  const { notes } = useStickyNotes();
  const { settings, isLoaded } = useSettings();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedHour, setSelectedHour] = useState<number | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [useSmartInput, setUseSmartInput] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isStickyNoteModalOpen, setIsStickyNoteModalOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showStatsPanel, setShowStatsPanel] = useState(false);

  // 手动备份处理
  const handleBackup = async () => {
    try {
      const data = await createBackup();
      downloadBackup(data, generateBackupFilename());
      alert('备份文件已下载');
    } catch (error) {
      console.error('Backup error:', error);
      alert('备份失败');
    }
  };

  // 导出本周数据
  const handleExportThisWeek = () => {
    setShowExportDialog(true);
  };

  const handleFilteredExport = (filteredEvents: CalendarEvent[]) => {
    downloadAsJSON(filteredEvents, generateFilename('calendar-events', 'json'));
  };

  // 月视图连续点击计数（隐藏功能：5次点击进入生活日历）
  const [monthViewClickCount, setMonthViewClickCount] = useState(0);
  const monthViewClickTimerRef = useRef<{ lastClickTime: number } | null>(null);

  const theme = themes[settings.theme as ThemeKey] || themes.skeuomorphic;

  const {
    filters,
    filteredEvents,
    filteredStickyNotes,
    stats,
    hasActiveFilters,
    setSearchQuery,
    setCategory,
    setDateRange,
    setStatus,
    setShowUrgentOnly,
    resetFilters,
  } = useEventFilter(state.events, notes);

  // 设置加载后应用默认视图
  useEffect(() => {
    if (isLoaded && settings.defaultView) {
      setCurrentView(settings.defaultView);
    }
  }, [isLoaded, settings.defaultView]);

  // 监听事件移动（从提醒弹窗推迟）
  useEffect(() => {
    const handleEventMove = (e: CustomEvent<{ eventId: string; newDate: string; newStartTime: string; newEndTime: string }>) => {
      const { eventId, newDate, newStartTime, newEndTime } = e.detail;
      const eventToMove = state.events.find(ev => ev.id === eventId);
      if (eventToMove) {
        const updatedEvent: CalendarEvent = {
          ...eventToMove,
          date: newDate,
          startTime: newStartTime,
          endTime: newEndTime,
        };
        updateEvent(updatedEvent);
      }
    };

    window.addEventListener('calendar-event-move', handleEventMove as EventListener);
    return () => {
      window.removeEventListener('calendar-event-move', handleEventMove as EventListener);
    };
  }, [state.events, updateEvent]);

  // 过滤后的事件 ID 集合
  const filteredEventIds = hasActiveFilters
    ? new Set(filteredEvents.map(e => e.id))
    : null;

  // 导航函数
  const goToToday = () => setCurrentDate(new Date());
  const goPrev = () => {
    if (currentView === 'day') setCurrentDate(subDays(currentDate, 1));
    else if (currentView === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subMonths(currentDate, 1));
  };
  const goNext = () => {
    if (currentView === 'day') setCurrentDate(addDays(currentDate, 1));
    else if (currentView === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addMonths(currentDate, 1));
  };

  // 获取当前视图的日期标题
  const getDateTitle = () => {
    if (currentView === 'day') {
      return format(currentDate, 'M月d日');
    } else if (currentView === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
      const weekEnd = addDays(weekStart, 6);
      return `${format(weekStart, 'M月d日')} - ${format(weekEnd, 'M月d日')}`;
    } else {
      return format(currentDate, 'yyyy年M月');
    }
  };

  const handleCreateEvent = (date: Date, hour: number) => {
    setSelectedDate(date);
    setSelectedHour(hour);
    setSelectedEvent(null);
    setUseSmartInput(false);
    setIsModalOpen(true);
  };

  const handleSmartCreate = () => {
    setSelectedDate(undefined);
    setSelectedHour(undefined);
    setSelectedEvent(null);
    setUseSmartInput(true);
    setIsModalOpen(true);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setSelectedDate(undefined);
    setSelectedHour(undefined);
    setUseSmartInput(false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // 视图切换
  const views: { value: ViewType; label: string }[] = [
    { value: 'day', label: '日' },
    { value: 'week', label: '周' },
    { value: 'month', label: '月' },
  ];

  return (
    <div className={`flex flex-col h-screen ${theme.pageBg}`}>
      {/* 统一状态栏：视图切换 + 搜索筛选 + 日期导航 */}
      <div className={`flex items-center gap-2 py-2 px-3 border-b shadow-sm ${theme.toolbar}`}>
        {/* 视图切换 */}
        <div className={`flex items-center gap-0.5 mr-2 ${theme.viewSwitcherBg}`}>
          {views.map((view) => (
            <button
              key={view.value}
              onClick={() => {
                if (view.value === 'month') {
                  // 隐藏功能：连续快速点击月视图5次进入生活日历
                  const now = Date.now();
                  const lastClick = monthViewClickTimerRef.current?.lastClickTime || 0;

                  // 如果距离上次点击超过300ms，重置计数
                  if (now - lastClick > 300) {
                    setMonthViewClickCount(1);
                    monthViewClickTimerRef.current = { lastClickTime: now };
                    setCurrentView(view.value);
                    return;
                  }

                  const newCount = monthViewClickCount + 1;
                  setMonthViewClickCount(newCount);
                  monthViewClickTimerRef.current = { lastClickTime: now };

                  // 连续点击5次则跳转
                  if (newCount >= 5) {
                    setMonthViewClickCount(0);
                    window.location.href = '/life';
                    return;
                  }
                }
                setCurrentView(view.value);
              }}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-none ${
                currentView === view.value ? theme.viewSwitcherBtnActive : theme.viewSwitcherBtnInactive
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>

        {/* 日期导航 */}
        <div className={`flex items-center gap-0.5 rounded-lg p-0.5 ${
          settings.theme === 'cartoon' ? 'bg-pink-200/50' :
          settings.theme === 'frostedGlass' ? 'bg-white/40 backdrop-blur' :
          'bg-gradient-to-b from-slate-100 to-slate-200 shadow-inner'
        }`}>
          <button
            onClick={goPrev}
            className={`w-7 h-7 flex items-center justify-center rounded transition-none ${theme.navBtn}`}
          >
            <ChevronLeft className={`w-4 h-4 ${theme.navBtnText}`} />
          </button>
          <button
            onClick={goToToday}
            className={`px-2 h-7 flex items-center justify-center rounded text-xs font-medium transition-none ${theme.todayBtn}`}
          >
            今天
          </button>
          <button
            onClick={goNext}
            className={`w-7 h-7 flex items-center justify-center rounded transition-none ${theme.navBtn}`}
          >
            <ChevronRight className={`w-4 h-4 ${theme.navBtnText}`} />
          </button>
        </div>

        {/* 当前日期标题 */}
        <span className={`font-semibold text-sm tracking-wide ${theme.dateTitle}`}>{getDateTitle()}</span>

        {/* 搜索框 */}
        <div className="flex items-center gap-1 ml-2">
          <div className="relative">
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索..."
              className={`h-7 pl-7 pr-2 text-xs rounded-lg outline-none w-24 transition-none ${theme.searchInput}`}
            />
            <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {filters.searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className={`w-5 h-5 flex items-center justify-center rounded-full transition-none ${theme.clearBtn}`}
            >
              ×
            </button>
          )}
        </div>

        {/* 筛选下拉 */}
        <div className="flex items-center gap-1">
          <select
            value={filters.category}
            onChange={(e) => setCategory(e.target.value as any)}
            className={`h-7 px-2 text-xs rounded-lg outline-none cursor-pointer transition-none ${theme.select}`}
          >
            <option value="全部">分类</option>
            <option value="售前">售前</option>
            <option value="项目">项目</option>
            <option value="会议">会议</option>
            <option value="管理">管理</option>
            <option value="推广">推广</option>
            <option value="其它">其它</option>
          </select>

          <select
            value={filters.dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className={`h-7 px-2 text-xs rounded-lg outline-none cursor-pointer transition-none ${theme.select}`}
          >
            <option value="全部">时间</option>
            <option value="今天">今天</option>
            <option value="本周">本周</option>
            <option value="本月">本月</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => setStatus(e.target.value as any)}
            className={`h-7 px-2 text-xs rounded-lg outline-none cursor-pointer transition-none ${theme.select}`}
          >
            <option value="全部">状态</option>
            <option value="未完成">未完成</option>
            <option value="已完成">已完成</option>
          </select>
        </div>

        {/* 紧急按钮 */}
        <button
          onClick={() => setShowUrgentOnly(!filters.showUrgentOnly)}
          className={`h-7 w-7 flex items-center justify-center rounded-lg text-xs font-bold shadow-sm border transition-none ${
            filters.showUrgentOnly ? theme.urgentBtnActive : theme.urgentBtnInactive
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </button>

        {/* 帮助按钮 */}
        <button
          onClick={() => setIsHelpOpen(true)}
          className={`h-7 w-7 flex items-center justify-center rounded-lg shadow-sm border transition-none ${theme.navBtn}`}
        >
          <svg className={`w-3.5 h-3.5 ${theme.navBtnText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        {/* 备份按钮 */}
        <button
          onClick={handleBackup}
          className={`h-7 w-7 flex items-center justify-center rounded-lg shadow-sm border transition-none ${theme.navBtn}`}
          title="下载备份文件"
        >
          <Download className={`w-3.5 h-3.5 ${theme.navBtnText}`} />
        </button>

        {/* 导出本周按钮 */}
        <button
          onClick={handleExportThisWeek}
          className={`h-7 w-7 flex items-center justify-center rounded-lg shadow-sm border transition-none ${theme.navBtn}`}
          title="导出本周数据"
        >
          <svg className={`w-3.5 h-3.5 ${theme.navBtnText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>

        {/* 统计按钮 */}
        <button
          onClick={() => setShowStatsPanel(true)}
          className={`h-7 w-7 flex items-center justify-center rounded-lg shadow-sm border transition-none ${theme.navBtn}`}
          title="数据统计"
        >
          <svg className={`w-3.5 h-3.5 ${theme.navBtnText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </button>

        {/* 统计标签 */}
        {hasActiveFilters && (
          <div className={`h-7 px-2 flex items-center justify-center rounded-lg text-xs font-medium ${theme.statsBadge}`}>
            {stats.filtered}/{stats.total}
          </div>
        )}

        {/* 重置按钮 */}
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className={`h-7 px-2 flex items-center justify-center rounded-lg text-xs transition-none ${theme.resetBtn}`}
          >
            重置
          </button>
        )}
      </div>

      {/* 日历视图内容 */}
      <div className="flex-1 overflow-hidden">
        {currentView === 'day' && (
          <DayView
            date={currentDate}
            events={state.events}
            onDateChange={setCurrentDate}
            onEventClick={handleEditEvent}
            onSlotClick={(hour) => handleCreateEvent(currentDate, hour)}
            filteredEventIds={filteredEventIds}
          />
        )}
        {currentView === 'week' && (
          <WeeklyCalendar
            onCreateEvent={handleCreateEvent}
            onEditEvent={handleEditEvent}
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            filteredEventIds={filteredEventIds}
            weekStartsOn={settings.weekStartsOn === '1' ? 1 : 0}
          />
        )}
        {currentView === 'month' && (
          <MonthView
            currentDate={currentDate}
            events={state.events}
            onDateChange={setCurrentDate}
            onEventClick={handleEditEvent}
            onCreateEvent={handleCreateEvent}
            filteredEventIds={filteredEventIds}
            weekStartsOn={settings.weekStartsOn === '1' ? 1 : 0}
          />
        )}
      </div>

      {/* 悬浮按钮组 */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
        <button
          onClick={() => setIsStickyNoteModalOpen(true)}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-none hover:scale-105 ${theme.fabStickyNote}`}
        >
          <StickyNote className="w-6 h-6" />
        </button>
        <button
          onClick={handleSmartCreate}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-none hover:scale-105 ${theme.fabSmartCreate}`}
        >
          <Plus className="w-7 h-7" />
        </button>
        <Link
          href="/settings"
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-none hover:scale-105 ${theme.fabSettings}`}
        >
          <Settings className="w-7 h-7" />
        </Link>
      </div>

      {/* 便签面板 */}
      <StickyNotePanel
        onCreateEvent={handleCreateEvent}
        filteredNotes={filteredStickyNotes}
        searchQuery={filters.searchQuery}
      />

      {/* 便签创建弹窗 */}
      <StickyNoteModal
        isOpen={isStickyNoteModalOpen}
        onClose={() => setIsStickyNoteModalOpen(false)}
      />

      <EventModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        initialDate={selectedDate}
        initialHour={selectedHour}
        initialEvent={selectedEvent}
        defaultUseSmartInput={useSmartInput}
        defaultDuration={parseInt(settings.defaultEventDuration)}
      />

      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        events={state.events}
        onExport={handleFilteredExport}
        exportType="json"
        initialExportMode="filtered"
        initialStartDate={format(startOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd')}
        initialEndDate={format(endOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd')}
        initialCategories={new Set(CATEGORIES)}
      />

      <StatsPanel
        isOpen={showStatsPanel}
        onClose={() => setShowStatsPanel(false)}
        events={state.events}
      />
    </div>
  );
}

export default function Home() {
  return (
    <UndoProvider>
      <EventProvider>
        <HomeContent />
        <GlobalReminderHandler />
      </EventProvider>
    </UndoProvider>
  );
}