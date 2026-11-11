import React from 'react';
import { useLocation, Link } from 'wouter';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
  const [location] = useLocation();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[var(--ink-deep)] text-white">
      <div className="paper-grain pointer-events-none absolute inset-0 opacity-20" />
      <div className="absolute -top-20 h-72 w-72 rounded-full bg-[var(--ink-soft)] opacity-40 blur-3xl" />
      <div className="relative z-10 text-center">
        <FileQuestion className="mx-auto h-14 w-14 text-white/30" strokeWidth={1.4} />
        <div className="font-display mt-6 text-7xl font-black">404</div>
        <p className="mt-3 text-sm text-white/60">页面 {location} 不存在</p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-xl bg-white px-6 py-3 text-sm font-bold text-[var(--ink)] transition-transform hover:-translate-y-0.5"
        >
          返回活动总览
        </Link>
      </div>
    </div>
  );
}

