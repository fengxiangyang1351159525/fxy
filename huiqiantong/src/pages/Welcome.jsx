import React from 'react';
import { Link, Redirect } from 'wouter';
import { PenTool, UserRound, ArrowRight, Laptop } from 'lucide-react';
import { useAuth, peekAfterLogin, saveSelectedRole } from '../lib/auth';

const ROLES = [
  {
    key: 'designer',
    icon: PenTool,
    name: '设计者',
    duty: '活动组织方',
    desc: '创建活动、维护参会人名单、生成签到码，掌握全程签到与签退统计。',
    href: '/login?role=designer',
    cta: '以设计者身份进入',
  },
  {
    key: 'user',
    icon: UserRound,
    name: '使用者',
    duty: '参会个人',
    desc: '加入活动并自助签到入场、签退离场，随时查看我的出勤记录。',
    href: '/login?role=user',
    cta: '以使用者身份进入',
  },
];

export default function Welcome() {
  const session = useAuth((s) => s.session);
  const from = peekAfterLogin();

  // 已登录则不再选身份，直接回到对应工作台
  if (session) return <Redirect to={session.role === 'designer' ? '/' : '/me'} />;

  return (
    <div className="relative flex min-h-screen flex-col bg-[var(--ink-deep)]">
      <div className="paper-grain pointer-events-none absolute inset-0 opacity-25" />
      <header className="relative z-10 flex items-center px-6 py-5">
        <Link href="/" className="flex items-center gap-2.5 text-white transition-opacity hover:opacity-80">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--seal)] font-display text-base font-bold">签</span>
          <span className="font-display text-base font-bold">会签通</span>
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 pb-16">
        <div className="text-center">
          <p className="text-xs tracking-[0.4em] text-white/40">CHOOSE · YOUR · IDENTITY</p>
          <h1 className="mt-3 font-display text-3xl font-black text-white md:text-4xl">进入会签通，请先选择身份</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/60">
            {from ? '为继续访问上次页面，请先选择身份并登录。' : '设计者管理签到流程与统计；使用者以个人账号参与活动。'}
          </p>
          {from && (
            <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-xl border border-[var(--warn)]/40 bg-[var(--warn-soft)] px-4 py-2 text-xs text-[var(--warn)]">
              登录后将继续访问：{from}
            </div>
          )}
        </div>

        {/* 身份选择卡片 */}
        <div className="mt-10 grid w-full max-w-3xl gap-4 sm:grid-cols-2">
          {ROLES.map((r, i) => (
            <Link
              key={r.key}
              href={r.href}
              onClick={() => saveSelectedRole(r.key)}
              className="group animate-fade-up relative overflow-hidden rounded-2xl bg-[var(--card)] p-6 text-left shadow-2xl transition-transform hover:-translate-y-1"
              style={{ animationDelay: (i * 100 + 60) + 'ms' }}
            >
              <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-[var(--seal)]/10" />
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--ink)] text-white">
                  <r.icon className="h-6 w-6" strokeWidth={1.8} />
                </span>
                <div>
                  <div className="font-display text-xl font-black text-[var(--ink)]">{r.name}</div>
                  <div className="text-xs text-[var(--ink-soft)]">{r.duty}</div>
                </div>
              </div>
              <p className="mt-4 min-h-[44px] text-sm leading-relaxed text-[var(--ink-soft)]">{r.desc}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--seal)]">
                {r.cta}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>

        <p className="mt-8 flex items-center gap-2 text-xs text-white/45">
          <Laptop className="h-3.5 w-3.5" />
          现场签到台无需登录，放至会场入口即可供参会人签到 —
          <Link href="/kiosk" className="underline underline-offset-2 hover:text-white/80">直接前往</Link>
        </p>
        <p className="mt-2 text-[11px] text-white/30">账号与数据仅保存在本设备浏览器中</p>
      </main>
    </div>
  );
}

