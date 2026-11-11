import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { QRCodeCanvas } from 'qrcode.react';
import {
  UserRound, QrCode, LogIn, LogOut, BadgeCheck, Clock3, MapPin, Hand, CircleDot, X, ScanLine,
} from 'lucide-react';
import Layout from '../components/Layout';
import { useStore } from '../lib/store';
import { useAuth } from '../lib/auth';
import { cn, fmtDateTime, fmtClock, activityStatus, STATUS_LABEL } from '../lib/utils';
import { buildAttendeeCodeUrl } from '../lib/qrcode';

const METHOD_LABEL = { kiosk: '签到台', manual: '手动登记', self: '自助', qrcode: '扫码' };

export default function MyAttendance() {
  const session = useAuth((s) => s.session);
  const allAttendees = useStore((s) => s.attendees);
  const activities = useStore((s) => s.activities);
  const checkIn = useStore((s) => s.checkInAttendee);
  const checkOut = useStore((s) => s.checkOutAttendee);
  const joinActivityAsAccount = useStore((s) => s.joinActivityAsAccount);
  const findActivityByCode = useStore((s) => s.findActivityByCode);

  const [code, setCode] = useState('');
  const [qrFor, setQrFor] = useState(null); // 出示个人码的场次 { attendee, activity }

  const personUrl = (x) => buildAttendeeCodeUrl(x.activity.id, x.attendee.id);

  // 我的出勤记录（含自助加入与设计者代登记关联的记录）
  const mine = useMemo(() => {
    if (!session?.accountId) return [];
    return allAttendees
      .filter((t) => t.accountId === session.accountId)
      .map((t) => ({ attendee: t, activity: activities.find((a) => a.id === t.activityId) }))
      .filter((x) => x.activity)
      .sort((a, b) => (b.activity.startAt || 0) - (a.activity.startAt || 0));
  }, [allAttendees, activities, session]);

  const stat = useMemo(() => ({
    total: mine.length,
    checkedIn: mine.filter((x) => x.attendee.status !== 'pending').length,
    done: mine.filter((x) => x.attendee.status === 'out').length,
  }), [mine]);

  const joinActivity = () => {
    const codeVal = code.trim();
    if (!/^[0-9]{6}$/.test(codeVal)) {
      toast.warning('请输入 6 位数字签到码');
      return;
    }
    const act = findActivityByCode(codeVal);
    const r = joinActivityAsAccount(
      act ? act.id : '',
      { name: session.display, tag: '账号加入', accountId: session.accountId }
    );
    if (r.ok) {
      toast.success('已加入「' + act.name + '」，现在可以自助签到入场');
      setCode('');
      return;
    }
    if (r.reason === 'ALREADY_JOINED') toast.warning('你已在「' + act.name + '」中，无需重复加入');
    else if (r.reason === 'ACTIVITY_ENDED') toast.warning('该活动已结束，无法再加入');
    else toast.error('签到码无效，请核对后重试');
  };

  const doSelfCheck = (x) => {
    if (x.attendee.status === 'pending') {
      checkIn(x.attendee.id, 'self');
      toast.success('签到成功，' + fmtClock(Date.now()) + ' 已入场');
    } else if (x.attendee.status === 'in') {
      checkOut(x.attendee.id, 'self');
      toast.success('签退成功，' + fmtClock(Date.now()) + ' 已离场');
    }
  };

  return (
    <Layout>
      {/* 个人条 */}
      <section className="relative overflow-hidden rounded-3xl bg-[var(--ink-deep)] p-6 text-white md:p-7">
        <div className="paper-grain pointer-events-none absolute inset-0 opacity-25" />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--seal)] font-display text-2xl font-bold">
              {(session?.display || '我').slice(0, 1)}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-black">{session?.display}</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/12 px-2.5 py-0.5 text-xs">
                  <UserRound className="h-3 w-3" /> 使用者
                </span>
              </div>
              <div className="mt-1 font-mono-num text-sm text-white/60">@{session?.username}</div>
            </div>
          </div>
          <div className="flex gap-3">
            {[
              { label: '我的场次', value: stat.total },
              { label: '已签到', value: stat.checkedIn },
              { label: '全程完成', value: stat.done },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-white/10 px-5 py-3 text-center backdrop-blur">
                <div className="font-mono-num text-2xl font-bold">{s.value}</div>
                <div className="mt-0.5 text-[11px] text-white/60">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 输入签到码加入活动 */}
      <section className="mt-5 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5">
        <div className="flex items-center gap-2 font-display font-bold">
          <QrCode className="h-4 w-4 text-[var(--seal)]" /> 加入活动
        </div>
        <p className="mt-1 text-xs text-[var(--ink-soft)]">向设计者索取 6 位签到码，输入加入活动后即可自助签到入场、签退离场。</p>
        <div className="mt-3 flex gap-2">
          <input
            className="font-mono-num flex-1 rounded-xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-lg font-bold tracking-[0.3em] text-[var(--ink)] outline-none transition-colors placeholder:font-normal placeholder:tracking-normal placeholder:text-[var(--ink-soft)]/40 focus:border-[var(--ink)]"
            placeholder="6 位签到码"
            value={code}
            maxLength={6}
            inputMode="numeric"
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
            onKeyDown={(e) => e.key === 'Enter' && joinActivity()}
          />
          <button
            onClick={joinActivity}
            className="shrink-0 rounded-xl bg-[var(--seal)] px-6 font-bold text-white shadow-[0_4px_14px_rgba(184,68,44,0.35)] transition-all hover:-translate-y-0.5 hover:brightness-110"
          >
            加入活动
          </button>
        </div>
      </section>

      {/* 我的出勤记录 */}
      <section className="mt-5">
        <div className="flex items-end justify-between border-b-2 border-[var(--ink)] pb-2">
          <h2 className="inline-flex items-center gap-2 font-display text-xl font-bold">
            <CircleDot className="h-4 w-4 text-[var(--seal)]" /> 我的出勤
          </h2>
          <span className="text-xs text-[var(--ink-soft)]">按活动日期倒序</span>
        </div>

        {mine.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--card)] px-6 py-14 text-center">
            <p className="font-display text-lg font-bold text-[var(--ink)]">还没有加入任何活动</p>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">输入设计者公布的 6 位签到码即可加入</p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {mine.map((x, i) => (
              <MyCard key={x.attendee.id} x={x} index={i} onSelf={doSelfCheck} onQr={setQrFor} />
            ))}
          </div>
        )}
      </section>

      {/* 个人参会码弹窗 */}
      {qrFor && (
        <div
          className="animate-fade-up fixed inset-0 z-40 flex items-center justify-center bg-[var(--ink-deep)]/85 px-5 backdrop-blur-sm"
          onClick={() => setQrFor(null)}
        >
          <div
            className="relative w-full max-w-sm rounded-3xl bg-[var(--card)] p-6 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setQrFor(null)}
              title="关闭"
              className="absolute right-3 top-3 rounded-lg p-2 text-[var(--ink-soft)] transition-colors hover:bg-[var(--paper)] hover:text-[var(--ink)]"
            >
              <X className="h-5 w-5" />
            </button>
            <p className="text-xs tracking-[0.3em] text-[var(--ink-soft)]">PERSONAL · CHECK · IN · CODE</p>
            <h3 className="mt-2 font-display text-xl font-black text-[var(--ink)]">{qrFor.attendee.name} 的个人参会码</h3>
            <p className="mt-1 text-xs text-[var(--ink-soft)]">{qrFor.activity.name}</p>
            <div className="mx-auto mt-4 w-fit rounded-2xl bg-white p-3 shadow-[0_2px_10px_rgba(18,41,75,0.12)]">
              <QRCodeCanvas
                value={personUrl(qrFor)}
                size={220}
                level="M"
                marginSize={2}
                fgColor="#12294b"
                title="个人参会码"
              />
            </div>
            <p className="mt-4 inline-flex items-center gap-1.5 text-xs leading-relaxed text-[var(--ink-soft)]">
              <ScanLine className="h-3.5 w-3.5 shrink-0 text-[var(--seal)]" />
              到现场签到台出示此码即可自动签到/签退；该码记录保存在本设备浏览器中
            </p>
          </div>
        </div>
      )}
    </Layout>
  );
}

