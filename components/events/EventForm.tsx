'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { format, addDays, addMonths, parseISO, getDay, getDate, getMonth, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getWeek } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TimePicker } from '@/components/ui/time-picker';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { CalendarEvent, EventColor, NewEvent, CATEGORY_OPTIONS, CATEGORY_COLORS, RepeatType } from '@/types/event';
import { parseChineseDateTime, formatParsedResult, isValidParsedResult } from '@/lib/nlpParser';
import { Sparkles, ChevronDown, ChevronUp, Calendar, Repeat, X, StickyNote } from 'lucide-react';
import { COLOR_CATEGORY_MAP } from '@/lib/constants';
import { useStickyNotes } from '@/context/StickyNoteContext';
import { toast } from 'sonner';

// 单一事件转重复的特殊提交类型
interface ConvertToRepeatSubmit {
  type: 'convert_to_repeat';
  events: NewEvent[];
  originalEventId: string;
}

interface EventFormProps {
  initialDate?: Date;
  initialHour?: number;
  initialEvent?: CalendarEvent;
  onSubmit: (event: NewEvent | CalendarEvent | NewEvent[] | ConvertToRepeatSubmit) => void;
  onCancel: () => void;
  onDelete?: () => void;
  defaultUseSmartInput?: boolean;
  defaultDuration?: number;
}

const REMINDER_OPTIONS = [
  { value: 0, label: '开始时提醒' },
  { value: 5, label: '5 分钟前' },
  { value: 10, label: '10 分钟前' },
  { value: 15, label: '15 分钟前' },
  { value: 30, label: '30 分钟前' },
  { value: 60, label: '1 小时前' },
];

// 生成时间选项：08:00 - 22:00，每30分钟一格
const TIME_OPTIONS = [];
for (let hour = 8; hour <= 22; hour++) {
  TIME_OPTIONS.push({ value: `${hour.toString().padStart(2, '0')}:00`, label: `${hour.toString().padStart(2, '0')}:00` });
  if (hour < 22) {
    TIME_OPTIONS.push({ value: `${hour.toString().padStart(2, '0')}:30`, label: `${hour.toString().padStart(2, '0')}:30` });
  }
}

