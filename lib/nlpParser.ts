import { addDays, addHours, setHours, setMinutes, format, parse, isValid } from 'date-fns';

/**
 * 解析中文自然语言时间表达
 * 支持的格式：
 * - 明天/后天/今天 + 时间 (明天下午两点, 今天上午10:30)
 * - 具体日期 + 时间 (4月8日下午3点)
 * - 相对时间 (3天后, 两周后)
 * - 星期 + 时间 (下周三下午2点)
 */

interface ParsedResult {
  date: Date;
  title: string;
  duration: number; // 分钟
  hasReminder: boolean;
  isUrgent: boolean;
  category?: string; // 事件类别
  isPast?: boolean; // 时间是否已过（仅用于今天的时间）
}

// 类别关键词映射
const CATEGORY_PATTERNS: { [key: string]: string } = {
  '售前': '售前',
  '项目': '项目',
  '会议': '会议',
  '开会': '会议',
  '管理': '管理',
  '推广': '推广',
};

// 时间关键词映射
const TIME_PATTERNS: { [key: string]: number } = {
  '凌晨': 4,
  '早上': 8,
  '上午': 9,
  '中午': 12,
  '下午': 14,
  '晚上': 19,
  '夜里': 21,
};

// 星期映射
const WEEKDAY_MAP: { [key: string]: number } = {
  '周日': 0, '星期日': 0,
  '周一': 1, '星期一': 1,
  '周二': 2, '星期二': 2,
  '周三': 3, '星期三': 3,
  '周四': 4, '星期四': 4,
  '周五': 5, '星期五': 5,
  '周六': 6, '星期六': 6,
  '下周日': 7, '下星期日': 7,
  '下周一': 8, '下星期一': 8,
  '下周二': 9, '下星期二': 9,
  '下周三': 10, '下星期三': 10,
  '下周四': 11, '下星期四': 11,
  '下周五': 12, '下星期五': 12,
  '下周六': 13, '下星期六': 13,
};

