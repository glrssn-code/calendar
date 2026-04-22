'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isToday, addMonths, subMonths } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { LifeCalendarProvider, useLifeCalendar } from '@/context/LifeCalendarContext';
import { LifeDiary, LifeNote } from '@/lib/lifeStorage';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, StickyNote, Trash2, Download, Upload, Calendar } from 'lucide-react';
import Link from 'next/link';
import { exportLifeCalendarData, importLifeCalendarData, clearLifeCalendarData, getLifeStorageInfo } from '@/lib/lifeStorage';
import { getLunarDate, getSolarTerm, formatLunarDate } from '@/lib/lunarCalendar';
import { toast } from 'sonner';

const MIN_CELL_HEIGHT = 120;

// 心情选项 - 开心橙/生气红/焦虑紫/疲惫黄/平静蓝/自由绿/失落青/难过白
const MOOD_OPTIONS = [
  { emoji: '😊', label: '开心', color: 'orange', bg: 'bg-orange-400', border: 'border-orange-500' },
  { emoji: '😠', label: '生气', color: 'red', bg: 'bg-red-400', border: 'border-red-500' },
  { emoji: '😰', label: '焦虑', color: 'purple', bg: 'bg-purple-400', border: 'border-purple-500' },
  { emoji: '😴', label: '疲惫', color: 'yellow', bg: 'bg-yellow-400', border: 'border-yellow-500' },
  { emoji: '✨', label: '平静', color: 'blue', bg: 'bg-blue-400', border: 'border-blue-500' },
  { emoji: '🌈', label: '自由', color: 'green', bg: 'bg-emerald-400', border: 'border-emerald-500' },
  { emoji: '💧', label: '失落', color: 'cyan', bg: 'bg-cyan-400', border: 'border-cyan-500' },
  { emoji: '😢', label: '难过', color: 'white', bg: 'bg-slate-300', border: 'border-slate-400' },
];
const WEATHER_OPTIONS = ['☀️ 晴天', '🌤️ 多云', '🌧️ 雨天', '❄️ 雪天', '🌙 夜晚', '⛈️ 雷雨'];

const NOTE_COLORS = [
  { name: 'yellow', bg: 'bg-amber-400', border: 'border-amber-500' },
  { name: 'green', bg: 'bg-emerald-400', border: 'border-emerald-500' },
  { name: 'blue', bg: 'bg-sky-400', border: 'border-sky-500' },
  { name: 'purple', bg: 'bg-violet-400', border: 'border-violet-500' },
  { name: 'pink', bg: 'bg-pink-400', border: 'border-pink-500' },
];

