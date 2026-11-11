import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const pad2 = (n) => String(n).padStart(2, '0');

/** 13:05 */
export function fmtClock(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** 10月8日 14:30 */
export function fmtDateTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${fmtClock(ts)}`;
}

/** 详情筛选用 */
export function activityStatus(a) {
  const now = Date.now();
  if (now < a.startAt) return 'upcoming';
  if (now > a.endAt) return 'ended';
  return 'ongoing';
}

export const STATUS_LABEL = { upcoming: '未开始', ongoing: '进行中', ended: '已结束' };

/** 名单统计：total / checkedIn / checkedOut / pending / checkinRate / fullRate / avgStay(ms) */
export function activityStats(attendees) {
  const total = attendees.length;
  const checkedOut = attendees.filter((t) => t.status === 'out').length;
  const checkedIn = attendees.filter((t) => t.status !== 'pending').length;
  const pending = total - checkedIn;
  const stays = attendees
    .filter((t) => t.checkinAt && t.checkoutAt)
    .map((t) => t.checkoutAt - t.checkinAt);
  const avgStay = stays.length ? Math.round(stays.reduce((a, b) => a + b, 0) / stays.length) : 0;
  return {
    total,
    checkedIn,
    checkedOut,
    pending,
    checkinRate: total ? Math.round((checkedIn / total) * 100) : 0,
    fullRate: checkedIn ? Math.round((checkedOut / checkedIn) * 100) : 0,
    avgStay,
  };
}

/** 145min → '2小时25分' */
export function fmtDuration(ms) {
  if (!ms || ms < 0) return '—';
  const mins = Math.round(ms / 60000);
  if (mins < 1) return '不足1分钟';
  if (mins < 60) return `${mins}分钟`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}小时${m}分` : `${h}小时`;
}

/** 人名去重合并（批量导入时清洗） */
export function parseRosterText(text) {
  const seen = new Set();
  const list = [];
  text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      // 支持 "张三,市场部" / "张三 市场" 之类写法
      const [name, tag] = line.split(/[,，\s]+/);
      const key = name.replace(/\s/g, '');
      if (key && !seen.has(key)) {
        seen.add(key);
        list.push({ name: key, tag: tag || '' });
      }
    });
  return list;
}

