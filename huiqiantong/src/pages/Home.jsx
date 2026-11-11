import React, { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { toast } from 'sonner';
import {
  CalendarCheck2, MapPin, Clock3, QrCode, ChevronRight, Trash2,
  ArrowRight, Laptop, UserCheck, UserX, FolderOpen, Activity,
} from 'lucide-react';
import Layout from '../components/Layout';
import { useStore } from '../lib/store';
import { cn, fmtDateTime, activityStatus, activityStats, STATUS_LABEL } from '../lib/utils';

function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-[0_1px_2px_rgba(18,41,75,0.05)]">
      <div className={cn('absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-10', accent)} />
      <Icon className="h-5 w-5 text-[var(--seal)]" strokeWidth={1.8} />
      <div className="mt-3 font-mono-num text-3xl font-bold leading-none text-[var(--ink)]">{value}</div>
      <div className="mt-2 text-sm text-[var(--ink-soft)]">{label}</div>
      {sub && <div className="mt-0.5 text-xs text-[var(--ink-soft)]/70">{sub}</div>}
    </div>
  );
}

const STATUS_STYLE = {
  ongoing: 'bg-[var(--ok-soft)] text-[var(--ok)]',
  upcoming: 'bg-[var(--warn-soft)] text-[var(--warn)]',
  ended: 'bg-[var(--line)] text-[var(--ink-soft)]',
};

function ActivityCard({ activity, index, onDelete }) {
  const allAttendees = useStore((s) => s.attendees);
  const attendees = useMemo(
    () => allAttendees.filter((t) => t.activityId === activity.id),
    [allAttendees, activity.id]
  );
  const stats = activityStats(attendees);
  const status = activityStatus(activity);

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)] shadow-[0_1px_2px_rgba(18,41,75,0.05)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(18,41,75,0.10)] animate-fade-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* 左侧藏青书脊 */}
      <div className="absolute inset-y-0 left-0 w-1.5 bg-[var(--ink)]" />
      <div className="p-5 pl-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-lg font-bold text-[var(--ink)] truncate">{activity.name}</h3>
              <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_STYLE[status])}>
                {STATUS_LABEL[status]}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--ink-soft)]">
              <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{fmtDateTime(activity.startAt)} — {fmtDateTime(activity.endAt)}</span>
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{activity.location || '待定'}</span>
            </div>
          </div>
          <button
            onClick={onDelete}
            title="删除活动"
            className="shrink-0 rounded-lg p-2 text-[var(--ink-soft)]/50 transition-colors hover:bg-[var(--seal-soft)] hover:text-[var(--seal)]"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-[var(--seal)]" />
            <span className="text-xs text-[var(--ink-soft)]">签到码</span>
            <span className="font-mono-num rounded-md bg-[var(--ink)] px-2 py-0.5 text-sm font-bold tracking-[0.2em] text-white">
              {activity.code}
            </span>
          </div>
          <Link
            href={`/activity/${activity.id}`}
            className="inline-flex items-center gap-1 rounded-lg bg-[var(--ink)] px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--ink-deep)]"
          >
            管理与统计 <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-4">
          <div className="flex items-baseline justify-between text-xs text-[var(--ink-soft)]">
            <span>签到进度 <b className="font-mono-num text-sm">{stats.checkedIn}</b> / {stats.total} 人</span>
            <span>签退 {stats.checkedOut} · 签到率 {stats.checkinRate}%</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--paper)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--ink-soft)] to-[var(--ink)] transition-all duration-500"
              style={{ width: `${stats.checkinRate}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const activities = useStore((s) => s.activities);
  const attendees = useStore((s) => s.attendees);
  const deleteActivity = useStore((s) => s.deleteActivity);
  const [confirmId, setConfirmId] = useState(null);

  const ongoingCount = activities.filter((a) => activityStatus(a) === 'ongoing').length;
  const stats = activityStats(attendees);

  const handleDelete = (a) => {
    if (!confirmId || confirmId !== a.id) {
      setConfirmId(a.id);
      return;
    }
    deleteActivity(a.id);
    setConfirmId(null);
    toast.success(`已删除「${a.name}」及全部签到记录`);
  };

  return (
    <Layout wide>
      {/* 头部横幅 */}
      <section className="relative overflow-hidden rounded-3xl bg-[var(--ink-deep)] px-8 py-10 text-white">
        <div className="paper-grain pointer-events-none absolute inset-0 opacity-25" />
        <div className="absolute -right-10 -top-14 h-56 w-56 rounded-full bg-[var(--ink-soft)] opacity-40 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-xs tracking-[0.3em] text-white/50">CHECK · IN · CHECK · OUT</p>
            <h1 className="mt-2 font-display text-3xl font-black leading-snug md:text-4xl">
              会上签，离会销。
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70">
              创建活动、公布签到码，参会人到场一键签到、离场一键签退——到勤率、滞留时长一目了然。
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/create"
              className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-[var(--ink)] shadow-lg transition-transform hover:-translate-y-0.5"
            >
              新建活动签到
            </Link>
            <Link
              href="/kiosk"
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-5 py-3 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
            >
              <Laptop className="h-4 w-4" /> 现场签到台
            </Link>
          </div>
        </div>
      </section>

      {/* 概览统计 */}
      <section className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={FolderOpen} accent="bg-[var(--ink)]" label="活动总数" value={activities.length} sub="累计创建" />
        <StatCard icon={Activity} accent="bg-[var(--seal)]" label="进行中" value={ongoingCount} sub="当前时间内" />
        <StatCard icon={UserCheck} accent="bg-[var(--ok)]" label="累计签到人次" value={stats.checkedIn} sub="覆盖全部活动" />
        <StatCard icon={UserX} accent="bg-[var(--warn)]" label="累计签退人次" value={stats.checkedOut} sub="完成离会" />
      </section>

      {/* 活动列表 */}
      <section className="mt-10">
        <div className="flex items-end justify-between border-b-2 border-[var(--ink)] pb-2">
          <h2 className="font-display text-xl font-bold">全部活动</h2>
          <span className="text-xs text-[var(--ink-soft)]">共 {activities.length} 项</span>
        </div>

        {activities.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--card)] px-6 py-16 text-center">
            <CalendarCheck2 className="mx-auto h-10 w-10 text-[var(--ink-soft)]/40" strokeWidth={1.5} />
            <p className="mt-4 font-display text-lg font-bold text-[var(--ink)]">还没有任何活动</p>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">创建第一场会议，开始统计签到与签退</p>
            <Link
              href="/create"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--ink)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--ink-deep)]"
            >
              新建活动 <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {activities.map((a, i) => (
              <ActivityCard key={a.id} activity={a} index={i} onDelete={() => handleDelete(a)} />
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}