function LifeCalendarContent() {
  const { diaries, notes, addDiary, updateDiary, deleteDiary, addNote, updateNote, deleteNote, refreshData } = useLifeCalendar();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [showDiaryDialog, setShowDiaryDialog] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingDiary, setEditingDiary] = useState<LifeDiary | null>(null);
  const [editingNote, setEditingNote] = useState<LifeNote | null>(null);
  const [draggedNote, setDraggedNote] = useState<LifeNote | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  // 日记表单状态
  const [diaryContent, setDiaryContent] = useState('');
  const [diaryMood, setDiaryMood] = useState('');
  const [diaryWeather, setDiaryWeather] = useState('');

  // 便签表单状态
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteColor, setNoteColor] = useState('yellow');
  const [noteCompleted, setNoteCompleted] = useState(false);

  // 存储信息
  const [storageInfo, setStorageInfo] = useState({ diaryCount: 0, noteCount: 0, storageSize: '0 B' });
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  // 便签提示
  const [noteTooltip, setNoteTooltip] = useState<{ note: LifeNote; x: number; y: number } | null>(null);

  // 切换便签完成状态
  const handleToggleNoteComplete = async (note: LifeNote, e: React.MouseEvent) => {
    e.stopPropagation();
    await updateNote(note.id, { completed: !note.completed });
    loadStorageInfo();
  };

  useEffect(() => {
    refreshData();
    loadStorageInfo();
  }, [refreshData]);

  const loadStorageInfo = async () => {
    const info = await getLifeStorageInfo();
    setStorageInfo(info);
  };

  // 计算当前月的日历网格
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentDate]);

  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  // 按日期分组数据
  const diariesByDate = useMemo(() => {
    const map = new Map<string, LifeDiary[]>();
    diaries.forEach(diary => {
      const existing = map.get(diary.date) || [];
      map.set(diary.date, [...existing, diary]);
    });
    return map;
  }, [diaries]);

  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleGoToToday = () => {
    setCurrentDate(new Date());
  };

  const openAddDiary = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const existingDiary = diaries.find(d => d.date === dateKey);

    if (existingDiary) {
      openEditDiary(existingDiary);
      return;
    }

    setSelectedDate(dateKey);
    setEditingDiary(null);
    setDiaryContent('');
    setDiaryMood('');
    setDiaryWeather('');
    setShowDiaryDialog(true);
  };

  const openEditDiary = (diary: LifeDiary) => {
    setEditingDiary(diary);
    setSelectedDate(diary.date);
    setDiaryContent(diary.content);
    setDiaryMood(diary.mood || '');
    setDiaryWeather(diary.weather || '');
    setShowDiaryDialog(true);
  };

  const handleSaveDiary = async () => {
    if (!selectedDate || !diaryContent.trim()) return;

    if (editingDiary) {
      await updateDiary(editingDiary.id, {
        content: diaryContent,
        mood: diaryMood,
        weather: diaryWeather,
      });
      toast.success('日记已更新');
    } else {
      await addDiary({
        date: selectedDate,
        content: diaryContent,
        mood: diaryMood,
        weather: diaryWeather,
      });
      toast.success('日记已保存');
    }

    setShowDiaryDialog(false);
    loadStorageInfo();
  };

  const handleDeleteDiary = async () => {
    if (!editingDiary) return;
    await deleteDiary(editingDiary.id);
    toast.success('日记已删除');
    setShowDiaryDialog(false);
    loadStorageInfo();
  };

  const openAddNote = () => {
    setEditingNote(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteColor('yellow');
    setNoteCompleted(false);
    setShowNoteDialog(true);
  };

  const openEditNote = (note: LifeNote) => {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteColor(note.color);
    setNoteCompleted(note.completed);
    setShowNoteDialog(true);
  };

  const handleSaveNote = async () => {
    if (!noteTitle.trim()) return;

    if (editingNote) {
      await updateNote(editingNote.id, {
        title: noteTitle,
        content: noteContent,
        color: noteColor,
        completed: noteCompleted,
      });
      toast.success('便签已更新');
    } else {
      await addNote({
        title: noteTitle,
        content: noteContent,
        color: noteColor,
        isUrgent: false,
        completed: false,
      });
      toast.success('便签已创建');
    }

    setShowNoteDialog(false);
    loadStorageInfo();
  };

  const handleDeleteNote = async () => {
    if (!editingNote) return;
    await deleteNote(editingNote.id);
    toast.success('便签已删除');
    setShowNoteDialog(false);
    loadStorageInfo();
  };

  // 便签拖拽
  const handleNoteDragStart = (e: React.DragEvent, note: LifeNote) => {
    setDraggedNote(note);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleNoteDragEnd = () => {
    setDraggedNote(null);
    setDragOverDate(null);
  };

  const handleDayDragOver = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(format(date, 'yyyy-MM-dd'));
  };

  const handleDayDragLeave = () => {
    setDragOverDate(null);
  };

  const handleDayDrop = async (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    if (!draggedNote) return;

    const dateKey = format(date, 'yyyy-MM-dd');
    await updateNote(draggedNote.id, { linkedDate: dateKey });
    toast.success(`便签已关联到 ${dateKey}`);
    setDraggedNote(null);
    setDragOverDate(null);
    loadStorageInfo();
  };

  const handleUnlinkNote = async (noteId: string) => {
    await updateNote(noteId, { linkedDate: undefined });
    toast.success('便签已取消关联');
    loadStorageInfo();
  };

  // 导出
  const handleExport = () => {
    exportLifeCalendarData().then(data => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `life-calendar-${format(new Date(), 'yyyy-MM-dd')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('生活日历数据已导出');
    });
  };

  // 导入
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const data = JSON.parse(content);
      await importLifeCalendarData(data, 'merge');
      toast.success('数据已导入');
      refreshData();
      loadStorageInfo();
    } catch (error) {
      toast.error('导入失败，请检查文件格式');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearAll = async () => {
    await clearLifeCalendarData();
    toast.success('所有数据已清除');
    setShowClearDialog(false);
    refreshData();
    loadStorageInfo();
  };

  // 分离未关联和已关联的便签
  const unlinkedNotes = notes.filter(n => !n.linkedDate);
  const linkedNotes = notes.filter(n => n.linkedDate);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-amber-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="p-2 hover:bg-amber-100 rounded-xl transition-colors">
                <ArrowLeft className="w-5 h-5 text-amber-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                  生活日历
                </h1>
                <p className="text-sm text-amber-500">记录生活点滴</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleExport}
                variant="outline"
                size="sm"
                className="border-amber-200 text-amber-600 hover:bg-amber-50"
              >
                <Download className="w-4 h-4 mr-1" />
                导出
              </Button>
              <Button
                onClick={handleImport}
                variant="outline"
                size="sm"
                className="border-amber-200 text-amber-600 hover:bg-amber-50"
              >
                <Upload className="w-4 h-4 mr-1" />
                导入
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-4 py-4">
        <div className="flex gap-4">
          {/* 左侧日历 */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
            {/* 月份导航 */}
            <div className="flex items-center justify-between p-4 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50">
              <div className="flex items-center gap-4">
                <Button
                  onClick={handleGoToToday}
                  variant="outline"
                  size="sm"
                  className="border-amber-300 text-amber-600 hover:bg-amber-100"
                >
                  今天
                </Button>
                <div className="flex items-center gap-1">
                  <Button
                    onClick={handlePreviousMonth}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-amber-600 hover:bg-amber-100"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={handleNextMonth}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-amber-600 hover:bg-amber-100"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <h2 className="text-lg font-semibold text-amber-800">
                  {format(currentDate, 'yyyy年 M月', { locale: zhCN })}
                </h2>
              </div>
              <div className="text-sm text-amber-600">
                {storageInfo.diaryCount} 篇日记 · {storageInfo.noteCount} 张便签
              </div>
            </div>

            {/* 星期标题 */}
            <div className="grid grid-cols-7 border-b border-amber-100 bg-gradient-to-b from-amber-50 to-orange-50">
              {weekdays.map((day) => (
                <div
                  key={day}
                  className="py-2 text-center text-sm font-medium text-amber-700"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* 日期网格 */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, index) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayDiaries = diariesByDate.get(dateKey) || [];
                const dayNotes = notes.filter(n => n.linkedDate === dateKey);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isDayToday = isToday(day);
                const isDragOver = dragOverDate === dateKey;

                return (
                  <div
                    key={dateKey}
                    className={`border-b border-r border-amber-100 p-1 cursor-pointer transition-colors min-h-[140px] ${
                      isCurrentMonth ? 'bg-white' : 'bg-amber-50/50'
                    } ${isDragOver ? 'bg-amber-100 ring-2 ring-inset ring-amber-400' : ''}`}
                    onDragOver={(e) => handleDayDragOver(e, day)}
                    onDragLeave={handleDayDragLeave}
                    onDrop={(e) => handleDayDrop(e, day)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div
                        className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium ${
                          isDayToday
                            ? 'bg-amber-500 text-white'
                            : isCurrentMonth
                            ? 'text-amber-700'
                            : 'text-amber-400'
                        }`}
                      >
                        {format(day, 'd')}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openAddDiary(day);
                        }}
                        className="w-5 h-5 flex items-center justify-center rounded-full bg-amber-100 text-amber-600 hover:bg-amber-200 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* 农历 & 节气 */}
                    <div className="text-[10px] text-amber-500/70 space-y-0.5">
                      {(() => {
                        const lunar = getLunarDate(day);
                        const solarTerm = getSolarTerm(day);
                        return (
                          <>
                            <div className="truncate">{lunar.lunarMonth}月{lunar.lunarDay}</div>
                            {solarTerm && (
                              <div className="text-orange-500 font-medium truncate">{solarTerm}</div>
                            )}
                          </>
                        );
                      })()}
                    </div>

                    {/* 日记预览 */}
                    <div className="space-y-0.5">
                      {dayDiaries.slice(0, 3).map((diary) => {
                        const moodOption = MOOD_OPTIONS.find(m => diary.mood?.startsWith(m.emoji));
                        const moodBg = moodOption?.bg || 'bg-amber-400';
                        const moodBorder = moodOption?.border || 'border-amber-500';
                        return (
                          <div
                            key={diary.id}
                            onClick={() => openEditDiary(diary)}
                            className={`px-1 py-0.5 rounded text-[10px] ${moodBg} text-white truncate cursor-pointer hover:opacity-90 transition-opacity border-l-2 ${moodBorder} shadow-sm`}
                          >
                            <span className="mr-1">{diary.mood}</span>
                            <span className="opacity-80">{diary.content.slice(0, 20)}</span>
                          </div>
                        );
                      })}
                      {dayDiaries.length > 3 && (
                        <div className="text-[10px] text-amber-500 px-1">
                          +{dayDiaries.length - 3} 更多
                        </div>
                      )}
                    </div>

                    {/* 便签预览 */}
                    {dayNotes.length > 0 && (
                      <div className="space-y-0.5 mt-1">
                        {dayNotes.slice(0, 5).map((note) => {
                          const colorClass = NOTE_COLORS.find(c => c.name === note.color) || NOTE_COLORS[0];
                          return (
                            <div
                              key={note.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditNote(note);
                              }}
                              onMouseEnter={(e) => {
                                const rect = (e.target as HTMLElement).getBoundingClientRect();
                                setNoteTooltip({ note, x: rect.right, y: rect.top });
                              }}
                              onMouseLeave={() => setNoteTooltip(null)}
                              className={`px-1 py-0.5 rounded text-[10px] ${colorClass.bg} text-white truncate cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1 ${note.completed ? 'opacity-60' : ''}`}
                            >
                              {/* 圆点点击区域 - 切换完成状态 */}
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleNoteComplete(note, e);
                                }}
                                className="w-3 h-3 flex-shrink-0 rounded-full bg-white/30 flex items-center justify-center hover:bg-white/50 transition-colors"
                              >
                                {note.completed && '✓'}
                              </span>
                              <span className={`truncate ${note.completed ? 'line-through' : ''}`}>{note.title}</span>
                            </div>
                          );
                        })}
                        {dayNotes.length > 5 && (
                          <div className="text-[10px] text-amber-500 px-1">
                            +{dayNotes.length - 5} 更多便签
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 右侧便签区 */}
          <div className="w-96 bg-white rounded-2xl shadow-sm border border-amber-100 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <StickyNote className="w-5 h-5 text-amber-600" />
                <h3 className="font-semibold text-amber-800">便签</h3>
              </div>
              <Button
                onClick={openAddNote}
                size="sm"
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
              >
                <Plus className="w-4 h-4 mr-1" />
                新建
              </Button>
            </div>

            {/* 未关联便签 */}
            <div className="space-y-2">
              {unlinkedNotes.length > 0 && (
                <div className="text-xs text-amber-500 mb-2">未关联日期</div>
              )}
              {unlinkedNotes.map((note) => {
                const colorClass = NOTE_COLORS.find(c => c.name === note.color) || NOTE_COLORS[0];
                return (
                  <div
                    key={note.id}
                    draggable
                    onDragStart={(e) => handleNoteDragStart(e, note)}
                    onDragEnd={handleNoteDragEnd}
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditNote(note);
                    }}
                    onMouseEnter={(e) => {
                      const rect = (e.target as HTMLElement).getBoundingClientRect();
                      setNoteTooltip({ note, x: rect.right, y: rect.top });
                    }}
                    onMouseLeave={() => setNoteTooltip(null)}
                    className={`p-3 rounded-lg ${colorClass.bg} border-l-4 ${colorClass.border} cursor-pointer hover:opacity-90 transition-opacity ${note.completed ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      {/* 圆点点击区域 - 切换完成状态 */}
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleNoteComplete(note, e);
                        }}
                        className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center text-white text-xs hover:bg-white/50 transition-colors cursor-pointer"
                      >
                        {note.completed && '✓'}
                      </span>
                      <div className={`font-medium text-amber-900 text-sm ${note.completed ? 'line-through' : ''}`}>{note.title}</div>
                    </div>
                    {note.content && (
                      <div className="text-xs text-amber-700 mt-1 line-clamp-2">{note.content}</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 提示 */}
            {unlinkedNotes.length > 0 && (
              <div className="mt-4 p-3 bg-amber-50 rounded-lg text-xs text-amber-600">
                💡 拖拽便签到日历上的某天来关联
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 日记对话框 */}
      <Dialog open={showDiaryDialog} onOpenChange={setShowDiaryDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <Calendar className="w-5 h-5" />
              {editingDiary ? '编辑日记' : '写日记'} - {selectedDate}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-amber-700">心情</Label>
              <div className="flex flex-wrap gap-2">
                {MOOD_OPTIONS.map((mood) => {
                  const isSelected = diaryMood === `${mood.emoji} ${mood.label}`;
                  return (
                    <button
                      key={mood.label}
                      onClick={() => setDiaryMood(`${mood.emoji} ${mood.label}`)}
                      className={`px-2 py-1 rounded-full text-sm transition-colors ${
                        isSelected
                          ? `${mood.bg} text-white ring-2 ring-offset-1 ring-amber-400`
                          : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                      }`}
                    >
                      {mood.emoji} {mood.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-amber-700">天气</Label>
              <div className="flex flex-wrap gap-2">
                {WEATHER_OPTIONS.map((weather) => (
                  <button
                    key={weather}
                    onClick={() => setDiaryWeather(weather)}
                    className={`px-2 py-1 rounded-full text-sm transition-colors ${
                      diaryWeather === weather
                        ? 'bg-orange-500 text-white'
                        : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                    }`}
                  >
                    {weather}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-amber-700">内容</Label>
              <textarea
                value={diaryContent}
                onChange={(e) => setDiaryContent(e.target.value)}
                placeholder="今天发生了什么..."
                className="w-full h-40 p-3 rounded-lg border border-amber-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 resize-none"
              />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            {editingDiary && (
              <Button
                onClick={handleDeleteDiary}
                variant="outline"
                className="w-full border-red-200 text-red-500 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                删除
              </Button>
            )}
            <Button
              onClick={handleSaveDiary}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 便签对话框 */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <StickyNote className="w-5 h-5" />
              {editingNote ? '编辑便签' : '新建便签'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-amber-700">颜色</Label>
              <div className="flex gap-2">
                {NOTE_COLORS.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setNoteColor(color.name)}
                    className={`w-8 h-8 rounded-lg ${color.bg} ${noteColor === color.name ? 'ring-2 ring-offset-2 ring-amber-500' : ''} transition-all`}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="noteCompleted"
                checked={noteCompleted}
                onChange={(e) => setNoteCompleted(e.target.checked)}
                className="w-4 h-4 rounded border-amber-300 text-amber-500 focus:ring-amber-200"
              />
              <Label htmlFor="noteCompleted" className="text-amber-700 cursor-pointer">已完成</Label>
            </div>
            <div className="space-y-2">
              <Label className="text-amber-700">标题</Label>
              <Input
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="便签标题"
                className="border-amber-200 focus:border-amber-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-amber-700">内容</Label>
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="便签内容..."
                className="w-full h-32 p-3 rounded-lg border border-amber-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 resize-none"
              />
            </div>
            {editingNote?.linkedDate && (
              <div className="text-sm text-amber-600">
                已关联到: {editingNote.linkedDate}
                <button
                  onClick={() => {
                    if (editingNote) handleUnlinkNote(editingNote.id);
                  }}
                  className="ml-2 text-blue-500 hover:underline"
                >
                  取消关联
                </button>
              </div>
            )}
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            {editingNote && (
              <Button
                onClick={handleDeleteNote}
                variant="outline"
                className="w-full border-red-200 text-red-500 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                删除
              </Button>
            )}
            <Button
              onClick={handleSaveNote}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 清除确认对话框 */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-500">确认清除</DialogTitle>
            <DialogDescription>
              确定要清除所有生活日历数据吗？此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button variant="outline" onClick={() => setShowClearDialog(false)} className="w-full">
              取消
            </Button>
            <Button onClick={handleClearAll} className="w-full bg-red-500 hover:bg-red-600 text-white">
              确认清除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 便签悬停提示 */}
      {noteTooltip && (
        <div
          className="fixed z-[9999] bg-white rounded-lg shadow-xl border border-amber-200 p-3 max-w-xs"
          style={{
            left: noteTooltip.x + 10,
            top: noteTooltip.y,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-3 h-3 rounded ${NOTE_COLORS.find(c => c.name === noteTooltip.note.color)?.bg || 'bg-amber-400'}`} />
            <span className={`font-medium text-sm ${noteTooltip.note.completed ? 'line-through text-slate-400' : 'text-amber-800'}`}>
              {noteTooltip.note.title}
            </span>
            {noteTooltip.note.completed && (
              <span className="text-xs text-green-500">已完成</span>
            )}
          </div>
          {noteTooltip.note.content && (
            <div className="text-xs text-slate-600 whitespace-pre-wrap">
              {noteTooltip.note.content}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function LifeCalendarPage() {
  return (
    <LifeCalendarProvider>
      <LifeCalendarContent />
    </LifeCalendarProvider>
  );
}
