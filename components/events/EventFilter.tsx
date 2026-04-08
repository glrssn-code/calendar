'use client';

import { useState } from 'react';
import { Search, Filter, X, ChevronDown, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FilterCategory,
  FilterDateRange,
  FilterStatus,
} from '@/hooks/useEventFilter';

interface EventFilterProps {
  searchQuery: string;
  category: FilterCategory;
  dateRange: FilterDateRange;
  status: FilterStatus;
  showUrgentOnly: boolean;
  stats: {
    total: number;
    filtered: number;
    completed: number;
    urgent: number;
  };
  hasActiveFilters: boolean;
  onSearchChange: (query: string) => void;
  onCategoryChange: (category: FilterCategory) => void;
  onDateRangeChange: (range: FilterDateRange) => void;
  onStatusChange: (status: FilterStatus) => void;
  onUrgentChange: (show: boolean) => void;
  onReset: () => void;
}

const CATEGORY_OPTIONS: FilterCategory[] = ['全部', '售前', '项目', '会议', '管理', '推广', '其它'];
const DATE_RANGE_OPTIONS: { value: FilterDateRange; label: string }[] = [
  { value: '全部', label: '全部时间' },
  { value: '今天', label: '今天' },
  { value: '本周', label: '本周' },
  { value: '本月', label: '本月' },
  { value: '已过期', label: '已过期' },
];
const STATUS_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: '全部', label: '全部' },
  { value: '未完成', label: '未完成' },
  { value: '已完成', label: '已完成' },
];

export function EventFilter({
  searchQuery,
  category,
  dateRange,
  status,
  showUrgentOnly,
  stats,
  hasActiveFilters,
  onSearchChange,
  onCategoryChange,
  onDateRangeChange,
  onStatusChange,
  onUrgentChange,
  onReset,
}: EventFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* 搜索栏 */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="搜索事件标题或描述..."
              className="pl-9 border-slate-200 focus:border-blue-400"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full"
              >
                <X className="w-3 h-3 text-slate-400" />
              </button>
            )}
          </div>
          <Button
            variant={isExpanded ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className={isExpanded ? 'bg-blue-500 hover:bg-blue-600' : 'border-slate-200'}
          >
            <Filter className="w-4 h-4 mr-1" />
            筛选
            {hasActiveFilters && (
              <span className="ml-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </Button>
        </div>

        {/* 统计信息 */}
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span>共 {stats.total} 个事件</span>
          {hasActiveFilters && (
            <>
              <span>·</span>
              <span className="text-blue-500">显示 {stats.filtered} 个</span>
            </>
          )}
          {stats.completed > 0 && (
            <>
              <span>·</span>
              <span>{stats.completed} 已完成</span>
            </>
          )}
          {stats.urgent > 0 && (
            <>
              <span>·</span>
              <span className="text-red-500 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {stats.urgent} 紧急
              </span>
            </>
          )}
        </div>
      </div>

      {/* 展开的筛选面板 */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-4">
          {/* 类别 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">事件类别</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((cat) => (
                <button
                  key={cat}
                  onClick={() => onCategoryChange(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    category === cat
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* 日期范围和状态 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">时间范围</Label>
              <Select value={dateRange} onValueChange={(v) => onDateRangeChange(v as FilterDateRange)}>
                <SelectTrigger className="border-slate-200 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_RANGE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">完成状态</Label>
              <Select value={status} onValueChange={(v) => onStatusChange(v as FilterStatus)}>
                <SelectTrigger className="border-slate-200 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 紧急事件开关 */}
          <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <Label className="text-sm font-medium text-slate-700">仅显示紧急事件</Label>
            </div>
            <Switch
              checked={showUrgentOnly}
              onCheckedChange={onUrgentChange}
              className="data-[checked]:bg-red-500"
            />
          </div>

          {/* 重置按钮 */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="w-full text-slate-500 hover:text-slate-700"
            >
              <X className="w-4 h-4 mr-1" />
              清除所有筛选条件
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
