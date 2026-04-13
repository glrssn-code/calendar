// 统一颜色与类别映射 - 顺序：售前、项目、会议、管理、推广、其它

export type EventColor = 'orange' | 'yellow' | 'green' | 'blue' | 'indigo' | 'purple';

export const CATEGORIES = ['售前', '项目', '会议', '管理', '推广', '其它'] as const;

export const CATEGORY_COLORS: Record<string, EventColor> = {
  '售前': 'orange',
  '项目': 'yellow',
  '会议': 'blue',
  '管理': 'indigo',
  '推广': 'purple',
  '其它': 'green',
};

export const COLOR_CATEGORY_ORDER: EventColor[] = ['orange', 'yellow', 'blue', 'indigo', 'purple', 'green'];

export const COLOR_CATEGORY_MAP: Record<EventColor, { label: string; bg: string; hex: string; category: string }> = {
  orange: { label: '橙', bg: 'bg-orange-500', hex: '#f97316', category: '售前' },
  yellow: { label: '黄', bg: 'bg-amber-500', hex: '#eab308', category: '项目' },
  blue: { label: '蓝', bg: 'bg-blue-500', hex: '#3b82f6', category: '会议' },
  indigo: { label: '靛', bg: 'bg-indigo-500', hex: '#6366f1', category: '管理' },
  purple: { label: '紫', bg: 'bg-purple-500', hex: '#a855f7', category: '推广' },
  green: { label: '绿', bg: 'bg-green-500', hex: '#22c55e', category: '其它' },
};

// 类别选项 - 用于 Select 组件
export const CATEGORY_OPTIONS: { value: string; label: string; color: EventColor }[] = CATEGORIES.map(cat => ({
  value: cat,
  label: cat,
  color: CATEGORY_COLORS[cat],
}));

// 颜色选项 - 用于颜色选择器组件
export const COLOR_OPTIONS: { value: EventColor; label: string; hex: string; category: string }[] =
  COLOR_CATEGORY_ORDER.map(color => ({
    value: color,
    label: COLOR_CATEGORY_MAP[color].label,
    hex: COLOR_CATEGORY_MAP[color].hex,
    category: COLOR_CATEGORY_MAP[color].category,
  }));