export function EventForm({
  initialDate,
  initialHour = 9,
  initialEvent,
  onSubmit,
  onCancel,
  onDelete,
  defaultUseSmartInput = false,
  defaultDuration = 30,
}: EventFormProps) {
  const [useSmartInput, setUseSmartInput] = useState(defaultUseSmartInput);
  const [smartInput, setSmartInput] = useState('');
  const [smartPreview, setSmartPreview] = useState<string | null>(null);
  const [pendingEvent, setPendingEvent] = useState<NewEvent | null>(null);
  const [showPastTimeDialog, setShowPastTimeDialog] = useState(false);
  const [pastTimeInfo, setPastTimeInfo] = useState<{ today: string; tomorrow: string } | null>(null);

  const [title, setTitle] = useState(initialEvent?.title || '');
  const [description, setDescription] = useState(initialEvent?.description || '');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const smartInputRef = useRef<HTMLInputElement>(null);

  // 便签功能
  const { addNote } = useStickyNotes();

  // 自动聚焦到输入框
  useEffect(() => {
    if (useSmartInput && smartInputRef.current) {
      smartInputRef.current.focus();
    } else if (!initialEvent && !useSmartInput && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [initialEvent, useSmartInput]);

  const [date, setDate] = useState(
    initialEvent?.date || (initialDate ? format(initialDate, 'yyyy-MM-dd') : '')
  );
  const initialStartTime = initialEvent?.startTime || `${initialHour.toString().padStart(2, '0')}:00`;
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(
    initialEvent?.endTime || (() => {
      // 默认结束时间是开始时间 + defaultDuration分钟
      const [h, m] = initialStartTime.split(':').map(Number);
      let newM = m + defaultDuration;
      let newH = h;
      if (newM >= 60) {
        newM -= 60;
        newH += 1;
      }
      if (newH > 22) newH = 22;
      return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
    })()
  );
  const [endTimeManuallySet, setEndTimeManuallySet] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(
    initialEvent?.reminderEnabled || hasReminderFromInitial()
  );
  const [reminderMinutes, setReminderMinutes] = useState(
    initialEvent?.reminderMinutes ?? 0
  );
  const [category, setCategory] = useState<string>(initialEvent?.category || '售前');
  const [isUrgent, setIsUrgent] = useState(initialEvent?.isUrgent || false);
  const [repeatEnabled, setRepeatEnabled] = useState(!!initialEvent?.repeatType && initialEvent.repeatType !== 'none');
  const [repeatType, setRepeatType] = useState<RepeatType>(initialEvent?.repeatType || 'none');
  const [repeatEndDate, setRepeatEndDate] = useState(initialEvent?.repeatEndDate || '');
  // 每周重复选中的星期几 (0=周日, 1=周一, ..., 6=周六)
  const [weeklyDays, setWeeklyDays] = useState<number[]>([]);
  // 每月重复的日期
  const [monthlyDay, setMonthlyDay] = useState<number>(1);

  // 从 repeatType 推断 repeatEnabled
  useEffect(() => {
    if (initialEvent?.repeatType && initialEvent.repeatType !== 'none') {
      setRepeatEnabled(true);
      setRepeatType(initialEvent.repeatType);
      // 解析 repeatDays bitmask 到 weeklyDays 数组
      if (initialEvent.repeatDays) {
        const days: number[] = [];
        for (let i = 0; i < 7; i++) {
          if (initialEvent.repeatDays & (1 << i)) {
            days.push(i);
          }
        }
        setWeeklyDays(days);
      }
      // 设置每月重复的日期
      if (initialEvent.repeatDayOfMonth) {
        setMonthlyDay(initialEvent.repeatDayOfMonth);
      }
    }
  }, [initialEvent]);

  // 当 repeatEnabled 变为 true 且 repeatType 是 none 时，默认设置为每日
  useEffect(() => {
    if (repeatEnabled && repeatType === 'none') {
      setRepeatType('daily');
    }
  }, [repeatEnabled, repeatType]);

  // 生成重复事件的辅助函数
  const generateRepeatInstances = useCallback((baseEvent: NewEvent, endDate?: string): CalendarEvent[] => {
    if (repeatType === 'none' || !repeatEnabled) return [];

    const events: CalendarEvent[] = [];
    // 使用 baseEvent 中的 repeatId，确保所有重复事件共享同一个 repeatId
    const repeatId = baseEvent.repeatId || crypto.randomUUID();
    const startDate = parseISO(baseEvent.date);
    const end = endDate ? parseISO(endDate) : addMonths(startDate, 3); // 默认3个月

    let currentDate = startDate;
    const maxInstances = 365; // 最多生成365个实例
    let instanceCount = 0;

    while (currentDate <= end && instanceCount < maxInstances) {
      const dayOfWeek = getDay(currentDate); // 0=周日, 6=周六
      let shouldCreate = false;

      switch (repeatType) {
        case 'daily':
          shouldCreate = true;
          break;
        case 'weekly':
          // 每周重复：按选择的星期几
          shouldCreate = weeklyDays.length === 0 || weeklyDays.includes(dayOfWeek);
          break;
        case 'monthly':
          // 每月重复：按选择的日期
          shouldCreate = getDate(currentDate) === monthlyDay;
          break;
        case 'yearly':
          // 每年重复：同月同日
          shouldCreate = getDate(currentDate) === getDate(startDate) && getMonth(currentDate) === getMonth(startDate);
          break;
      }

      if (shouldCreate && !isSameDay(currentDate, startDate)) {
        events.push({
          ...baseEvent,
          id: crypto.randomUUID(),
          date: format(currentDate, 'yyyy-MM-dd'),
          repeatId,
          createdAt: new Date().toISOString(),
        } as CalendarEvent);
        instanceCount++;
      }

      // 日期递增
      switch (repeatType) {
        case 'daily':
          currentDate = addDays(currentDate, 1);
          break;
        case 'weekly':
        case 'monthly':
          currentDate = addDays(currentDate, 1);
          break;
        case 'yearly':
          currentDate = addMonths(currentDate, 1);
          break;
      }
    }

    return events;
  }, [repeatType, repeatEnabled, weeklyDays, monthlyDay]);

  // 比较两个时间，返回 -1 (t1<t2), 0 (t1==t2), 1 (t1>t2)
  const compareTimes = (t1: string, t2: string): number => {
    const [h1, m1] = t1.split(':').map(Number);
    const [h2, m2] = t2.split(':').map(Number);
    if (h1 !== h2) return h1 - h2;
    return m1 - m2;
  };

  // 给定时间加上指定分钟数，返回新时间字符串
  const addMinutes = (time: string, minutesToAdd: number): string => {
    const [h, m] = time.split(':').map(Number);
    let totalM = h * 60 + m + minutesToAdd;
    if (totalM < 0) totalM += 24 * 60; // 处理跨天（假设在同一天内）
    if (totalM >= 24 * 60) totalM -= 24 * 60;
    const newH = Math.floor(totalM / 60);
    const newM = totalM % 60;
    return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
  };

  // 计算默认结束时间（开始时间 + defaultDuration分钟）
  const getDefaultEndTime = (start: string): string => {
    const [h, m] = start.split(':').map(Number);
    let newM = m + defaultDuration;
    let newH = h;
    if (newM >= 60) {
      newM -= 60;
      newH += 1;
    }
    if (newH > 22) newH = 22;
    return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
  };

  // 处理开始时间变化
  const handleStartTimeChange = (newStartTime: string) => {
    setStartTime(newStartTime);
    // 如果新开始时间晚于或等于结束时间，自动调整结束时间
    if (compareTimes(newStartTime, endTime) >= 0) {
      setEndTime(addMinutes(newStartTime, 5));
      setEndTimeManuallySet(false);
    } else if (!endTimeManuallySet) {
      setEndTime(getDefaultEndTime(newStartTime));
    }
  };

  // 处理结束时间变化
  const handleEndTimeChange = (newEndTime: string) => {
    setEndTime(newEndTime);
    setEndTimeManuallySet(true);
    // 如果新结束时间早于或等于开始时间，自动调整开始时间
    if (compareTimes(newEndTime, startTime) <= 0) {
      setStartTime(addMinutes(newEndTime, -5));
      setEndTimeManuallySet(false);
    }
  };

  function hasReminderFromInitial(): boolean {
    if (!initialEvent) return false;
    if (initialEvent.reminderEnabled) return true;
    // 检查标题或初始输入是否包含提醒相关词汇
    const fullText = `${initialEvent.title}`.toLowerCase();
    return fullText.includes('提醒') || fullText.includes('通知');
  }

  // 处理智能输入的解析
  useEffect(() => {
    if (useSmartInput && smartInput.trim()) {
      const result = parseChineseDateTime(smartInput);
      if (isValidParsedResult(result)) {
        setSmartPreview(formatParsedResult(result));
        // 自动填充表单
        setTitle(result.title);
        setDate(format(result.date, 'yyyy-MM-dd'));
        setStartTime(format(result.date, 'HH:mm'));
        // 设置半小时后的结束时间
        const endDate = new Date(result.date.getTime() + result.duration * 60 * 1000);
        setEndTime(format(endDate, 'HH:mm'));
        setEndTimeManuallySet(false);
        // 不自动设置提醒，由用户决定
        // setReminderEnabled(result.hasReminder);
        // if (result.hasReminder) {
        //   setReminderMinutes(0);
        // }
      } else {
        setSmartPreview(null);
      }
    } else {
      setSmartPreview(null);
    }
  }, [smartInput, useSmartInput]);

  const handleSmartSubmit = () => {
    if (!smartInput.trim()) return;
    const result = parseChineseDateTime(smartInput);
    if (!isValidParsedResult(result)) return;

    const endDate = new Date(result.date.getTime() + result.duration * 60 * 1000);
    const smartCategory = result.category || '会议';
    const eventData: NewEvent = {
      title: result.title,
      description: '',
      date: format(result.date, 'yyyy-MM-dd'),
      startTime: format(result.date, 'HH:mm'),
      endTime: format(endDate, 'HH:mm'),
      reminderEnabled, // 使用用户设置的提醒选项
      reminderMinutes: reminderEnabled ? 0 : 0, // 开始时提醒
      isUrgent: result.isUrgent,
      category: smartCategory,
      color: result.isUrgent ? 'blue' : CATEGORY_COLORS[smartCategory],
      completed: false,
      repeatType: 'none',
    };

    // 如果时间已过，显示确认对话框
    if (result.isPast) {
      const todayTime = format(result.date, 'HH:mm');
      const tomorrowDate = addDays(result.date, 1);
      const tomorrowTime = format(tomorrowDate, 'HH:mm');
      setPastTimeInfo({
        today: todayTime,
        tomorrow: tomorrowTime,
      });
      setPendingEvent(eventData);
      setShowPastTimeDialog(true);
    } else {
      onSubmit(eventData);
    }
  };

  const handleConfirmPastTime = (useTomorrow: boolean) => {
    if (!pendingEvent) return;

    if (useTomorrow) {
      const tomorrowDate = addDays(new Date(pendingEvent.date), 1);
      const tomorrowDateStr = format(tomorrowDate, 'yyyy-MM-dd');
      onSubmit({ ...pendingEvent, date: tomorrowDateStr });
    } else {
      onSubmit(pendingEvent);
    }

    setShowPastTimeDialog(false);
    setPendingEvent(null);
    setPastTimeInfo(null);
  };

  // 添加到便签
  const handleAddToStickyNote = () => {
    if (!title.trim()) {
      toast.error('请先输入标题');
      return;
    }

    const noteColor = isUrgent ? 'blue' : CATEGORY_COLORS[category];
    const noteCompleted = initialEvent?.completed || false;

    addNote({
      title: title.trim(),
      content: description || `${initialEvent?.date || date} ${initialEvent?.startTime || startTime} - ${initialEvent?.endTime || endTime}\n分类: ${category}`,
      color: noteColor,
      isUrgent: isUrgent,
      completed: noteCompleted,
    });
    toast.success('已添加到便签');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !date) {
      return;
    }

    // 验证时间
    if (!startTime || !endTime) {
      return;
    }

    // 验证重复事件必须有结束日期
    if (repeatEnabled && !repeatEndDate) {
      return;
    }

    // 生成 repeatId
    const repeatId = repeatEnabled && repeatType !== 'none' ? crypto.randomUUID() : undefined;

    if (initialEvent) {
      // 如果是从单一事件开启重复，需要生成多个实例
      if (repeatEnabled && !initialEvent.repeatId) {
        // 生成新的 repeatId
        const newRepeatId = crypto.randomUUID();
        const eventData: NewEvent = {
          title: title.trim(),
          description: description.trim(),
          date,
          startTime,
          endTime,
          reminderEnabled,
          reminderMinutes,
          isUrgent,
          category,
          color: isUrgent ? 'blue' : CATEGORY_COLORS[category],
          completed: initialEvent.completed,
          repeatType: repeatType,
          repeatEndDate: repeatEndDate,
          repeatId: newRepeatId,
        };
        // 生成重复事件实例
        const repeatInstances = generateRepeatInstances(eventData, repeatEndDate);
        // 标记为"单一事件转重复"，传入原始事件ID
        const submitData: ConvertToRepeatSubmit = {
          type: 'convert_to_repeat',
          events: [eventData, ...repeatInstances],
          originalEventId: initialEvent.id,
        };
        onSubmit(submitData);
      } else {
        // 保持原有的重复事件更新逻辑
        const eventData: CalendarEvent = {
          id: initialEvent.id,
          title: title.trim(),
          description: description.trim(),
          date,
          startTime,
          endTime,
          reminderEnabled,
          reminderMinutes,
          isUrgent,
          category,
          color: isUrgent ? 'blue' : CATEGORY_COLORS[category],
          completed: initialEvent.completed,
          createdAt: initialEvent.createdAt,
          repeatType: repeatEnabled ? repeatType : 'none',
          repeatEndDate: repeatEnabled ? repeatEndDate : undefined,
          repeatId: initialEvent.repeatId, // 保持原有的 repeatId
          repeatDays: repeatEnabled ? weeklyDays.reduce((acc, day) => acc | (1 << day), 0) : undefined,
          repeatDayOfMonth: repeatEnabled && repeatType === 'monthly' ? monthlyDay : undefined,
        };
        onSubmit(eventData);
      }
    } else {
      // Creating new event
      const eventData: NewEvent = {
        title: title.trim(),
        description: description.trim(),
        date,
        startTime,
        endTime,
        reminderEnabled,
        reminderMinutes,
        isUrgent,
        category,
        color: isUrgent ? 'blue' : CATEGORY_COLORS[category],
        completed: false,
        repeatType: repeatEnabled ? repeatType : 'none',
        repeatEndDate: repeatEnabled ? repeatEndDate : undefined,
        repeatId,
        repeatDays: repeatEnabled ? weeklyDays.reduce((acc, day) => acc | (1 << day), 0) : undefined,
        repeatDayOfMonth: repeatEnabled && repeatType === 'monthly' ? monthlyDay : undefined,
      };
      // 生成重复事件实例
      const repeatInstances = repeatEnabled ? generateRepeatInstances(eventData, repeatEndDate) : [];
      onSubmit([eventData, ...repeatInstances]);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* 模式切换 */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
        <div className="flex items-center gap-2">
          <Sparkles className={`w-4 h-4 ${useSmartInput ? 'text-indigo-500' : 'text-slate-400'}`} />
          <span className={`text-sm font-medium ${useSmartInput ? 'text-indigo-600' : 'text-slate-500'}`}>
            {useSmartInput ? '智能输入模式' : '普通输入模式'}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setUseSmartInput(!useSmartInput)}
          className="text-xs text-indigo-500 hover:text-indigo-600 hover:bg-indigo-100"
        >
          {useSmartInput ? '切换普通模式' : '切换智能模式'}
          {useSmartInput ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
        </Button>
      </div>

      {useSmartInput ? (
        /* 智能输入模式 */
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-slate-700 font-medium text-sm">智能创建</Label>
<input
              ref={smartInputRef}
              type="text"
              value={smartInput}
              onChange={(e) => setSmartInput(e.target.value)}
              placeholder='例如：明天下午两点提醒我开会'
              className="h-8 w-full min-w-0 rounded-lg border border-indigo-200 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 px-2.5 py-1 text-sm transition-colors outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
            />
            {smartPreview && (
              <div className="flex items-center gap-2 p-2 bg-indigo-50 rounded-lg border border-indigo-100">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-xs text-indigo-600">{smartPreview}</span>
              </div>
            )}
            <p className="text-xs text-slate-400">
              支持：明天/后天、下周、星期X、上午/下午/晚上、X点X分等
            </p>
          </div>

          {/* 紧急事件开关 */}
          <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Label className="text-slate-700 font-medium text-sm">紧急事件</Label>
            </div>
            <Switch
              checked={isUrgent}
              onCheckedChange={setIsUrgent}
              className="data-[checked]:bg-rose-500 scale-90"
            />
          </div>

          {/* 提醒开关 */}
          <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Label className="text-slate-700 font-medium text-sm">提醒</Label>
            </div>
            <Switch
              checked={reminderEnabled}
              onCheckedChange={setReminderEnabled}
              className="data-[checked]:bg-blue-500 scale-90"
            />
          </div>

          {/* 事件类别 */}
          <div className="space-y-1.5">
            <Label className="text-slate-700 font-medium text-sm">事件类别</Label>
            <div className="flex gap-1.5">
              {CATEGORY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setCategory(option.value)}
                  className={`px-2 py-0.5 rounded-full ${COLOR_CATEGORY_MAP[option.color].bg} text-white text-xs font-medium transition-all ${
                    category === option.value
                      ? 'ring-2 ring-offset-1 ring-slate-400'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleSmartSubmit}
              disabled={!smartPreview}
              className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg h-8"
            >
              <Sparkles className="w-4 h-4 mr-1" />
              智能创建
            </Button>
          </div>
        </div>
      ) : (
        /* 普通输入模式 */
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-slate-700 font-medium text-sm">事件标题</Label>
              <Input
                ref={titleInputRef}
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="输入事件标题"
                className="border-slate-200 focus:border-blue-400 h-9"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date" className="text-slate-700 font-medium text-sm">日期</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border-slate-200 focus:border-blue-400 h-9"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-slate-700 font-medium text-sm">事件内容</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="输入事件内容（可选）"
              className="w-full min-h-[50px] px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400 resize-none"
            />
          </div>

          {/* 提醒 + 紧急事件 + 重复 放一行 */}
          <div className="grid grid-cols-3 gap-2">
            <div className="flex items-center justify-between py-2 px-2 bg-slate-50 rounded-lg">
              <Label htmlFor="reminder" className="text-slate-700 font-medium text-xs">提醒</Label>
              <Switch
                id="reminder"
                checked={reminderEnabled}
                onCheckedChange={setReminderEnabled}
                className="data-[checked]:bg-blue-500 scale-90"
              />
            </div>

            <div className="flex items-center justify-between py-2 px-2 bg-slate-50 rounded-lg">
              <Label className="text-slate-700 font-medium text-xs">紧急</Label>
              <Switch
                checked={isUrgent}
                onCheckedChange={setIsUrgent}
                className="data-[checked]:bg-rose-500 scale-90"
              />
            </div>

            <div className="flex items-center justify-between py-2 px-2 bg-slate-50 rounded-lg">
              <Label htmlFor="repeat" className="text-slate-700 font-medium text-xs">重复</Label>
              <Switch
                id="repeat"
                checked={repeatEnabled}
                onCheckedChange={setRepeatEnabled}
                className="data-[checked]:bg-purple-500 scale-90"
              />
            </div>
          </div>

          {/* 重复设置 - 如果开启 */}
          {repeatEnabled && (
            <div className="space-y-2 p-3 bg-purple-50 rounded-xl border border-purple-100">
              <div className="flex items-center gap-2 mb-2">
                <Repeat className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium text-purple-600">重复设置</span>
              </div>

              {/* 重复类型选择 */}
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setRepeatType('daily')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                    repeatType === 'daily'
                      ? 'bg-purple-500 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-purple-50'
                  }`}
                >
                  每日
                </button>
                <button
                  type="button"
                  onClick={() => setRepeatType('weekly')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                    repeatType === 'weekly'
                      ? 'bg-purple-500 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-purple-50'
                  }`}
                >
                  每周
                </button>
                <button
                  type="button"
                  onClick={() => setRepeatType('monthly')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                    repeatType === 'monthly'
                      ? 'bg-purple-500 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-purple-50'
                  }`}
                >
                  每月
                </button>
                <button
                  type="button"
                  onClick={() => setRepeatType('yearly')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                    repeatType === 'yearly'
                      ? 'bg-purple-500 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-purple-50'
                  }`}
                >
                  每年
                </button>
              </div>

              {/* 每周重复：选择星期几 */}
              {repeatType === 'weekly' && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">选择星期</Label>
                  <div className="flex gap-1">
                    {['日', '一', '二', '三', '四', '五', '六'].map((day, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          setWeeklyDays(prev =>
                            prev.includes(index)
                              ? prev.filter(d => d !== index)
                              : [...prev, index]
                          );
                        }}
                        className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${
                          weeklyDays.includes(index)
                            ? 'bg-purple-500 text-white'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-purple-50'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 每月重复：选择日期 */}
              {repeatType === 'monthly' && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">选择日期</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={monthlyDay}
                      onChange={(e) => setMonthlyDay(Number(e.target.value))}
                      className="w-20 h-8 border-slate-200"
                    />
                    <span className="text-xs text-slate-500">日</span>
                  </div>
                </div>
              )}

              {/* 重复结束日期 */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">重复结束日期（必填）</Label>
                <Input
                  type="date"
                  value={repeatEndDate}
                  onChange={(e) => setRepeatEndDate(e.target.value)}
                  className="h-8 border-slate-200"
                  required
                />
              </div>
            </div>
          )}

          {/* 时间选择 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-slate-700 font-medium text-xs">开始时间</Label>
              <TimePicker value={startTime} onChange={handleStartTimeChange} />
            </div>

            <div className="space-y-1">
              <Label className="text-slate-700 font-medium text-xs">结束时间</Label>
              <TimePicker value={endTime} onChange={handleEndTimeChange} />
            </div>
          </div>

          {/* 提醒时间 - 如果开启 */}
          {reminderEnabled && (
            <div className="space-y-1.5">
              <Label className="text-slate-700 font-medium text-xs">提前提醒时间</Label>
              <Select
                value={reminderMinutes.toString()}
                onValueChange={(v) => setReminderMinutes(Number(v))}
              >
                <SelectTrigger className="border-slate-200 focus:border-blue-400 h-8 text-sm">
                  <SelectValue placeholder="选择提前提醒时间" />
                </SelectTrigger>
                <SelectContent>
                  {REMINDER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 事件类别 */}
          <div className="space-y-1.5">
            <Label className="text-slate-700 font-medium text-sm">事件类别</Label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setCategory(option.value)}
                  className={`px-2 py-1 rounded-full ${COLOR_CATEGORY_MAP[option.color].bg} text-white text-xs font-medium transition-all ${
                    category === option.value
                      ? 'ring-2 ring-offset-2 ring-slate-400'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="flex justify-between items-center pt-3 border-t border-slate-100">
        <div>
          {initialEvent && onDelete && (
            <Button type="button" variant="destructive" onClick={onDelete} className="bg-rose-500 hover:bg-rose-600 text-white h-8">
              删除
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {initialEvent && (
            <Button type="button" onClick={handleAddToStickyNote} variant="outline" className="border-amber-200 text-amber-600 hover:bg-amber-50 h-8">
              <StickyNote className="w-4 h-4 mr-1" />
              添加到便签
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onCancel} className="border-slate-200 text-slate-600 hover:bg-slate-50 h-8">
            取消
          </Button>
          {!useSmartInput && (
            <Button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white h-8">
              {initialEvent ? '保存' : '创建'}
            </Button>
          )}
        </div>
      </div>

      {/* 时间已过确认对话框 */}
      <Dialog open={showPastTimeDialog} onOpenChange={setShowPastTimeDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>时间已过</DialogTitle>
            <DialogDescription>
              今天 {pastTimeInfo?.today} 已过，请选择：
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button onClick={() => handleConfirmPastTime(false)} className="w-full">
              继续创建在今天
            </Button>
            <Button onClick={() => handleConfirmPastTime(true)} variant="default" className="w-full bg-indigo-500 hover:bg-indigo-600">
              改到明天 {pastTimeInfo?.tomorrow}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
