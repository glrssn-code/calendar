'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Settings, Bell, Palette, Calendar, Clock, Globe, ArrowLeft, Download, Upload, Trash2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { downloadAsJSON, downloadAsExcel, generateFilename } from '@/lib/export';
import { getStorageInfo, loadEvents, saveEvents, clearEvents, importEventsFromJSON } from '@/lib/storage';
import { CalendarEvent } from '@/types/event';
import { FlappyBird } from '@/components/FlappyBird';
import { useSettings } from '@/hooks/useSettings';

export default function SettingsPage() {
  const { settings, saveSettings, isLoaded } = useSettings();
  const [storageInfo, setStorageInfo] = useState({ eventCount: 0, lastUpdated: null as string | null, storageSize: '0 B' });
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importPreview, setImportPreview] = useState<CalendarEvent[] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [versionClickCount, setVersionClickCount] = useState(0);
  const [showClearButton, setShowClearButton] = useState(false);
  const [developerClickCount, setDeveloperClickCount] = useState(0);
  const [showFlappyBird, setShowFlappyBird] = useState(false);
  const developerClickCountRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 刷新存储信息
  const refreshStorageInfo = () => {
    setStorageInfo(getStorageInfo());
  };

  useEffect(() => {
    refreshStorageInfo();
    // 每次进入页面时重置版本号点击次数和清除按钮状态
    setVersionClickCount(0);
    setShowClearButton(false);
    // 重置开发者点击次数和彩蛋状态
    setDeveloperClickCount(0);
    developerClickCountRef.current = 0;
    setShowFlappyBird(false);
  }, []);

  const handleSave = () => {
    alert('设置已保存！');
  };

  // 导出 JSON
  const handleExportJSON = () => {
    const events = loadEvents();
    downloadAsJSON(events, generateFilename('calendar-events', 'json'));
  };

  // 导出 Excel
  const handleExportExcel = () => {
    const events = loadEvents();
    downloadAsExcel(events, generateFilename('calendar-events', 'xlsx'));
  };

  // 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const result = importEventsFromJSON(content);
        if (result.success && result.events) {
          setImportPreview(result.events);
          setImportError(null);
          setShowImportDialog(true);
        } else {
          setImportError(result.error || '导入失败');
        }
      } catch {
        setImportError('文件解析失败，请选择有效的 JSON 文件');
      }
    };
    reader.readAsText(file);

    // 重置 input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 执行导入
  const handleImport = (mode: 'merge' | 'replace') => {
    if (importPreview) {
      const existingEvents = loadEvents();
      let finalEvents: CalendarEvent[];

      if (mode === 'replace') {
        finalEvents = importPreview;
      } else {
        // 合并模式
        const existingIds = new Set(existingEvents.map((e) => e.id));
        const newEvents = importPreview.filter((e) => !existingIds.has(e.id));
        finalEvents = [...existingEvents, ...newEvents];
      }

      saveEvents(finalEvents);
      setShowImportDialog(false);
      setImportPreview(null);
      refreshStorageInfo();
      alert(`成功导入 ${importPreview.length} 个事件`);
    }
  };

  // 清除所有数据
  const handleClearAll = () => {
    clearEvents();
    setShowClearDialog(false);
    refreshStorageInfo();
    alert('所有事件已清除');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">设置</h1>
                <p className="text-sm text-slate-500">自定义您的日历体验</p>
              </div>
            </div>
            <Button
              onClick={handleSave}
              className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg shadow-blue-500/25 px-6"
            >
              保存设置
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Calendar Settings */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-cyan-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800">日历设置</h2>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">每周起始日</Label>
                <Select
                  value={settings.weekStartsOn}
                  onValueChange={(v) => saveSettings({ weekStartsOn: v || '0' })}
                >
                  <SelectTrigger className="border-slate-200 bg-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">周日</SelectItem>
                    <SelectItem value="1">周一</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">默认事件时长</Label>
                <Select
                  value={settings.defaultEventDuration}
                  onValueChange={(v) => saveSettings({ defaultEventDuration: v || '30' })}
                >
                  <SelectTrigger className="border-slate-200 bg-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 分钟</SelectItem>
                    <SelectItem value="30">30 分钟</SelectItem>
                    <SelectItem value="60">1 小时</SelectItem>
                    <SelectItem value="90">1.5 小时</SelectItem>
                    <SelectItem value="120">2 小时</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">默认视图</Label>
              <Select
                value={settings.defaultView}
                onValueChange={(v) => saveSettings({ defaultView: (v || 'week') as 'day' | 'week' | 'month' })}
              >
                <SelectTrigger className="border-slate-200 bg-slate-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">日视图</SelectItem>
                  <SelectItem value="week">周视图</SelectItem>
                  <SelectItem value="month">月视图</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Notification Settings */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Bell className="w-5 h-5 text-emerald-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800">通知设置</h2>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div className="space-y-0.5">
                <Label className="text-slate-700 font-medium">声音提醒</Label>
                <p className="text-sm text-slate-500">事件提醒时播放声音</p>
              </div>
              <Switch
                checked={settings.enableSound}
                onCheckedChange={(v) => saveSettings({ enableSound: v })}
                className="data-[checked]:bg-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div className="space-y-0.5">
                <Label className="text-slate-700 font-medium">桌面通知</Label>
                <p className="text-sm text-slate-500">在桌面显示事件通知</p>
              </div>
              <Switch
                checked={settings.enableDesktopNotifications}
                onCheckedChange={(v) => saveSettings({ enableDesktopNotifications: v })}
                className="data-[checked]:bg-emerald-500"
              />
            </div>
          </div>
        </section>

        {/* Appearance Settings */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-purple-50 to-pink-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Palette className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800">外观设置</h2>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-3">
              <Label className="text-slate-700 font-medium">主题风格</Label>
              <div className="grid grid-cols-3 gap-4">
                {[
                  {
                    value: 'skeuomorphic',
                    bgGradient: 'from-slate-100 to-slate-200',
                    borderColor: 'border-slate-300',
                    label: '拟物主题',
                    desc: '渐变阴影立体感',
                    preview: '🎨'
                  },
                  {
                    value: 'cartoon',
                    bgGradient: 'from-pink-100 to-purple-100',
                    borderColor: 'border-pink-300',
                    label: '卡通主题',
                    desc: '圆润可爱色彩丰富',
                    preview: '🌈'
                  },
                  {
                    value: 'frosted',
                    bgGradient: 'from-blue-100/50 to-purple-100/50',
                    borderColor: 'border-blue-200',
                    label: '磨玻璃',
                    desc: '模糊透明现代感',
                    preview: '✨'
                  },
                ].map((theme) => (
                  <button
                    key={theme.value}
                    onClick={() => saveSettings({ theme: theme.value as 'skeuomorphic' | 'cartoon' | 'frosted' })}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                      settings.theme === theme.value
                        ? 'border-blue-500 bg-blue-50 shadow-lg scale-105'
                        : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                    }`}
                  >
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${theme.bgGradient} ${theme.borderColor} border-2 flex items-center justify-center text-3xl shadow-sm`}>
                      {theme.preview}
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{theme.label}</span>
                    <span className="text-xs text-slate-500">{theme.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Data Management Section */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-cyan-50 to-blue-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-100 rounded-lg">
                <Download className="w-5 h-5 text-cyan-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800">数据管理</h2>
            </div>
          </div>
          <div className="p-6 space-y-6">
            {/* 存储状态 */}
            <div className="p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">当前存储状态</p>
                  <p className="text-lg font-semibold text-slate-800">
                    {storageInfo.eventCount} 个事件 · {storageInfo.storageSize}
                  </p>
                  {storageInfo.lastUpdated && (
                    <p className="text-xs text-slate-400 mt-1">
                      上次更新：{storageInfo.lastUpdated}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 导出按钮 */}
            <div className="space-y-3">
              <Label className="text-slate-700 font-medium">导出数据</Label>
              <div className="flex gap-3">
                <Button
                  onClick={handleExportJSON}
                  variant="outline"
                  className="flex-1 border-slate-200 hover:bg-slate-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  导出 JSON
                </Button>
                <Button
                  onClick={handleExportExcel}
                  variant="outline"
                  className="flex-1 border-slate-200 hover:bg-slate-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  导出 Excel
                </Button>
              </div>
            </div>

            {/* 导入 */}
            <div className="space-y-3">
              <Label className="text-slate-700 font-medium">导入数据</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="w-full border-slate-200 hover:bg-slate-50"
              >
                <Upload className="w-4 h-4 mr-2" />
                选择 JSON 文件导入
              </Button>
              {importError && (
                <p className="text-sm text-red-500">{importError}</p>
              )}
            </div>

            {/* 清除数据 - 默认隐藏 */}
            {!showClearButton && (
              <div className="pt-4 border-t border-slate-100">
                <Button
                  onClick={() => setShowClearDialog(true)}
                  variant="outline"
                  className="w-full border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
                  style={{ display: 'none' }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  清除所有事件
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* About Section */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-200 rounded-lg">
                <Settings className="w-5 h-5 text-slate-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800">关于</h2>
            </div>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-800">我的日历</h3>
                <p
                  className="text-sm text-slate-500 cursor-pointer hover:text-blue-500 transition-colors"
                  onClick={() => {
                    const newCount = versionClickCount + 1;
                    setVersionClickCount(newCount);
                    if (newCount >= 5) {
                      setShowClearButton(true);
                    }
                  }}
                >
                  版本 1.0.1
                </p>
                <p
                  className="text-sm text-slate-500 mt-1 cursor-pointer hover:text-blue-500 transition-colors"
                  onClick={() => {
                    developerClickCountRef.current += 1;
                    setDeveloperClickCount(developerClickCountRef.current);
                    if (developerClickCountRef.current >= 5) {
                      setShowFlappyBird(true);
                    }
                  }}
                >
                  开发者：ZhangYadong
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">使用 Next.js 16 构建</p>
                <p className="text-xs text-slate-400">Turbopack 驱动</p>
              </div>
            </div>
          </div>
        </section>

        {/* 清除所有事件按钮 - 点击版本号5次后显示 */}
        {showClearButton && (
          <section className="bg-white rounded-2xl shadow-sm border border-red-200 overflow-hidden">
            <div className="p-6">
              <Button
                onClick={() => setShowClearDialog(true)}
                variant="outline"
                className="w-full border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                清除所有事件
              </Button>
            </div>
          </section>
        )}
      </main>

      {/* 清除确认对话框 */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="w-5 h-5" />
              确认清除
            </DialogTitle>
            <DialogDescription>
              确定要清除所有事件吗？此操作不可恢复。
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

      {/* 导入确认对话框 */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>确认导入</DialogTitle>
            <DialogDescription>
              将导入 {importPreview?.length || 0} 个事件，请选择导入方式：
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-sm text-slate-500">
              · <strong>合并</strong>：保留现有事件，添加新事件（忽略重复 ID）
            </p>
            <p className="text-sm text-slate-500">
              · <strong>替换</strong>：用导入的数据完全替换现有事件
            </p>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button variant="outline" onClick={() => setShowImportDialog(false)} className="w-full">
              取消
            </Button>
            <Button onClick={() => handleImport('merge')} className="w-full bg-blue-500 hover:bg-blue-600 text-white">
              合并导入
            </Button>
            <Button onClick={() => handleImport('replace')} variant="outline" className="w-full border-red-200 text-red-500 hover:bg-red-50">
              替换全部
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Flappy Bird 彩蛋 */}
      {showFlappyBird && <FlappyBird onExit={() => setShowFlappyBird(false)} />}
    </div>
  );
}
