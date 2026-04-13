'use client';

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar, Bell, StickyNote, MousePointer, Clock, AlertTriangle } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const helpPages = [
  {
    title: '欢迎使用日历',
    icon: Calendar,
    content: (
      <div className="space-y-4 text-sm text-slate-600">
        <p>这是一个功能丰富的日历应用，帮助您管理日程和待办事项。</p>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-slate-800">视图切换</p>
              <p className="text-slate-500">支持日视图、周视图、月视图切换，方便不同粒度的日程管理。</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-slate-800">智能时间输入</p>
              <p className="text-slate-500">支持自然语言输入，如"明天下午两点开会"，系统会自动解析时间和日期。</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: '事件管理',
    icon: Bell,
    content: (
      <div className="space-y-4 text-sm text-slate-600">
        <p>在日历中创建和管理您的日程事件：</p>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
              <MousePointer className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-slate-800">快速创建</p>
              <p className="text-slate-500">点击日历上的时间格子，即可快速创建新事件。拖拽事件边缘可调整时长。</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Bell className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-slate-800">提醒功能</p>
              <p className="text-slate-500">为事件设置提醒，可在事件开始前5分钟、15分钟、1小时等时间收到通知。</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <p className="font-medium text-slate-800">紧急事件</p>
              <p className="text-slate-500">标记紧急事件，会以红色高亮显示，并显示紧急标识。</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <p className="font-medium text-slate-800">全天待办</p>
              <p className="text-slate-500">开启全天待办选项，事件将显示在日历顶部的全天区域。</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: '便签功能',
    icon: StickyNote,
    content: (
      <div className="space-y-4 text-sm text-slate-600">
        <p>便签功能帮助您快速记录想法和待办事项：</p>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
              <StickyNote className="w-4 h-4 text-yellow-600" />
            </div>
            <div>
              <p className="font-medium text-slate-800">创建便签</p>
              <p className="text-slate-500">点击右下角的黄色便签按钮，打开便签面板，创建新的便签。</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
              <MousePointer className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <p className="font-medium text-slate-800">拖拽创建日程</p>
              <p className="text-slate-500">将便签拖拽到日历中的日期和时间，即可快速创建一个关联的事件。</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center flex-shrink-0">
              <Bell className="w-4 h-4 text-pink-500" />
            </div>
            <div>
              <p className="font-medium text-slate-800">同步更新</p>
              <p className="text-slate-500">修改便签或事件的颜色、完成状态等信息，关联的事件/便签会自动同步。</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: '快捷操作',
    icon: MousePointer,
    content: (
      <div className="space-y-4 text-sm text-slate-600">
        <p>使用这些快捷操作提升效率：</p>
        <div className="space-y-3">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="font-medium text-slate-800 mb-1">双击事件</p>
            <p className="text-slate-500">双击任意事件，可快速标记为已完成/未完成状态。</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="font-medium text-slate-800 mb-1">拖拽事件</p>
            <p className="text-slate-500">鼠标拖拽事件块，可在不同日期和时间之间移动事件。</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="font-medium text-slate-800 mb-1">智能输入</p>
            <p className="text-slate-500">在新建事件弹窗中切换到智能输入模式，用自然语言描述即可自动解析时间。</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="font-medium text-slate-800 mb-1">撤销操作</p>
            <p className="text-slate-500">删除事件或便签后，按 Ctrl+Z (Windows) 可撤销删除操作。</p>
          </div>
        </div>
      </div>
    ),
  },
];

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = helpPages.length;

  const handleClose = () => {
    setCurrentPage(0);
    onClose();
  };

  const currentContent = helpPages[currentPage];
  const IconComponent = currentContent.icon;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[420px] ios-dialog p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
              <IconComponent className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800">{currentContent.title}</h2>
          </div>

          {/* Content */}
          <div className="min-h-[280px]">
            {currentContent.content}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className={`gap-1 ${currentPage === 0 ? 'text-slate-300' : 'text-slate-600'}`}
            >
              <ChevronLeft className="w-4 h-4" />
              上一页
            </Button>

            <div className="flex items-center gap-1.5">
              {helpPages.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentPage ? 'bg-blue-500' : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage === totalPages - 1}
              className={`gap-1 ${currentPage === totalPages - 1 ? 'text-slate-300' : 'text-slate-600'}`}
            >
              下一页
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}