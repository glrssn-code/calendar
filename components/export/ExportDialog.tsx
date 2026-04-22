'use client';

import { useState, useMemo, useEffect } from 'react';
import { Download, Calendar, Filter, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CATEGORIES } from '@/types/event';
import { CalendarEvent } from '@/types/event';
import { startOfWeek, endOfWeek, addWeeks, subWeeks, format } from 'date-fns';

// 获取本周的开始和结束日期
const getWeekRange = (date: Date = new Date()) => {
  const start = startOfWeek(date, { weekStartsOn: 0 });
  const end = endOfWeek(date, { weekStartsOn: 0 });
  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd'),
  };
};

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  events: CalendarEvent[];
  onExport: (filteredEvents: CalendarEvent[]) => void;
  exportType?: 'excel' | 'json';
  defaultFilename?: string;
  // 预设置状态
  initialExportMode?: 'all' | 'filtered';
  initialStartDate?: string;
  initialEndDate?: string;
  initialCategories?: Set<string>;
}

export function ExportDialog({
  isOpen,
  onClose,
  events,
  onExport,
  exportType = 'excel',
  defaultFilename,
  initialExportMode,
  initialStartDate,
  initialEndDate,
  initialCategories,
}: ExportDialogProps) {
  const [exportMode, setExportMode] = useState<'all' | 'filtered'>(initialExportMode || 'filtered');
  const [startDate, setStartDate] = useState(initialStartDate || '');
  const [endDate, setEndDate] = useState(initialEndDate || '');
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(initialCategories || new Set(CATEGORIES));
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0); // 0=本周, -1=上周, 1=下周

  // 初始化默认时间范围（本周）
  useEffect(() => {
    if (isOpen) {
      if (initialStartDate && initialEndDate) {
        setStartDate(initialStartDate);
        setEndDate(initialEndDate);
      } else {
        const weekRange = getWeekRange();
        setStartDate(weekRange.start);
        setEndDate(weekRange.end);
      }
      setCurrentWeekOffset(0);
    }
  }, [isOpen, initialStartDate, initialEndDate]);

  // 周导航
  const goToPreviousWeek = () => {
    const newOffset = currentWeekOffset - 1;
    setCurrentWeekOffset(newOffset);
    const date = addWeeks(new Date(), newOffset);
    const weekRange = getWeekRange(date);
    setStartDate(weekRange.start);
    setEndDate(weekRange.end);
  };

  const goToNextWeek = () => {
    const newOffset = currentWeekOffset + 1;
    setCurrentWeekOffset(newOffset);
    const date = addWeeks(new Date(), newOffset);
    const weekRange = getWeekRange(date);
    setStartDate(weekRange.start);
    setEndDate(weekRange.end);
  };

  const goToThisWeek = () => {
    setCurrentWeekOffset(0);
    const weekRange = getWeekRange();
    setStartDate(weekRange.start);
    setEndDate(weekRange.end);
  };

  // 处理手动日期修改（同时清除周偏移）
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
    setCurrentWeekOffset(-999); // 标记为手动选择
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
    setCurrentWeekOffset(-999); // 标记为手动选择
  };

  // 切换类别选择
  const toggleCategory = (category: string) => {
    const newSet = new Set(selectedCategories);
    if (newSet.has(category)) {
      newSet.delete(category);
    } else {
      newSet.add(category);
    }
    setSelectedCategories(newSet);
  };

  // 全选/取消全选类别
  const toggleAllCategories = () => {
    if (selectedCategories.size === CATEGORIES.length) {
      setSelectedCategories(new Set());
    } else {
      setSelectedCategories(new Set(CATEGORIES));
    }
  };

  // 过滤事件
  const filteredEvents = useMemo(() => {
    if (exportMode === 'all') {
      return events;
    }

    return events.filter(event => {
      // 日期范围过滤
      if (startDate && event.date < startDate) return false;
      if (endDate && event.date > endDate) return false;
      // 类别过滤
      if (!selectedCategories.has(event.category)) return false;
      return true;
    });
  }, [events, exportMode, startDate, endDate, selectedCategories]);

  const handleExport = () => {
    onExport(filteredEvents);
    onClose();
  };

  // 重置过滤条件
  const resetFilters = () => {
    const weekRange = getWeekRange();
    setStartDate(weekRange.start);
    setEndDate(weekRange.end);
    setSelectedCategories(new Set(CATEGORIES));
    setCurrentWeekOffset(0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-cyan-600" />
            导出{exportType === 'json' ? 'JSON' : 'Excel'}
          </DialogTitle>
          <DialogDescription>
            选择导出范围和条件，预览将显示符合条件的事件数量
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* 导出模式 */}
          <div className="space-y-2">
            <Label className="text-slate-700 font-medium">导出范围</Label>
            <div className="flex gap-2">
              <button
                onClick={() => setExportMode('all')}
                className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  exportMode === 'all'
                    ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                导出全部
              </button>
              <button
                onClick={() => setExportMode('filtered')}
                className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  exportMode === 'filtered'
                    ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                条件导出
              </button>
            </div>
          </div>

          {/* 条件导出选项 */}
          {exportMode === 'filtered' && (
            <>
              {/* 时间范围 */}
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  时间范围
                </Label>
                {/* 周导航 */}
                <div className="flex items-center gap-2 mb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousWeek}
                    className="h-8 px-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={currentWeekOffset === 0 ? 'default' : 'outline'}
                    size="sm"
                    onClick={goToThisWeek}
                    className={`h-8 px-3 ${currentWeekOffset === 0 ? 'bg-cyan-500 hover:bg-cyan-600' : ''}`}
                  >
                    本周
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextWeek}
                    className="h-8 px-2"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  {currentWeekOffset !== 0 && (
                    <span className="text-xs text-slate-400 ml-2">
                      {currentWeekOffset < 0 ? `上周 + ${Math.abs(currentWeekOffset)}` : `下周 + ${currentWeekOffset}`}
                    </span>
                  )}
                </div>
                {/* 日期选择 */}
                <div className="flex gap-2 items-center">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={handleStartDateChange}
                    placeholder="开始日期"
                    className="flex-1"
                  />
                  <span className="text-slate-400">至</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={handleEndDateChange}
                    placeholder="结束日期"
                    className="flex-1"
                  />
                </div>
              </div>

              {/* 类别选择 */}
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium flex items-center gap-1">
                  <Filter className="w-4 h-4" />
                  事件类别
                </Label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={toggleAllCategories}
                    className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                      selectedCategories.size === CATEGORIES.length
                        ? 'bg-cyan-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {selectedCategories.size === CATEGORIES.length ? '取消全选' : '全选'}
                  </button>
                  {CATEGORIES.map((category) => (
                    <button
                      key={category}
                      onClick={() => toggleCategory(category)}
                      className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                        selectedCategories.has(category)
                          ? 'bg-cyan-500 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {selectedCategories.has(category) && <Check className="w-3 h-3" />}
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* 预览信息 */}
          <div className="p-3 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border border-cyan-100">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">符合条件的事件</span>
              <span className="text-lg font-bold text-cyan-600">
                {filteredEvents.length}
                <span className="text-sm font-normal text-slate-400 ml-1">/ {events.length}</span>
              </span>
            </div>
            {exportMode === 'filtered' && (
              <div className="mt-2 pt-2 border-t border-cyan-100">
                <div className="text-xs text-slate-500">
                  {startDate && endDate && (
                    <span>
                      {currentWeekOffset === 0 ? '本周' : currentWeekOffset < 0 ? `第 ${Math.abs(currentWeekOffset)} 周` : `+${currentWeekOffset} 周`}：{startDate} ~ {endDate}
                    </span>
                  )}
                  {startDate && !endDate && <span>从 {startDate} 开始</span>}
                  {!startDate && endDate && <span>至 {endDate} 结束</span>}
                  {!startDate && !endDate && <span>所有日期</span>}
                  {selectedCategories.size > 0 && selectedCategories.size < CATEGORIES.length && (
                    <span className="block mt-1">
                      类别：{Array.from(selectedCategories).join('、')}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {exportMode === 'filtered' && (
            <Button variant="outline" onClick={resetFilters} className="w-full">
              重置条件
            </Button>
          )}
          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={onClose} className="flex-1">
              取消
            </Button>
            <Button
              onClick={handleExport}
              disabled={filteredEvents.length === 0}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
            >
              <Download className="w-4 h-4 mr-1" />
              导出 {filteredEvents.length} 条
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}