'use client';

import { useMemo } from 'react';
import { CalendarEvent } from '@/types/event';
import { CATEGORIES } from '@/types/event';
import { COLOR_CATEGORY_MAP, CATEGORY_COLORS } from '@/lib/constants';
import { format, startOfWeek, endOfWeek, subWeeks, isWithinInterval, getDay, parseISO, eachDayOfInterval, subMonths, getMonth } from 'date-fns';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { TrendingUp, TrendingDown, CheckCircle2, AlertCircle, Calendar, Target, Clock, CalendarDays, Zap, Activity, PieChart as PieChartIcon, Flame, Timer } from 'lucide-react';

interface StatsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  events: CalendarEvent[];
}

// 饼图组件
function PieChart({ data, size = 80 }: { data: { name: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  const radius = size / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  return (
    <div className="flex items-start gap-2">
      <div className="relative shrink-0">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {total === 0 ? (
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth="16" />
          ) : (
            data.map((item, i) => {
              const percentage = item.value / total;
              const dashLength = circumference * percentage;
              const dashOffset = circumference * (1 - accumulatedOffset);
              accumulatedOffset += percentage;

              return (
                <circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={item.color}
                  strokeWidth="16"
                  strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                  strokeDashoffset={dashOffset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  style={{ transition: 'all 0.3s ease' }}
                />
              );
            })
          )}
          <circle cx={size / 2} cy={size / 2} r={radius - 12} fill="white" />
          <text x={size / 2} y={size / 2 - 3} textAnchor="middle" className="text-sm font-bold fill-slate-700">{total}</text>
          <text x={size / 2} y={size / 2 + 10} textAnchor="middle" className="text-[9px] fill-slate-500">总计</text>
        </svg>
      </div>
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-1 whitespace-nowrap">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-[9px] text-slate-600 truncate flex-1">{item.name}</span>
            <span className="text-[9px] font-medium text-slate-500 shrink-0">{item.value}</span>
          </div>
        ))}
        {total === 0 && (
          <div className="text-[9px] text-slate-400">暂无数据</div>
        )}
      </div>
    </div>
  );
}

