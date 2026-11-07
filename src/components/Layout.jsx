import React from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '../lib/utils';

export default function Layout({ children, wide = false }) {
  const [location] = useLocation();
  const navs = [
    { href: '/', label: '活动总览', active: location === '/' || location.startsWith('/activity') },
    { href: '/create', label: '新建活动', active: location === '/create' },
    { href: '/kiosk', label: '现场签到台', active: location.startsWith('/kiosk') },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* 顶部导航 */}
      <header className="relative z-10 bg-[var(--ink)] text-white">
        <div className="paper-grain pointer-events-none absolute inset-0 opacity-20" />
        <div className={cn('relative mx-auto flex h-16 items-center justify-between px-5', wide ? 'max-w-6xl' : 'max-w-5xl')}>
          <Link href="/" className="flex items-center gap-3 group">
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--seal)] font-display text-lg font-bold shadow-[0_2px_0_rgba(0,0,0,0.25)] transition-transform group-hover:-rotate-6 group-hover:scale-105">
              签
            </span>
            <span className="leading-none">
              <span className="font-display text-lg font-bold tracking-wide">会签通</span>
              <span className="mt-0.5 block text-[11px] text-white/60 tracking-widest">会议活动签到统计</span>
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            {navs.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  'rounded-lg px-3.5 py-2 text-sm transition-colors',
                  n.active ? 'bg-white/12 font-medium text-white' : 'text-white/65 hover:text-white hover:bg-white/8'
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className={cn('relative mx-auto w-full flex-1 px-5 pb-16 pt-8', wide ? 'max-w-6xl' : 'max-w-5xl')}>
        {children}
      </main>

      <footer className="border-t border-[var(--line)] py-5 text-center text-xs text-[var(--ink-soft)]">
        会签通 · 数据保存在本设备浏览器中，请勿随意清除浏览器缓存
      </footer>
    </div>
  );
}

