'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, startOfWeek } from 'date-fns';
import { EventProvider, useEvents } from '@/context/EventContext';
import { WeeklyCalendar } from '@/components/calendar/WeeklyCalendar';
import { DayView } from '@/components/calendar/DayView';
import { MonthView } from '@/components/calendar/MonthView';
import { EventModal } from '@/components/events/EventModal';
import { CalendarEvent } from '@/types/event';
import { Settings, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { GlobalReminderHandler } from '@/components/ReminderModal';
import { useEventFilter } from '@/hooks/useEventFilter';
import { useSettings } from '@/hooks/useSettings';

type ViewType = 'day' | 'week' | 'month';

function HomeContent() {
  const { state, updateEvent } = useEvents();
  const { settings, isLoaded } = useSettings();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedHour, setSelectedHour] = useState<number | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [useSmartInput, setUseSmartInput] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>('week');
  const [currentDate, setCurrentDate] = useState(new Date());

  const {
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
  } = useEventFilter(state.events);

  // 设置加载后应用默认视图
  useEffect(() => {
    if (isLoaded && settings.defaultView) {
      setCurrentView(settings.defaultView);
    }
  }, [isLoaded, settings.defaultView]);

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
    setSelectedDate(undefined);
    setSelectedHour(undefined);
    setSelectedEvent(null);
    setUseSmartInput(false);
  };

  // 视图切换
  const views: { value: ViewType; label: string }[] = [
    { value: 'day', label: '日' },
    { value: 'week', label: '周' },
    { value: 'month', label: '月' },
  ];

  return (
    <div className={`flex flex-col h-screen ${settings.theme === 'skeuomorphic' ? 'bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-50' : settings.theme === 'cartoon' ? 'bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100' : 'bg-gradient-to-br from-blue-100/30 via-purple-100/30 to-pink-100/30 backdrop-blur-md'}`}>
      {/* 统一状态栏：视图切换 + 搜索筛选 + 日期导航 */}
      <div className={`flex items-center gap-2 py-2 px-3 border-b shadow-sm ${
        settings.theme === 'skeuomorphic'
          ? 'bg-gradient-to-b from-white to-slate-50 border-slate-200'
          : settings.theme === 'cartoon'
          ? 'bg-gradient-to-b from-white to-pink-50 border-pink-200'
          : 'bg-white/60 backdrop-blur-lg border-white/20'
      }`}>
        {/* 视图切换 */}
        <div className={`flex items-center gap-0.5 mr-2 ${
          settings.theme === 'cartoon' ? 'bg-pink-100 rounded-2xl p-1' : settings.theme === 'frosted' ? '' : 'bg-gradient-to-b from-slate-100 to-slate-200 rounded-lg p-0.5 shadow-inner'
        }`}>
          {views.map((view) => (
            <button
              key={view.value}
              onClick={() => setCurrentView(view.value)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                settings.theme === 'cartoon'
                  ? currentView === view.value
                    ? 'bg-gradient-to-r from-pink-400 to-purple-400 text-white shadow-lg'
                    : 'text-slate-600 hover:bg-pink-200'
                  : settings.theme === 'frosted'
                  ? currentView === view.value
                    ? 'bg-white/80 backdrop-blur text-blue-600 shadow-md rounded-full'
                    : 'text-slate-500 hover:bg-white/50 rounded-full'
                  : currentView === view.value
                  ? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-md'
                  : 'bg-gradient-to-b from-white to-slate-100 text-slate-600 hover:from-slate-50 hover:to-slate-100 border border-slate-200'
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>

        {/* 日期导航 */}
        <div className={`flex items-center gap-0.5 rounded-lg p-0.5 ${
          settings.theme === 'skeuomorphic'
            ? 'bg-gradient-to-b from-slate-100 to-slate-200 shadow-inner'
            : settings.theme === 'cartoon'
            ? 'bg-pink-200/50'
            : 'bg-white/40 backdrop-blur'
        }`}>
          <button
            onClick={goPrev}
            className={`w-7 h-7 flex items-center justify-center rounded transition-all ${
              settings.theme === 'skeuomorphic'
                ? 'bg-gradient-to-b from-white to-slate-50 hover:from-slate-50 hover:to-white shadow-sm border border-slate-200'
                : settings.theme === 'cartoon'
                ? 'bg-white shadow-md border-2 border-pink-200 hover:bg-pink-100'
                : 'bg-white/70 backdrop-blur shadow-sm border border-white/30 hover:bg-white/90'
            }`}
          >
            <ChevronLeft className={`w-4 h-4 ${settings.theme === 'cartoon' ? 'text-pink-500' : settings.theme === 'frosted' ? 'text-blue-500' : 'text-slate-600'}`} />
          </button>
          <button
            onClick={goToToday}
            className={`px-2 h-7 flex items-center justify-center rounded text-xs font-medium transition-all ${
              settings.theme === 'skeuomorphic'
                ? 'bg-gradient-to-b from-white to-slate-50 hover:from-slate-50 hover:to-white shadow-sm border border-slate-200 text-slate-600'
                : settings.theme === 'cartoon'
                ? 'bg-white shadow-md border-2 border-pink-200 text-pink-600 hover:bg-pink-100'
                : 'bg-white/70 backdrop-blur shadow-sm border border-white/30 text-blue-600 hover:bg-white/90'
            }`}
          >
            今天
          </button>
          <button
            onClick={goNext}
            className={`w-7 h-7 flex items-center justify-center rounded transition-all ${
              settings.theme === 'skeuomorphic'
                ? 'bg-gradient-to-b from-white to-slate-50 hover:from-slate-50 hover:to-white shadow-sm border border-slate-200'
                : settings.theme === 'cartoon'
                ? 'bg-white shadow-md border-2 border-pink-200 hover:bg-pink-100'
                : 'bg-white/70 backdrop-blur shadow-sm border border-white/30 hover:bg-white/90'
            }`}
          >
            <ChevronRight className={`w-4 h-4 ${settings.theme === 'cartoon' ? 'text-pink-500' : settings.theme === 'frosted' ? 'text-blue-500' : 'text-slate-600'}`} />
          </button>
        </div>

        {/* 当前日期标题 */}
        <span className="text-slate-800 font-semibold text-sm tracking-wide">{getDateTitle()}</span>

        {/* 搜索框 */}
        <div className="flex items-center gap-1 ml-2">
          <div className="relative">
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索..."
              className={`h-7 pl-7 pr-2 text-xs rounded-lg outline-none w-24 transition-all ${
                settings.theme === 'skeuomorphic'
                  ? 'border border-slate-200 bg-gradient-to-b from-white to-slate-50 focus:border-blue-400 shadow-inner'
                  : settings.theme === 'cartoon'
                  ? 'border-2 border-pink-200 bg-white/80 focus:border-pink-400 shadow-md'
                  : 'border border-white/30 bg-white/50 backdrop-blur focus:border-blue-400 shadow-sm'
              }`}
            />
            <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {filters.searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className={`w-5 h-5 flex items-center justify-center rounded-full transition-all ${
                settings.theme === 'cartoon' ? 'bg-pink-200 text-pink-500 hover:bg-pink-300' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
              }`}
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
            className={`h-7 px-2 text-xs rounded-lg outline-none cursor-pointer transition-all ${
              settings.theme === 'skeuomorphic'
                ? 'border border-slate-200 bg-gradient-to-b from-white to-slate-50 text-slate-600 hover:border-slate-300'
                : settings.theme === 'cartoon'
                ? 'border-2 border-pink-200 bg-white/80 text-pink-600 hover:border-pink-300'
                : 'border border-white/30 bg-white/50 backdrop-blur text-blue-600 hover:border-white/50'
            }`}
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
            className={`h-7 px-2 text-xs rounded-lg outline-none cursor-pointer transition-all ${
              settings.theme === 'skeuomorphic'
                ? 'border border-slate-200 bg-gradient-to-b from-white to-slate-50 text-slate-600 hover:border-slate-300'
                : settings.theme === 'cartoon'
                ? 'border-2 border-pink-200 bg-white/80 text-pink-600 hover:border-pink-300'
                : 'border border-white/30 bg-white/50 backdrop-blur text-blue-600 hover:border-white/50'
            }`}
          >
            <option value="全部">时间</option>
            <option value="今天">今天</option>
            <option value="本周">本周</option>
            <option value="本月">本月</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => setStatus(e.target.value as any)}
            className={`h-7 px-2 text-xs rounded-lg outline-none cursor-pointer transition-all ${
              settings.theme === 'skeuomorphic'
                ? 'border border-slate-200 bg-gradient-to-b from-white to-slate-50 text-slate-600 hover:border-slate-300'
                : settings.theme === 'cartoon'
                ? 'border-2 border-pink-200 bg-white/80 text-pink-600 hover:border-pink-300'
                : 'border border-white/30 bg-white/50 backdrop-blur text-blue-600 hover:border-white/50'
            }`}
          >
            <option value="全部">状态</option>
            <option value="未完成">未完成</option>
            <option value="已完成">已完成</option>
          </select>
        </div>

        {/* 紧急按钮 */}
        <button
          onClick={() => setShowUrgentOnly(!filters.showUrgentOnly)}
          className={`h-7 w-7 flex items-center justify-center rounded-lg text-xs font-bold shadow-sm border transition-all ${
            filters.showUrgentOnly
              ? settings.theme === 'cartoon'
                ? 'bg-gradient-to-r from-red-400 to-pink-500 text-white border-red-300 shadow-lg'
                : 'bg-gradient-to-b from-red-400 to-red-500 text-white border-red-500 shadow-md'
              : settings.theme === 'cartoon'
              ? 'bg-white/80 border-pink-200 text-pink-400 hover:bg-pink-100'
              : settings.theme === 'frosted'
              ? 'bg-white/50 backdrop-blur border-white/30 text-slate-400 hover:bg-white/70'
              : 'bg-gradient-to-b from-white to-slate-50 text-slate-400 border-slate-200 hover:border-slate-300'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </button>

        {/* 统计标签 */}
        {hasActiveFilters && (
          <div className={`h-7 px-2 flex items-center justify-center rounded-lg text-xs font-medium ${
            settings.theme === 'cartoon'
              ? 'bg-gradient-to-r from-pink-400 to-purple-400 text-white shadow-lg'
              : settings.theme === 'frosted'
              ? 'bg-white/60 backdrop-blur text-blue-600 shadow-md'
              : 'bg-gradient-to-b from-blue-100 to-blue-200 text-blue-700 shadow-inner'
          }`}>
            {stats.filtered}/{stats.total}
          </div>
        )}

        {/* 重置按钮 */}
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className={`h-7 px-2 flex items-center justify-center rounded-lg text-xs transition-all ${
              settings.theme === 'cartoon'
                ? 'bg-white/80 border-2 border-pink-200 text-pink-500 hover:bg-pink-100 shadow-md'
                : settings.theme === 'frosted'
                ? 'bg-white/50 backdrop-blur border border-white/30 text-blue-500 hover:bg-white/70 shadow-sm'
                : 'bg-gradient-to-b from-white to-slate-50 text-slate-500 hover:from-slate-50 hover:to-slate-100 border border-slate-200 shadow-sm'
            }`}
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
            onEventUpdate={updateEvent}
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
          onClick={handleSmartCreate}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-105 ${
            settings.theme === 'cartoon'
              ? 'bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-400 text-white shadow-lg shadow-pink-500/40'
              : settings.theme === 'frosted'
              ? 'bg-white/80 backdrop-blur-lg shadow-xl border border-white/30 text-blue-500'
              : 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30'
          }`}
        >
          <Plus className="w-7 h-7" />
        </button>
        <Link
          href="/settings"
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-105 ${
            settings.theme === 'cartoon'
              ? 'bg-gradient-to-br from-cyan-400 via-blue-400 to-purple-400 text-white shadow-lg shadow-blue-500/40'
              : settings.theme === 'frosted'
              ? 'bg-white/80 backdrop-blur-lg shadow-xl border border-white/30 text-blue-500'
              : 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/30'
          }`}
        >
          <Settings className="w-7 h-7" />
        </Link>
      </div>

      <EventModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        initialDate={selectedDate}
        initialHour={selectedHour}
        initialEvent={selectedEvent}
        defaultUseSmartInput={useSmartInput}
        defaultDuration={parseInt(settings.defaultEventDuration)}
      />
    </div>
  );
}

export default function Home() {
  return (
    <EventProvider>
      <HomeContent />
      <GlobalReminderHandler />
    </EventProvider>
  );
}
