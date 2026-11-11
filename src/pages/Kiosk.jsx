import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { toast } from 'sonner';
import {
  LogIn, LogOut, Delete, CornerDownLeft, UserPlus, ArrowLeft,
  Clock3, MapPin, BadgeCheck, UserX, ScanLine,
} from 'lucide-react';
import QrScanner from '../components/QrScanner';
import { useStore } from '../lib/store';
import { cn, fmtDateTime, fmtClock } from '../lib/utils';
import { parseCodeText } from '../lib/qrcode';

/* ---------------- 阶段一：输入签到码 ---------------- */

function CodeScreen() {
  const [loc] = useLocation();
  const autoRef = useRef(false);
  const [code, setCode] = useState('');

  // 活动二维码直达：/kiosk?code=123456 自动进入该活动
  useEffect(() => {
    if (autoRef.current) return;
    autoRef.current = true;
    const qs = loc.split('?')[1] || '';
    const fromUrl = new URLSearchParams(qs).get('code');
    if (!fromUrl || !/^[0-9]{6}$/.test(fromUrl)) return;
    const found = useStore.getState().activities.find((a) => a.code === fromUrl);
    if (found) {
      toast.success('已扫码进入「' + found.name + '」签到台');
      useStore.setState({ kioskActivityId: found.id });
    } else {
      toast.error('链接中的签到码无效，或本设备没有该活动数据');
    }
  }, [loc]);

  useEffect(() => {
    const onKey = (e) => {
      if (/^[0-9]$/.test(e.key)) setCode((c) => (c.length < 6 ? c + e.key : c));
      else if (e.key === 'Backspace') setCode((c) => c.slice(0, -1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // 输满 6 位自动校验
  useEffect(() => {
    if (code.length < 6) return;
    const found = useStore.getState().activities.find((a) => a.code === code);
    if (found) {
      setCode('');
      useStore.setState({ kioskActivityId: found.id });
    } else {
      toast.error('签到码无效，请核对后重新输入');
      setCode('');
    }
  }, [code]);

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '←'];

  const press = (k) => {
    if (k === 'C') setCode('');
    else if (k === '←') setCode((c) => c.slice(0, -1));
    else setCode((c) => (c.length < 6 ? c + k : c));
  };

  return (
    <div className="mx-auto max-w-md text-center">
      <p className="text-xs tracking-[0.4em] text-white/40">INPUT · CHECK · IN · CODE</p>
      <h1 className="mt-3 font-display text-3xl font-black">请输入现场签到码</h1>
      <p className="mt-2 text-sm text-white/60">由会议组织者公布，输入后进入签到 / 签退</p>

      {/* 6 位码 */}
      <div className="mt-8 flex justify-center gap-2.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'font-mono-num flex h-16 w-13 items-center justify-center rounded-xl border-2 bg-white/95 text-3xl font-bold text-[var(--ink)] transition-all duration-200',
              code.length === i && 'animate-pulse border-[var(--seal)]',
              code.length !== i && 'border-transparent',
              code.length > i && 'shadow-[0_2px_0_rgba(0,0,0,0.2)]'
            )}
            style={{ width: 52, height: 64 }}
          >
            {code[i] || ''}
          </div>
        ))}
      </div>

      {/* 数字键盘 */}
      <div className="mx-auto mt-8 grid max-w-xs grid-cols-3 gap-2.5">
        {keys.map((k) => (
          <button
            key={k}
            onClick={() => press(k)}
            className={cn(
              'font-mono-num flex h-14 items-center justify-center rounded-xl text-xl font-semibold transition-all active:scale-95',
              k === 'C' || k === '←'
                ? 'bg-white/10 text-white/70 hover:bg-white/15'
                : 'bg-white text-[var(--ink)] shadow-[0_3px_0_rgba(0,0,0,0.25)] hover:bg-white/90'
            )}
          >
            {k === '←' ? <Delete className="h-5 w-5" /> : k}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- 阶段二：签到 / 签退面板 ---------------- */

function StatusBadge({ status }) {
  const map = {
    pending: ['bg-[var(--warn-soft)] text-[var(--warn)]', '未签到'],
    in: ['bg-[var(--ok-soft)] text-[var(--ok)]', '已入场'],
    out: ['bg-[var(--line)] text-[var(--ink-soft)]', '已离场'],
  };
  const [cls, label] = map[status];
  return <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', cls)}>{label}</span>;
}

function PanelScreen({ activityId, onSwitch }) {
  const activity = useStore((s) => s.activities.find((a) => a.id === activityId));
  const allAttendees = useStore((s) => s.attendees);
  const checkIn = useStore((s) => s.checkInAttendee);
  const checkOut = useStore((s) => s.checkOutAttendee);
  const addAttendee = useStore((s) => s.addAttendee);
  const reset = useStore((s) => s.resetAttendee);

  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [flash, setFlash] = useState(null); // {type:'in'|'out', name, time, viaQr}
  const inputRef = useRef(null);
  const [now, setNow] = useState(Date.now());

  const attendees = useMemo(
    () => allAttendees.filter((t) => t.activityId === activityId),
    [allAttendees, activityId]
  );
  const selected = attendees.find((t) => t.id === selectedId) || null;

  // 现场实时时钟
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 自动聚焦搜索框
  useEffect(() => {
    inputRef.current?.focus();
  }, [selectedId, flash]);

  const matches = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return attendees.filter((t) => t.name.includes(q)).slice(0, 6);
  }, [attendees, query]);

  // 成功提示 2.4s 自动复位
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => {
      setFlash(null);
      setQuery('');
      setSelectedId(null);
    }, 2400);
    return () => clearTimeout(t);
  }, [flash]);

  if (!activity) {
    return (
      <div className="text-center">
        <p className="font-display text-2xl font-bold">活动已被移除</p>
        <button onClick={onSwitch} className="mt-5 rounded-xl bg-white px-6 py-3 font-medium text-[var(--ink)]">返回签到台主页</button>
      </div>
    );
  }

  const pick = (t) => {
    setSelectedId(t.id);
    setQuery('');
  };

  const doAction = () => {
    if (!selected) return;
    if (selected.status === 'pending') {
      checkIn(selected.id, 'kiosk');
      setFlash({ type: 'in', name: selected.name, time: Date.now() });
    } else if (selected.status === 'in') {
      checkOut(selected.id, 'kiosk');
      setFlash({ type: 'out', name: selected.name, time: Date.now() });
    }
  };

  const registerNew = () => {
    const id = addAttendee(activityId, { name: query.trim() });
    if (!id) return;
    checkIn(id, 'kiosk');
    setFlash({ type: 'in', name: query.trim(), time: Date.now(), registered: true });
  };

  /** 扫码回调：个人码直接登记；活动码负责切换签到台 */
  const handleScanText = (text) => {
    const parsed = parseCodeText(text);
    if (!parsed) {
      toast.warning('未识别为会签通二维码，请对准码后重试');
      setScanning(false);
      return;
    }
    if (parsed.kind === 'activity') {
      setScanning(false);
      const found = useStore.getState().activities.find((a) => a.code === parsed.code);
      if (found && found.id === activityId) {
        toast.info('当前签到台就是「' + found.name + '」，请参出个人码即可');
        return;
      }
      if (found) {
        useStore.setState({ kioskActivityId: found.id });
        toast.success('已切换到活动「' + found.name + '」签到台');
      } else {
        toast.error('该活动签到码无效，或本设备没有该活动数据');
      }
      return;
    }
    // 个人码：识别参会人记录
    const t = useStore.getState().attendees.find((x) => x.id === parsed.attendeeId);
    setScanning(false);
    if (!t) {
      toast.error('未找到该参会记录：此码来自其它设备的数据，或相关活动已删除');
      return;
    }
    if (t.activityId !== activityId) {
      const act = useStore.getState().activities.find((a) => a.id === t.activityId);
      if (act) {
        useStore.setState({ kioskActivityId: act.id });
        toast.warning('该码属于活动「' + act.name + '」，签到台已切换');
      } else {
        toast.error('此码所属活动在本设备不存在');
      }
      return;
    }
    if (t.status === 'pending') {
      checkIn(t.id, 'qrcode');
      setFlash({ type: 'in', name: t.name, time: Date.now(), viaQr: true });
    } else if (t.status === 'in') {
      checkOut(t.id, 'qrcode');
      setFlash({ type: 'out', name: t.name, time: Date.now(), viaQr: true });
    } else {
      toast.warning(t.name + ' 已完成本次出席，如需重置请在活动详情页操作');
    }
  };

  return (
    <div className="relative mx-auto grid w-full max-w-3xl gap-5">
      {/* 顶部活动信息条 */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/10 px-5 py-4 text-white backdrop-blur">
        <div className="min-w-0">
          <div className="font-display text-xl font-bold truncate">{activity.name}</div>
          <div className="mt-0.5 flex flex-wrap gap-x-4 text-xs text-white/60">
            <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{fmtDateTime(activity.startAt)} — {fmtDateTime(activity.endAt)}</span>
            {activity.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{activity.location}</span>}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="font-mono-num text-2xl font-bold">{fmtClock(now)}</div>
          <button onClick={onSwitch} className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-3 py-2 text-xs text-white/80 hover:bg-white/10">
            <ArrowLeft className="h-3.5 w-3.5" /> 换活动
          </button>
        </div>
      </div>

      {/* 签到操作卡 */}
      <div className="rounded-3xl bg-[var(--card)] p-6 shadow-2xl">
        {!selected && !flash && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-bold text-[var(--ink)]">请输入参会人姓名</label>
              <button
                onClick={() => setScanning(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--ink)] px-3.5 py-2 text-xs font-bold text-white transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <ScanLine className="h-4 w-4" /> 扫码签到
              </button>
            </div>
            <p className="mt-1 text-xs text-[var(--ink-soft)]">到场选人签到，离场再次选人签退；也支持扫描参会人个人二维码；名单中没有的人可现场登记。</p>
            <div className="relative mt-4">
              <input
                ref={inputRef}
                className="w-full rounded-2xl border-2 border-[var(--line)] bg-[var(--paper)] px-5 py-4 text-2xl font-bold text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--ink-soft)]/30 focus:border-[var(--ink)]"
                placeholder="输入姓名或拼音首字…"
                value={query}
                maxLength={20}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  if (matches.length > 0) pick(matches[0]);
                  else if (query.trim()) registerNew();
                }}
              />
            </div>

            {/* 匹配结果 */}
            <div className="mt-4 space-y-2">
              {query.trim() && matches.length === 0 && (
                <button
                  onClick={registerNew}
                  className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-[var(--ink-soft)]/40 px-4 py-3 text-left transition-colors hover:border-[var(--ink)] hover:bg-[var(--paper)]"
                >
                  <UserPlus className="h-5 w-5 text-[var(--seal)]" />
                  <span className="text-sm">
                    名单中暂无「<b>{query.trim()}</b>」，点击登记并签到入场
                  </span>
                </button>
              )}
              {matches.map((t) => (
                <button
                  key={t.id}
                  onClick={() => pick(t)}
                  className="flex w-full items-center gap-3 rounded-xl border border-[var(--line)] px-4 py-3 text-left transition-all hover:border-[var(--ink)] hover:bg-[var(--paper)]"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--ink)] text-sm font-bold text-white">{t.name.slice(0, 1)}</span>
                  <span className="flex-1">
                    <span className="block text-sm font-bold">{t.name}</span>
                    {t.tag && <span className="text-xs text-[var(--ink-soft)]">{t.tag}</span>}
                  </span>
                  {t.status !== 'pending' && (
                    <span className="font-mono-num text-xs text-[var(--ink-soft)]">
                      {t.status === 'in' ? `${fmtClock(t.checkinAt)}入场` : `${fmtClock(t.checkinAt)}入 / ${fmtClock(t.checkoutAt)}出`}
                    </span>
                  )}
                  <StatusBadge status={t.status} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 选中确认 */}
        {selected && !flash && (
          <div className="animate-fade-up text-center">
            <p className="text-xs tracking-widest text-[var(--ink-soft)]">本次操作对象</p>
            <div className="mt-3 inline-flex flex-col items-center">
              <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--ink)] font-display text-3xl font-bold text-white">{selected.name.slice(0, 1)}</span>
              <span className="mt-3 font-display text-2xl font-black">{selected.name}</span>
              {selected.tag && <span className="mt-0.5 text-sm text-[var(--ink-soft)]">{selected.tag}</span>}
              <span className="mt-2"><StatusBadge status={selected.status} /></span>
              {selected.status === 'in' && (
                <span className="font-mono-num mt-1 text-xs text-[var(--ink-soft)]">于 {fmtClock(selected.checkinAt)} 入场</span>
              )}
              {selected.status === 'out' && (
                <span className="font-mono-num mt-1 text-xs text-[var(--ink-soft)]">
                  于 {fmtClock(selected.checkinAt)} 入场 · {fmtClock(selected.checkoutAt)} 离场
                </span>
              )}
            </div>

            {selected.status === 'pending' && (
              <button
                onClick={doAction}
                className="animate-ring mt-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-[var(--ok)] py-5 font-display text-2xl font-black text-white shadow-[0_6px_20px_rgba(30,127,79,0.4)] transition-transform hover:scale-[1.02] active:scale-95"
              >
                <LogIn className="h-7 w-7" /> 签到入场
              </button>
            )}
            {selected.status === 'in' && (
              <button
                onClick={doAction}
                className="animate-ring mt-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-[var(--seal)] py-5 font-display text-2xl font-black text-white shadow-[0_6px_20px_rgba(184,68,44,0.4)] transition-transform hover:scale-[1.02] active:scale-95"
              >
                <LogOut className="h-7 w-7" /> 签退离场
              </button>
            )}
            {selected.status === 'out' && (
              <div className="mt-6 rounded-2xl bg-[var(--paper)] px-4 py-4 text-sm text-[var(--ink-soft)]">
                <span className="inline-flex items-center justify-center gap-2 font-medium text-[var(--ink)]"><BadgeCheck className="h-4 w-4 text-[var(--ok)]" />已完成本次出席记录</span>
                <button
                  onClick={() => { reset(selected.id); toast.success(`${selected.name} 已重置，可重新签到`); }}
                  className="mt-2 block w-full text-xs underline underline-offset-2 hover:text-[var(--ink)]"
                >
                  记录有误？重置为未签到
                </button>
              </div>
            )}
            <button
              onClick={() => setSelectedId(null)}
              className="mt-3 inline-flex items-center gap-1 text-sm text-[var(--ink-soft)] hover:text-[var(--ink)]"
            >
              <UserX className="h-4 w-4" /> 换一位
            </button>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-white/40">本页为现场签到台，操作将实时同步到活动统计</p>

      {/* 摄像头扫码浮层 */}
      {scanning && (
        <QrScanner
          onText={handleScanText}
          onClose={() => setScanning(false)}
        />
      )}

      {/* 盖章成功弹层 */}
      {flash && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-[var(--ink-deep)]/80 backdrop-blur-sm">
          <div className="animate-stamp relative rounded-[28px] border-4 border-[var(--seal)] bg-white px-12 py-9 text-center shadow-2xl">
            <div className="pointer-events-none absolute inset-3 rounded-[20px] border-2 border-[var(--seal)]/40" />
            <span className={cn(
              'mx-auto flex h-16 w-16 items-center justify-center rounded-full',
              flash.type === 'in' ? 'bg-[var(--ok-soft)] text-[var(--ok)]' : 'bg-[var(--seal-soft)] text-[var(--seal)]'
            )}>
              {flash.type === 'in' ? <LogIn className="h-8 w-8" strokeWidth={2.4} /> : <LogOut className="h-8 w-8" strokeWidth={2.4} />}
            </span>
            <p className="mt-4 font-display text-3xl font-black text-[var(--seal)]">
              {flash.type === 'in' ? '签到成功' : '签退成功'}
            </p>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">{flash.name} · {fmtClock(flash.time)}</p>
            <p className="mt-3 text-[11px] font-bold tracking-widest text-[var(--ok)]">
              {flash.viaQr ? '扫码识别 · 自动登记' : '现场登记'}
            </p>
            <p className="mt-3 font-mono-num text-[11px] tracking-[0.2em] text-[var(--ink-soft)]/60">HUIQIANTONG · {flash.type === 'in' ? 'CHECK-IN' : 'CHECK-OUT'} · {fmtClock(flash.time)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Kiosk() {
  const kioskActivityId = useStore((s) => s.kioskActivityId);
  const clearKiosk = () => useStore.setState({ kioskActivityId: null });

  return (
    <div className="relative flex min-h-screen flex-col bg-[var(--ink-deep)]">
      <div className="paper-grain pointer-events-none absolute inset-0 opacity-25" />
      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2.5 text-white transition-opacity hover:opacity-80">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--seal)] font-display text-base font-bold">签</span>
          <span className="font-display text-base font-bold">会签通 · 现场签到台</span>
        </Link>
        {kioskActivityId && (
          <button onClick={clearKiosk} className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-3 py-2 text-xs text-white/80 hover:bg-white/10">
            <CornerDownLeft className="h-3.5 w-3.5" /> 重新输入签到码
          </button>
        )}
      </header>

      <main className="relative z-10 flex flex-1 items-start justify-center px-5 pb-14 pt-2">
        {kioskActivityId ? <PanelScreen activityId={kioskActivityId} onSwitch={clearKiosk} /> : <CodeScreen />}
      </main>
    </div>
  );
}

