import React, { useMemo, useState } from 'react';
import { Link, useParams, useLocation } from 'wouter';
import { toast } from 'sonner';
import {
  ArrowLeft, MapPin, Clock3, QrCode, Laptop, Search, Plus, X,
  LogIn, LogOut, RotateCcw, Trash2, Users, UserCheck, UserX, Rss, Hand,
} from 'lucide-react';
import Layout from '../components/Layout';
import { useStore } from '../lib/store';
import { cn, fmtDateTime, fmtClock, fmtDuration, activityStatus, activityStats, STATUS_LABEL } from '../lib/utils';

const STATUS_STYLE = {
  upcoming: 'bg-[var(--warn-soft)] text-[var(--warn)]',
  ongoing: 'bg-[var(--ok-soft)] text-[var(--ok)]',
  ended: 'bg-[var(--line)] text-[var(--ink-soft)]',
};

const METHOD_LABEL = { kiosk: '签到台', manual: '手动登记' };

const TABS = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '未签到' },
  { key: 'in', label: '已签到' },
  { key: 'out', label: '已签退' },
];

function Badge({ status }) {
  const map = {
    pending: ['bg-[var(--warn-soft)] text-[var(--warn)]', '未签到'],
    in: ['bg-[var(--ok-soft)] text-[var(--ok)]', '已签到'],
    out: ['bg-[var(--line)] text-[var(--ink-soft)]', '已签退'],
  };
  const [cls, label] = map[status];
  return <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', cls)}>{label}</span>;
}

function MiniStat({ label, value, sub, tone = 'ink' }) {
  const tones = { ink: 'text-[var(--ink)]', ok: 'text-[var(--ok)]', seal: 'text-[var(--seal)]', warn: 'text-[var(--warn)]' };
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] px-5 py-4">
      <div className={cn('font-mono-num text-2xl font-bold leading-none', tones[tone])}>{value}</div>
      <div className="mt-1.5 text-xs text-[var(--ink-soft)]">{label}</div>
      {sub && <div className="text-[11px] text-[var(--ink-soft)]/70">{sub}</div>}
    </div>
  );
}