export function parseChineseDateTime(input: string): ParsedResult | null {
  let text = input.trim();
  if (!text) return null;

  // 去掉开头所有的标点符号
  text = text.replace(/^[，。、；：!?！?？\s]+/, '');

  if (!text) return null;

  let date = new Date();
  let title = '';
  let duration = 30; // 默认半小时
  let hasReminder = true; // 默认开启提醒
  let isUrgent = false; // 是否紧急

  // 检测是否包含提醒
  if (text.includes('提醒') || text.includes('通知') || text.includes('记得')) {
    hasReminder = true;
  }

  // 检测是否紧急
  if (text.includes('紧急') || text.includes('急') || text.includes('马上') || text.includes('立即')) {
    isUrgent = true;
  }

  // 检测类别
  let category: string | undefined;
  for (const [pattern, cat] of Object.entries(CATEGORY_PATTERNS)) {
    if (text.includes(pattern)) {
      category = cat;
      break;
    }
  }

  // 提取标题（去掉时间和提醒相关的词）
  let remainingText = text;

  // 提取时间相关词汇并构建时间
  let targetHour = 9;
  let targetMinute = 0;

  // 处理 "明天下午两点" 这种格式
  if (remainingText.includes('明天')) {
    date = addDays(date, 1);
    remainingText = remainingText.replace('明天', '');
  }

  if (remainingText.includes('后天')) {
    date = addDays(date, 2);
    remainingText = remainingText.replace('后天', '');
  }

  if (remainingText.includes('今天')) {
    remainingText = remainingText.replace('今天', '');
  }

  // 处理下周的表达
  if (remainingText.includes('下周')) {
    date = addDays(date, 7);
    remainingText = remainingText.replace('下周', '');
  }

  // 处理星期几
  for (const [pattern, daysToAdd] of Object.entries(WEEKDAY_MAP)) {
    if (remainingText.includes(pattern)) {
      if (daysToAdd >= 7) {
        // 下周的情况
        date = addDays(date, daysToAdd - 7 + 7);
      } else {
        // 本周的情况
        const todayDay = date.getDay();
        const targetDay = daysToAdd;
        let daysDiff = targetDay - todayDay;
        if (daysDiff <= 0) daysDiff += 7;
        date = addDays(date, daysDiff);
      }
      remainingText = remainingText.replace(pattern, '');
      break;
    }
  }

  // 先移除时间修饰词（上午/下午/晚上等），并标记
  let isAfternoon = false;
  let isEvening = false;
  let tempText = text;
  for (const [pattern, _] of Object.entries(TIME_PATTERNS)) {
    if (tempText.includes(pattern)) {
      if (pattern === '下午') {
        isAfternoon = true;
      } else if (pattern === '晚上' || pattern === '夜里') {
        isEvening = true;
      }
      tempText = tempText.replace(pattern, '');
    }
  }

  // 从 tempText 中提取时间
  let extractedText = tempText;

  // 处理具体时间 "14:30" 等（24小时制）
  const timeMatch = extractedText.match(/(\d{1,2})[:：](\d{1,2})/);
  if (timeMatch) {
    targetHour = parseInt(timeMatch[1]);
    targetMinute = parseInt(timeMatch[2]);
    extractedText = extractedText.replace(timeMatch[0], '');
  }

  // 处理 "X点" 格式
  const hourMatch = extractedText.match(/(\d{1,2})\s*点/);
  if (hourMatch) {
    targetHour = parseInt(hourMatch[1]);
    // 如果是下午/晚上且小时小于12，加12
    if (isAfternoon && targetHour < 12) {
      targetHour += 12;
    }
    if (isEvening && targetHour < 12) {
      targetHour += 12;
    }
    extractedText = extractedText.replace(hourMatch[0], '');
    // 检查后面是否有半
    if (extractedText.includes('半')) {
      targetMinute = 30;
      extractedText = extractedText.replace('半', '');
    }
  }

  // 处理分钟 "X分" 或 "X分钟"
  const minMatch = extractedText.match(/(\d{1,2})\s*[分分钟]/);
  if (minMatch) {
    targetMinute = parseInt(minMatch[1]);
    extractedText = extractedText.replace(minMatch[0], '');
  }

  // 用 extractedText 来提取标题（去除时间和提醒相关词）
  remainingText = extractedText;

  // 清理剩余文本作为标题
  title = remainingText
    .replace(/提醒我|通知我|记得|有个|有一个|,，/g, '')
    .trim();

  // 如果标题为空，尝试提取"整理产品线报价清单"这种格式
  if (!title) {
    // 从原始文本中提取"提醒我"后面的内容
    const remindMatch = text.match(/(?:提醒我|通知我|记得)\s*(.+?)\s*$/);
    if (remindMatch) {
      title = remindMatch[1].trim();
    }
  }

  // 如果标题仍然为空，尝试用最后一个有意义的词
  if (!title) {
    const words = text.split(/[\s,，。、]+/).filter(w => w.length > 1);
    for (let i = words.length - 1; i >= 0; i--) {
      const word = words[i];
      if (!/\d/.test(word) && !['点', '分', '半', '提醒', '通知', '记得'].includes(word)) {
        title = word;
        break;
      }
    }
  }

  // 设置时间
  date = setHours(date, targetHour);
  date = setMinutes(date, targetMinute);

  // 检查时间是否已过（仅用于提示用户）
  const isPast = date < new Date();

  return {
    date,
    title: title || '新事件',
    duration,
    hasReminder,
    isUrgent,
    category,
    isPast,
  };
}

function remainingContent(pattern: string, text: string): string {
  return text.split(pattern)[1] || '';
}

// 验证解析结果是否有效
export function isValidParsedResult(result: ParsedResult | null): result is ParsedResult {
  if (!result) return false;
  if (!isValid(result.date)) return false;
  // 不再检查时间是否已过，由 isPast 标志处理
  return true;
}

// 格式化解析结果用于预览
export function formatParsedResult(result: ParsedResult): string {
  const dateStr = format(result.date, 'M月d日 EEE', { weekStartsOn: 1 });
  const timeStr = format(result.date, 'HH:mm');
  const urgentStr = result.isUrgent ? ' ⚠️' : '';
  const reminderStr = result.hasReminder ? ' 🔔' : '';
  return `${dateStr} ${timeStr} - ${result.title}${urgentStr}${reminderStr}`;
}