function MyCard({ x, index, onSelf, onQr }) {
  const { attendee: t, activity } = x;
  const st = activityStatus(activity);
  const isUpcoming = st === 'upcoming';
  const isEnded = st === 'ended';

  const canCheckin = t.status === 'pending' && !isUpcoming && !isEnded;
  const canCheckout = t.status === 'in' && !isEnded;

  let hint = null;
  if (t.status === 'pending' && isUpcoming) hint = '活动未开始，' + fmtDateTime(activity.startAt) + ' 开放自助签到';
  else if ((t.status === 'pending' || t.status === 'in') && isEnded) hint = '活动已结束，如需补录请联系设计者';

  return (
    <div
      className="animate-fade-up group relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)] shadow-[0_1px_2px_rgba(18,41,75,0.05)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(18,41,75,0.10)]"
      style={{ animationDelay: (index * 60) + 'ms' }}
    >
      <div className="absolute inset-y-0 left-0 w-1.5 bg-[var(--ink)]" />
      <div className="p-5 pl-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-lg font-bold text-[var(--ink)]">{activity.name}</h3>
          <span className={cn(
            'rounded-full px-2 py-0.5 text-xs font-medium',
            st === 'ongoing' ? 'bg-[var(--ok-soft)] text-[var(--ok)]'
              : isUpcoming ? 'bg-[var(--warn-soft)] text-[var(--warn)]'
                : 'bg-[var(--line)] text-[var(--ink-soft)]'
          )}>
            {STATUS_LABEL[st]}
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-4 text-xs text-[var(--ink-soft)]">
          <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{fmtDateTime(activity.startAt)} — {fmtDateTime(activity.endAt)}</span>
          {activity.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{activity.location}</span>}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {t.tag && <span className="rounded bg-[var(--paper)] px-1.5 py-0.5 text-[var(--ink-soft)]">{t.tag}</span>}
          {t.method && (
            <span className="inline-flex items-center gap-0.5 text-[var(--ink-soft)]/60">
              <Hand className="h-3 w-3" /> {METHOD_LABEL[t.method] || t.method}
            </span>
          )}
          <span
            className={cn('font-mono-num', t.status === 'in' ? 'text-[var(--ok)]' : t.status === 'out' ? 'text-[var(--seal)]' : 'text-[var(--ink-soft)]')}
          >
            {t.status === 'pending' ? '未签到' : t.status === 'in' ? (fmtClock(t.checkinAt) + ' 入场') : (fmtClock(t.checkinAt) + ' 入 · ' + fmtClock(t.checkoutAt) + ' 出')}
          </span>
          <button
            onClick={() => onQr(x)}
            className="inline-flex items-center gap-1 font-bold text-[var(--seal)] underline-offset-2 hover:underline"
            title="出示个人参会二维码，到签到台扫码登记"
          >
            <QrCode className="h-3 w-3" /> 出示二维码
          </button>
        </div>

        <div className="mt-4">
          {t.status === 'out' ? (
            <div className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--paper)] px-4 py-3 text-sm font-medium text-[var(--ink-soft)]">
              <BadgeCheck className="h-4 w-4 text-[var(--ok)]" /> 已完成本次出席记录
            </div>
          ) : (
            <div>
              <button
                onClick={() => onSelf(x)}
                disabled={t.status === 'pending' ? !canCheckin : !canCheckout}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-xl py-3 font-bold transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
                  t.status === 'pending'
                    ? 'bg-[var(--ok)] text-white shadow-[0_4px_14px_rgba(30,127,79,0.3)] hover:brightness-110'
                    : 'bg-[var(--seal)] text-white shadow-[0_4px_14px_rgba(184,68,44,0.3)] hover:brightness-110'
                )}
              >
                {t.status === 'pending' ? <LogIn className="h-4.5 w-4.5" /> : <LogOut className="h-4.5 w-4.5" />}
                {t.status === 'pending' ? '自助签到入场' : '自助签退离场'}
              </button>
              {hint && <p className="mt-1.5 text-center text-[11px] text-[var(--warn)]">{hint}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