export default function ActivityDetail({ activityId }) {
  const params = useParams();
  const id = activityId || params.id;
  const [, setLocation] = useLocation();

  const activity = useStore((s) => s.activities.find((a) => a.id === id));
  const allAttendees = useStore((s) => s.attendees);
  const checkIn = useStore((s) => s.checkInAttendee);
  const checkOut = useStore((s) => s.checkOutAttendee);
  const resetOne = useStore((s) => s.resetAttendee);
  const removeOne = useStore((s) => s.removeAttendee);
  const addOne = useStore((s) => s.addAttendee);
  const deleteActivity = useStore((s) => s.deleteActivity);

  const attendees = useMemo(
    () => allAttendees.filter((t) => t.activityId === id),
    [allAttendees, id]
  );
  const stats = activityStats(attendees);
  const status = activity ? activityStatus(activity) : null;

  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('all');
  const [newName, setNewName] = useState('');
  const [newTag, setNewTag] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);

  const filtered = useMemo(() => {
    let list = attendees;
    if (tab !== 'all') list = list.filter((t) => t.status === tab);
    const q = query.trim();
    if (q) list = list.filter((t) => t.name.includes(q) || t.tag.includes(q));
    return [...list].sort((a, b) => {
      const order = { in: 0, out: 1, pending: 2 };
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
      const ta = a.checkinAt || a.checkoutAt || 0;
      const tb = b.checkinAt || b.checkoutAt || 0;
      return ta - tb;
    });
  }, [attendees, tab, query]);

  const events = useMemo(
    () =>
      attendees
        .flatMap((t) => {
          const arr = [];
          if (t.checkinAt) arr.push({ at: t.checkinAt, name: t.name, tag: t.tag, type: '签到' });
          if (t.checkoutAt) arr.push({ at: t.checkoutAt, name: t.name, tag: t.tag, type: '签退' });
          return arr;
        })
        .sort((a, b) => b.at - a.at)
        .slice(0, 8),
    [attendees]
  );

  const handleDelete = () => {
    if (!confirmDel) {
      setConfirmDel(true);
      setTimeout(() => setConfirmDel(false), 3000);
      return;
    }
    deleteActivity(id);
    toast.success('活动已删除');
    setLocation('/');
  };

  const handleAdd = () => {
    const r = addOne(id, { name: newName, tag: newTag });
    if (!r) return toast.warning('请填写参会人姓名');
    setNewName('');
    setNewTag('');
  };

  if (!activity) {
    return (
      <Layout>
        <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--card)] px-6 py-20 text-center">
          <p className="font-display text-lg font-bold">未找到该活动</p>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">活动可能已被删除</p>
          <Link href="/" className="mt-6 inline-block rounded-xl bg-[var(--ink)] px-5 py-2.5 text-sm font-medium text-white">返回活动总览</Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout wide>
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-[var(--ink-soft)] hover:text-[var(--ink)]">
        <ArrowLeft className="h-4 w-4" /> 返回活动总览
      </Link>

      {/* 活动头条 */}
      <section className="relative mt-3 overflow-hidden rounded-3xl bg-[var(--ink-deep)] p-6 text-white md:p-7">
        <div className="paper-grain pointer-events-none absolute inset-0 opacity-20" />
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-2xl font-black md:text-3xl">{activity.name}</h1>
              <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_STYLE[status])}>{STATUS_LABEL[status]}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-white/75">
              <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" />{fmtDateTime(activity.startAt)} — {fmtDateTime(activity.endAt)}</span>
              {activity.location && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{activity.location}</span>}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="inline-flex items-center gap-1.5 text-xs text-white/60"><QrCode className="h-3.5 w-3.5" />现场签到码</div>
              <div className="font-mono-num mt-1 text-4xl font-bold tracking-[0.18em] text-white">{activity.code}</div>
            </div>
            <Link
              href="/kiosk"
              className="inline-flex items-center gap-2 self-center rounded-xl bg-[var(--seal)] px-4 py-3 text-sm font-bold shadow-lg transition-transform hover:-translate-y-0.5"
            >
              <Laptop className="h-4 w-4" /> 打开签到台
            </Link>
            <button
              onClick={handleDelete}
              className={cn(
                'self-center rounded-xl border px-3.5 py-2.5 text-sm transition-colors',
                confirmDel
                  ? 'border-[var(--seal)] bg-[var(--seal)] font-bold text-white'
                  : 'border-white/25 text-white/70 hover:text-white'
              )}
              title="删除活动"
            >
              {confirmDel ? '确认删除？' : <Trash2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </section>

      {/* 统计面板 */}
      <section className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
        <MiniStat label="应到人数" value={stats.total} sub="名单总人数" />
        <MiniStat label="已签到" value={stats.checkedIn} tone="ok" sub={`签到率 ${stats.checkinRate}%`} />
        <MiniStat label="已签退" value={stats.checkedOut} tone="seal" sub={`全程参与率 ${stats.fullRate}%`} />
        <MiniStat label="未到" value={stats.pending} tone="warn" sub={`平均停留 ${fmtDuration(stats.avgStay)}`} />
      </section>

      {/* 名单 & 动态 */}
      <section className="mt-5 grid gap-5 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] p-4">
            <div className="inline-flex items-center gap-2 font-display font-bold"><Users className="h-4 w-4 text-[var(--seal)]" />参会人签到明细</div>
            <div className="relative w-48">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink-soft)]/50" />
              <input
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--paper)] py-1.5 pl-8 pr-2 text-xs outline-none focus:border-[var(--ink)]"
                placeholder="搜索姓名/部门"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-1 border-b border-[var(--line)] px-4 py-2">
            {TABS.map((t) => {
              const count = t.key === 'all' ? attendees.length : attendees.filter((x) => x.status === t.key).length;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs transition-colors',
                    tab === t.key ? 'bg-[var(--ink)] font-medium text-white' : 'text-[var(--ink-soft)] hover:bg-[var(--paper)]'
                  )}
                >
                  {t.label} <span className="font-mono-num">{count}</span>
                </button>
              );
            })}
          </div>

          {/* 补充参会人 */}
          <div className="flex gap-2 border-b border-[var(--line)] bg-[var(--paper)]/60 px-4 py-2.5">
            <input
              className="min-w-0 flex-1 rounded-lg border border-[var(--line)] bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[var(--ink)]"
              placeholder="现场补充：姓名"
              value={newName}
              maxLength={20}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
            />
            <input
              className="w-24 rounded-lg border border-[var(--line)] bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[var(--ink)]"
              placeholder="部门"
              value={newTag}
              maxLength={16}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
            />
            <button onClick={handleAdd} className="rounded-lg bg-[var(--ink)] px-2.5 text-white transition-colors hover:bg-[var(--ink-deep)]" title="加入名单">
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[440px] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-6 py-14 text-center text-sm text-[var(--ink-soft)]/70">
                {attendees.length === 0 ? '名单为空，先在上方添加参会人' : '没有符合筛选条件的人员'}
              </p>
            ) : (
              filtered.map((t, i) => (
                <div
                  key={t.id}
                  className="animate-fade-up flex flex-wrap items-center gap-3 border-b border-[var(--line)]/60 px-4 py-3 transition-colors hover:bg-[var(--paper)]/60"
                  style={{ animationDelay: `${Math.min(i * 25, 300)}ms` }}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ink)] text-xs font-bold text-white">
                    {t.name.slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {t.name}
                      {t.tag && <span className="rounded bg-[var(--paper)] px-1.5 py-0.5 text-[11px] text-[var(--ink-soft)]">{t.tag}</span>}
                      {t.method && <span className="inline-flex items-center gap-0.5 text-[11px] text-[var(--ink-soft)]/60"><Hand className="h-3 w-3" />{METHOD_LABEL[t.method]}</span>}
                    </div>
                    <div className="mt-0.5 font-mono-num text-[11px] text-[var(--ink-soft)]">
                      入场 {t.checkinAt ? fmtClock(t.checkinAt) : '—'} · 离场 {t.checkoutAt ? fmtClock(t.checkoutAt) : '—'}
                    </div>
                  </div>
                  <Badge status={t.status} />
                  <div className="flex items-center gap-1">
                    {t.status === 'pending' && (
                      <button
                        onClick={() => { checkIn(t.id, 'manual'); toast.success(`${t.name} 已登记签到`); }}
                        className="inline-flex items-center gap-1 rounded-lg bg-[var(--ok-soft)] px-2.5 py-1.5 text-xs font-medium text-[var(--ok)] hover:brightness-95"
                      >
                        <LogIn className="h-3.5 w-3.5" /> 登记签到
                      </button>
                    )}
                    {t.status === 'in' && (
                      <>
                        <button
                          onClick={() => { checkOut(t.id, 'manual'); toast.success(`${t.name} 已登记签退`); }}
                          className="inline-flex items-center gap-1 rounded-lg bg-[var(--seal-soft)] px-2.5 py-1.5 text-xs font-medium text-[var(--seal)] hover:brightness-95"
                        >
                          <LogOut className="h-3.5 w-3.5" /> 登记签退
                        </button>
                        <button
                          onClick={() => { resetOne(t.id); toast(`${t.name} 已重置为未签到`); }}
                          title="重置状态"
                          className="rounded-lg p-1.5 text-[var(--ink-soft)]/60 hover:bg-[var(--paper)] hover:text-[var(--ink)]"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                    {t.status === 'out' && (
                      <button
                        onClick={() => { resetOne(t.id); toast(`${t.name} 已重置为未签到`); }}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-[var(--ink-soft)] hover:bg-[var(--paper)]"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> 重置
                      </button>
                    )}
                    <button
                      onClick={() => { removeOne(t.id); toast(`${t.name} 已移出名单`); }}
                      title="移出名单"
                      className="rounded-lg p-1.5 text-[var(--ink-soft)]/40 hover:bg-[var(--seal-soft)] hover:text-[var(--seal)]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 最近动态 */}
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)]">
          <div className="flex items-center gap-2 border-b border-[var(--line)] p-4 font-display font-bold">
            <Rss className="h-4 w-4 text-[var(--seal)]" /> 签到动态
          </div>
          {events.length === 0 ? (
            <p className="px-6 py-14 text-center text-sm text-[var(--ink-soft)]/70">还没有签到 / 签退记录</p>
          ) : (
            <div className="space-y-0 p-2">
              {events.map((ev, i) => (
                <div
                  key={`${ev.name}-${ev.at}-${i}`}
                  className="animate-fade-up flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--paper)]"
                  style={{ animationDelay: `${Math.min(i * 40, 300)}ms` }}
                >
                  <span className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                    ev.type === '签到' ? 'bg-[var(--ok-soft)] text-[var(--ok)]' : 'bg-[var(--seal-soft)] text-[var(--seal)]'
                  )}>
                    {ev.type === '签到' ? <LogIn className="h-3.5 w-3.5" /> : <LogOut className="h-3.5 w-3.5" />}
                  </span>
                  <div className="min-w-0 flex-1 text-sm">
                    <span className="font-medium">{ev.name}</span>
                    {ev.tag && <span className="ml-1 text-xs text-[var(--ink-soft)]">{ev.tag}</span>}
                    <span className="text-[var(--ink-soft)]"> {ev.type}</span>
                  </div>
                  <span className="font-mono-num text-xs text-[var(--ink-soft)]">{fmtDateTime(ev.at)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="border-t border-[var(--line)] px-4 py-3 text-xs leading-relaxed text-[var(--ink-soft)]">
            <span className="inline-flex items-center gap-1.5"><UserCheck className="h-3.5 w-3.5 text-[var(--ok)]" />签到 {stats.checkedIn} 人</span>
            <span className="ml-4 inline-flex items-center gap-1.5"><UserX className="h-3.5 w-3.5 text-[var(--warn)]" />未到 {stats.pending} 人</span>
          </div>
        </div>
      </section>
    </Layout>
  );
}