// 折线图组件
function LineChart({ data, width = 280, height = 80 }: { data: { label: string; value: number }[]; width?: number; height?: number }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (d.value / max) * height;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width={width} height={height + 20} viewBox={`0 0 ${width} ${height + 20}`}>
      {/* 网格线 */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
        <line
          key={i}
          x1="0"
          y1={height * ratio}
          x2={width}
          y2={height * ratio}
          stroke="#e2e8f0"
          strokeDasharray="2,2"
        />
      ))}
      {/* 面积填充 */}
      <polygon
        points={areaPoints}
        fill="url(#gradient)"
        opacity="0.3"
      />
      {/* 折线 */}
      <polyline
        points={points}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 数据点 */}
      {data.map((d, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - (d.value / max) * height;
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="3" fill="#3b82f6" />
            <text x={x} y={height + 15} textAnchor="middle" className="text-[10px] fill-slate-500">{d.label}</text>
          </g>
        );
      })}
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// 热力图组件
function Heatmap({ data, maxValue }: { data: { day: number; hour: number; value: number }[]; maxValue: number }) {
  const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
  const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

  const getIntensity = (value: number) => {
    if (value === 0) return 'bg-slate-100';
    const ratio = value / maxValue;
    if (ratio < 0.25) return 'bg-blue-200';
    if (ratio < 0.5) return 'bg-blue-400';
    if (ratio < 0.75) return 'bg-blue-500';
    return 'bg-blue-600';
  };

  const dataMap = new Map(data.map(d => [`${d.day}-${d.hour}`, d.value]));

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[280px]">
        {/* 小时标签 */}
        <div className="flex mb-1 ml-8">
          {hours.map(h => (
            <div key={h} className="w-5 text-center text-[9px] text-slate-400">{h}</div>
          ))}
        </div>
        {/* 热力网格 */}
        {dayNames.map((day, dayIndex) => (
          <div key={dayIndex} className="flex items-center gap-1 mb-1">
            <div className="w-6 text-center text-[10px] text-slate-500">{day}</div>
            {hours.map(h => {
              const value = dataMap.get(`${dayIndex}-${h}`) || 0;
              return (
                <div
                  key={h}
                  className={`w-5 h-4 rounded-[2px] ${getIntensity(value)}`}
                  title={`周${day} ${h}:00 - ${value}个事件`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// 进度环组件
function ProgressRing({ value, size = 60, label }: { value: number; size?: number; label: string }) {
  const radius = size / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - value / 100);

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="8"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={value >= 80 ? '#22c55e' : value >= 50 ? '#f59e0b' : '#ef4444'}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'all 0.5s ease' }}
        />
        <text x={size / 2} y={size / 2 + 3} textAnchor="middle" className="text-sm font-bold fill-slate-700">{Math.min(100, Math.max(0, Math.round(value)))}%</text>
      </svg>
      <span className="text-[10px] text-slate-500 mt-1">{label}</span>
    </div>
  );
}

export function StatsPanel({ isOpen, onClose, events }: StatsPanelProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 时间范围
    const weekStart = startOfWeek(today, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 0 });
    const lastWeekStart = subWeeks(weekStart, 1);
    const lastWeekEnd = subWeeks(weekEnd, 1);

    // 4周数据
    const fourWeeksAgo = subWeeks(weekStart, 3);
    const weekRanges = [0, 1, 2, 3].map(i => {
      const start = subWeeks(weekStart, i);
      const end = subWeeks(weekEnd, i);
      return { start, end, label: `W${4 - i}` };
    });

    // 剔除重复事件
    const seen = new Set<string>();
    const uniqueEvents = events.filter(event => {
      if (!event.repeatId) return true;
      if (seen.has(event.repeatId)) return false;
      seen.add(event.repeatId);
      return true;
    });

    // 各类别统计 - 使用 constants.ts 中的统一颜色
    const categoryStats = CATEGORIES.map(cat => ({
      name: cat,
      value: uniqueEvents.filter(e => e.category === cat).length,
      completed: uniqueEvents.filter(e => e.category === cat && e.completed).length,
      color: COLOR_CATEGORY_MAP[CATEGORY_COLORS[cat]]?.hex || '#6b7280',
    })).filter(s => s.value > 0).sort((a, b) => b.value - a.value);

    // 完成/未完成饼图
    const completedCount = uniqueEvents.filter(e => e.completed).length;
    const pendingCount = uniqueEvents.length - completedCount;

    // 本周计划事件（日期在本周范围内的事件，不论何时创建）
    const thisWeekScheduled = uniqueEvents.filter(e => {
      const eventDate = new Date(e.date);
      return isWithinInterval(eventDate, { start: weekStart, end: weekEnd });
    });
    const thisWeekScheduledCompleted = thisWeekScheduled.filter(e => e.completed).length;
    const thisWeekNewCreated = thisWeekScheduled.length; // 本周新建的事件数

    // 本周类别统计 - 使用 constants.ts 中的统一颜色
    const thisWeekCategoryStats = CATEGORIES.map(cat => ({
      name: cat,
      value: thisWeekScheduled.filter(e => e.category === cat).length,
      completed: thisWeekScheduled.filter(e => e.category === cat && e.completed).length,
      color: COLOR_CATEGORY_MAP[CATEGORY_COLORS[cat]]?.hex || '#6b7280',
    })).filter(s => s.value > 0).sort((a, b) => b.value - a.value);

    // 上周计划事件
    const lastWeekScheduled = uniqueEvents.filter(e => {
      const eventDate = new Date(e.date);
      return isWithinInterval(eventDate, { start: lastWeekStart, end: lastWeekEnd });
    });
    const lastWeekScheduledCompleted = lastWeekScheduled.filter(e => e.completed).length;

    // 4周趋势
    const weeklyTrend = weekRanges.map(week => ({
      label: week.label,
      total: uniqueEvents.filter(e => {
        const eventDate = new Date(e.date);
        return isWithinInterval(eventDate, { start: week.start, end: week.end });
      }).length,
      completed: uniqueEvents.filter(e => {
        const eventDate = new Date(e.date);
        return isWithinInterval(eventDate, { start: week.start, end: week.end }) && e.completed;
      }).length,
    }));

    // 本周每日统计
    const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const dailyStats = daysInWeek.map((day, i) => {
      const dayEvents = thisWeekScheduled.filter(e => {
        const eventDate = new Date(e.date);
        return format(eventDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
      });
      const dayCompleted = dayEvents.filter(e => e.completed).length;
      return {
        label: format(day, 'M/d'),
        dayName: ['日', '一', '二', '三', '四', '五', '六'][i],
        total: dayEvents.length,
        completed: dayCompleted,
        isToday: format(day, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'),
      };
    });

    // 热力图数据（本周每小时分布）
    const heatmapData: { day: number; hour: number; value: number }[] = [];
    const hourRange = Array.from({ length: 14 }, (_, i) => i + 8); // 8-21点

    for (let day = 0; day < 7; day++) {
      for (const hour of hourRange) {
        const count = thisWeekScheduled.filter(e => {
          if (!e.startTime) return false;
          const eventHour = parseInt(e.startTime.split(':')[0]);
          const eventDay = getDay(parseISO(e.date));
          return eventHour === hour && eventDay === day;
        }).length;
        if (count > 0) {
          heatmapData.push({ day, hour, value: count });
        }
      }
    }
    const maxHeatmapValue = Math.max(...heatmapData.map(d => d.value), 1);

    // 时间段分析
    const timeSlots = [
      { name: '上午(8-12)', hours: [8, 9, 10, 11], icon: '🌤️', count: 0 },
      { name: '下午(12-18)', hours: [12, 13, 14, 15, 16, 17], icon: '☀️', count: 0 },
      { name: '晚间(18-22)', hours: [18, 19, 20, 21], icon: '🌙', count: 0 },
    ];
    thisWeekScheduled.forEach(e => {
      if (!e.startTime) return;
      const hour = parseInt(e.startTime.split(':')[0]);
      timeSlots.forEach(slot => {
        if (slot.hours.includes(hour)) slot.count++;
      });
    });
    const busiestTimeSlot = timeSlots.reduce((a, b) => a.count > b.count ? a : b, timeSlots[0]);

    // 最忙的周几
    const dayCountMap = new Map<number, number>();
    thisWeekScheduled.forEach(e => {
      const day = getDay(parseISO(e.date));
      dayCountMap.set(day, (dayCountMap.get(day) || 0) + 1);
    });
    const busiestDay = [0, 1, 2, 3, 4, 5, 6].map(d => ({ day: d, count: dayCountMap.get(d) || 0 })).reduce((a, b) => a.count > b.count ? a : b, { day: 0, count: 0 });
    const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

    // 紧急事件
    const urgentEvents = uniqueEvents.filter(e => e.isUrgent);
    const urgentCompleted = urgentEvents.filter(e => e.completed).length;
    const urgentThisWeek = thisWeekScheduled.filter(e => e.isUrgent).length;

    // 逾期统计
    const overdueEvents = uniqueEvents.filter(e => {
      if (e.completed) return false;
      const eventEndDateTime = new Date(`${e.date}T${e.endTime || '23:59'}`);
      return eventEndDateTime < now;
    });

    // 按时完成率（排除未到期的）
    const completedEvents = uniqueEvents.filter(e => e.completed);
    const onTimeEvents = completedEvents.filter(e => {
      const eventEndDateTime = new Date(`${e.date}T${e.endTime || '23:59'}`);
      // 这里简化：假设有 endTime 的才算按时
      return !!e.endTime;
    });

    // 重复事件
    const repeatGroupCount = new Set(events.filter(e => e.repeatId).map(e => e.repeatId)).size;

    // 月度分布（今年各月）
    const monthlyStats = Array.from({ length: 12 }, (_, i) => {
      const monthEvents = uniqueEvents.filter(e => {
        const month = getMonth(parseISO(e.date));
        return month === i;
      });
      return {
        label: `${i + 1}月`,
        value: monthEvents.length,
      };
    });
    const maxMonthlyValue = Math.max(...monthlyStats.map(m => m.value), 1);

    return {
      total: uniqueEvents.length,
      totalWithRepeat: events.length,
      thisWeekEvents: thisWeekScheduled.length,
      thisWeekCompleted: thisWeekScheduledCompleted,
      lastWeekEvents: lastWeekScheduled.length,
      lastWeekCompleted: lastWeekScheduledCompleted,
      completedCount,
      pendingCount,
      completionRate: uniqueEvents.length > 0 ? (completedCount / uniqueEvents.length) * 100 : 0,
      thisWeekCompletionRate: thisWeekScheduled.length > 0 ? (thisWeekScheduledCompleted / thisWeekScheduled.length) * 100 : 0,
      lastWeekCompletionRate: lastWeekScheduled.length > 0 ? (lastWeekScheduledCompleted / lastWeekScheduled.length) * 100 : 0,
      categoryStats,
      thisWeekCategoryStats,
      weeklyTrend,
      dailyStats,
      heatmapData,
      maxHeatmapValue,
      timeSlots,
      busiestTimeSlot,
      busiestDay,
      dayNames,
      urgentEvents,
      urgentCompleted,
      urgentThisWeek,
      urgentRate: uniqueEvents.length > 0 ? (urgentEvents.length / uniqueEvents.length) * 100 : 0,
      overdueEvents: overdueEvents.length,
      overdueThisWeek: overdueEvents.filter(e => {
        const eventDate = new Date(e.date);
        return isWithinInterval(eventDate, { start: weekStart, end: weekEnd });
      }).length,
      repeatGroupCount,
      monthlyStats,
      maxMonthlyValue,
      weekStart: format(weekStart, 'MM/dd'),
      weekEnd: format(weekEnd, 'MM/dd'),
    };
  }, [events]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-[480px] ios-dialog p-4 max-h-[90vh] overflow-y-auto [&>button]:!top-3 [&>button]:!right-3 [&>button]:!w-7 [&>button]:!h-7 [&>button]:!bg-white [&>button]:!hover:bg-slate-100 [&>button]:!rounded-full [&>button]:!shadow-md [&>button]:!border [&>button]:!border-slate-200">
        <div className="space-y-5">
          {/* 标题 */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-lg">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">数据统计看板</h3>
                <p className="text-xs text-slate-400">本周 {stats.weekStart} - {stats.weekEnd}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white hover:bg-slate-100 transition-colors shadow-md border border-slate-200"
            >
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 独立事件信息 */}
          <div className="text-right text-[10px] text-slate-400">
            <div>独立事件 {stats.total}</div>
            <div>原始 {stats.totalWithRepeat}</div>
          </div>

          {/* 核心指标卡片 */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-2.5 text-center border border-blue-100">
              <div className="text-xl font-bold text-blue-600">{stats.thisWeekEvents}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">本周新增</div>
              <div className={`text-[10px] mt-1 ${stats.thisWeekEvents > stats.lastWeekEvents ? 'text-green-500' : stats.thisWeekEvents < stats.lastWeekEvents ? 'text-red-500' : 'text-slate-400'}`}>
                {stats.thisWeekEvents > stats.lastWeekEvents ? '↑' : stats.thisWeekEvents < stats.lastWeekEvents ? '↓' : '-'}
                {stats.lastWeekEvents > 0 ? Math.abs(((stats.thisWeekEvents - stats.lastWeekEvents) / stats.lastWeekEvents * 100)).toFixed(0) : '0'}%
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-2.5 text-center border border-green-100">
              <div className="text-xl font-bold text-green-600">{stats.thisWeekCompleted}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">本周完成</div>
              <div className={`text-[10px] mt-1 ${stats.thisWeekCompleted > stats.lastWeekCompleted ? 'text-green-500' : stats.thisWeekCompleted < stats.lastWeekCompleted ? 'text-red-500' : 'text-slate-400'}`}>
                {stats.thisWeekCompleted > stats.lastWeekCompleted ? '↑' : stats.thisWeekCompleted < stats.lastWeekCompleted ? '↓' : '-'}
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-2.5 text-center border border-amber-100">
              <div className="text-xl font-bold text-amber-600">{stats.overdueEvents}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">逾期未完成</div>
              {stats.overdueThisWeek > 0 && (
                <div className="text-[10px] text-red-500 mt-1">本周 {stats.overdueThisWeek} 个</div>
              )}
            </div>

            <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-2.5 text-center border border-red-100">
              <div className="text-xl font-bold text-red-600">{stats.urgentThisWeek}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">紧急事件</div>
              <div className="text-[10px] text-slate-400 mt-1">
                共 {stats.urgentEvents.length}
              </div>
            </div>
          </div>

          {/* 完成率进度 */}
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-700">本周完成率</span>
              <span className="text-lg font-bold text-slate-800">{Math.min(100, Math.max(0, Math.round(stats.thisWeekCompletionRate)))}%</span>
            </div>
            <div className="h-3 bg-slate-200 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, stats.thisWeekCompletionRate))}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>上周 {Math.min(100, Math.max(0, Math.round(stats.lastWeekCompletionRate)))}%</span>
              <span>总体 {Math.min(100, Math.max(0, Math.round(stats.completionRate)))}%</span>
            </div>
          </div>

          {/* 图表区域：类别饼图（累计+本周）+ 4周趋势 */}
          <div className="space-y-3">
            {/* 类别饼图并排 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <PieChartIcon className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-xs font-medium text-slate-700">累计类别</span>
                </div>
                {stats.categoryStats.length > 0 ? (
                  <PieChart
                    data={stats.categoryStats.map(s => ({ name: s.name, value: s.value, color: s.color }))}
                    size={80}
                  />
                ) : (
                  <div className="text-xs text-slate-400 text-center py-4">暂无数据</div>
                )}
              </div>

              <div className="bg-slate-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-xs font-medium text-slate-700">本周类别</span>
                </div>
                {stats.thisWeekCategoryStats.length > 0 ? (
                  <PieChart
                    data={stats.thisWeekCategoryStats.map(s => ({ name: s.name, value: s.value, color: s.color }))}
                    size={80}
                  />
                ) : (
                  <div className="text-xs text-slate-400 text-center py-4">暂无数据</div>
                )}
              </div>
            </div>

            {/* 热力图占满宽度 */}
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-3">
                <Flame className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-medium text-slate-700">本周活动热力图</span>
                {stats.busiestTimeSlot && (
                  <span className="text-[10px] text-slate-400 ml-auto">
                    最忙 {stats.busiestTimeSlot.icon} {stats.busiestTimeSlot.name.split('(')[0]}
                  </span>
                )}
              </div>
              {stats.heatmapData.length > 0 ? (
                <Heatmap data={stats.heatmapData} maxValue={stats.maxHeatmapValue} />
              ) : (
                <div className="text-xs text-slate-400 text-center py-4">暂无数据</div>
              )}
            </div>
          </div>

          {/* 本周每日完成对比 */}
          <div className="bg-slate-50 rounded-xl p-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-700">本周每日完成情况</span>
            </div>
            <div className="flex items-end justify-between gap-1 h-20">
              {stats.dailyStats.map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col items-center justify-end h-14">
                    <div
                      className={`w-5 rounded-t-sm transition-all ${day.completed > 0 ? 'bg-green-400' : 'bg-slate-200'}`}
                      style={{ height: `${Math.max(day.total / Math.max(...stats.dailyStats.map(d => d.total), 1) * 40, day.total > 0 ? 4 : 0)}px` }}
                      title={`完成 ${day.completed}/${day.total}`}
                    />
                  </div>
                  <span className={`text-[10px] ${day.isToday ? 'font-bold text-blue-500' : 'text-slate-400'}`}>
                    {day.dayName}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 4周趋势 */}
          <div className="bg-slate-50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs font-medium text-slate-700">4周趋势</span>
            </div>
            {stats.weeklyTrend.some(w => w.total > 0) ? (
              <LineChart
                data={stats.weeklyTrend.map(w => ({ label: w.label, value: w.total }))}
                width={400}
                height={70}
              />
            ) : (
              <div className="text-xs text-slate-400 text-center py-4">暂无数据</div>
            )}
          </div>

          {/* 时间段分析 + 月度分布 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-medium text-slate-700">时间段分析</span>
              </div>
              <div className="space-y-1.5">
                {stats.timeSlots.map((slot, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-sm">{slot.icon}</span>
                    <span className="text-[10px] text-slate-500 flex-1">{slot.name}</span>
                    <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full"
                        style={{ width: `${stats.timeSlots[0].count + stats.timeSlots[1].count + stats.timeSlots[2].count > 0 ? (slot.count / (stats.timeSlots[0].count + stats.timeSlots[1].count + stats.timeSlots[2].count)) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-slate-600 w-4 text-right">{slot.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-medium text-slate-700">年度月份分布</span>
              </div>
              <div className="flex items-end justify-between gap-0.5 h-14">
                {stats.monthlyStats.map((month, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
                    <div
                      className="w-full bg-gradient-to-t from-indigo-400 to-blue-400 rounded-t-sm min-h-[2px]"
                      style={{ height: `${(month.value / stats.maxMonthlyValue) * 40}px` }}
                      title={`${month.label}: ${month.value}个`}
                    />
                    <span className="text-[8px] text-slate-400 whitespace-nowrap">{month.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 完成/未完成占比 */}
          <div className="bg-slate-50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-3">
              <PieChartIcon className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs font-medium text-slate-700">完成情况占比</span>
            </div>
            <div className="flex items-center justify-center gap-6">
              <ProgressRing value={stats.completionRate} label="完成率" />
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <span className="text-xs text-slate-600">已完成</span>
                  <span className="text-sm font-medium text-slate-700">{stats.completedCount}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-slate-300" />
                  <span className="text-xs text-slate-600">未完成</span>
                  <span className="text-sm font-medium text-slate-700">{stats.pendingCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 紧急事件详细 */}
          {stats.urgentEvents.length > 0 && (
            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-3 border border-red-100">
              <div className="flex items-center gap-1.5 mb-2">
                <Zap className="w-3.5 h-3.5 text-red-500" />
                <span className="text-xs font-medium text-red-700">紧急事件分析</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-lg font-bold text-red-600">{stats.urgentEvents.length}</div>
                  <div className="text-[10px] text-slate-500">紧急事件总数</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-green-600">{stats.urgentCompleted}</div>
                  <div className="text-[10px] text-slate-500">已完成</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-amber-600">{stats.urgentEvents.length - stats.urgentCompleted}</div>
                  <div className="text-[10px] text-slate-500">未完成</div>
                </div>
              </div>
              <div className="mt-2 text-[10px] text-slate-500 text-center">
                占比 {Math.min(100, Math.max(0, stats.urgentRate)).toFixed(1)}% · 本周新增 {stats.urgentThisWeek} 个
              </div>
            </div>
          )}

          {/* 底部信息 */}
          <div className="text-center space-y-1 pt-2 border-t border-slate-200">
            {stats.repeatGroupCount > 0 && (
              <div className="text-[10px] text-slate-400">
                {stats.repeatGroupCount} 个重复事件系列（已剔除重复）
              </div>
            )}
            <div className="text-[10px] text-slate-400">
              共 {stats.total} 个独立事件 · 数据更新时间 {format(new Date(), 'HH:mm')}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
