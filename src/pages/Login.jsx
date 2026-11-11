import React, { useEffect, useState } from 'react';
import { Link, Redirect, useLocation } from 'wouter';
import { toast } from 'sonner';
import { ArrowLeft, Eye, EyeOff, KeyRound, BadgeCheck } from 'lucide-react';
import { useAuth, ROLE_LABEL, consumeAfterLogin, getSelectedRole, clearSelectedRole, USERNAME_RE, PASSWORD_RE } from '../lib/auth';
import { cn } from '../lib/utils';

const inputCls =
  'w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3 text-sm text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--ink-soft)]/40 focus:border-[var(--ink)] focus:ring-2 focus:ring-[var(--ink)]/10';

function parseRole(loc) {
  const qs = loc.split('?')[1] || '';
  const v = new URLSearchParams(qs).get('role');
  return v === 'designer' || v === 'user' ? v : null;
}

/** 登录后：优先回跳被拦截页（仅当权限相符），否则进入角色默认工作台 */
function landingFor(role, from) {
  if (from && role === 'designer' && (from === '/' || from.startsWith('/create') || from.startsWith('/activity'))) return from;
  if (from && role === 'user' && from === '/me') return from;
  return role === 'designer' ? '/' : '/me';
}

const FIELD_ERR = {
  EMPTY_ACCOUNT: '请填写账号',
  BAD_FORMAT: '账号需 2-20 位，且不能包含空格与 @',
  EMPTY_PWD: '请填写密码',
  PWD_FORMAT: '密码需 6-20 位',
  CONFIRM: '两次输入的密码不一致',
};

export default function Login() {
  const [loc, setLocation] = useLocation();
  // 身份优先级：URL 参数 → 欢迎页保存的身份标记；二者皆无则回到欢迎页重新选择
  const role = parseRole(loc) || getSelectedRole();
  const register = useAuth((s) => s.register);
  const login = useAuth((s) => s.login);
  const resetPassword = useAuth((s) => s.resetPassword);

  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [lockSec, setLockSec] = useState(0);
  const [fieldErr, setFieldErr] = useState(null);
  const [apiErr, setApiErr] = useState(null);

  useEffect(() => {
    if (lockSec <= 0) return undefined;
    const timer = setInterval(() => setLockSec((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [lockSec]);

  if (!role) return <Redirect to="/welcome" />;

  const clearErrs = () => {
    setFieldErr(null);
    setApiErr(null);
  };

  const validateAccount = () => {
    if (!username.trim()) return 'EMPTY_ACCOUNT';
    if (!USERNAME_RE.test(username.trim())) return 'BAD_FORMAT';
    if (!password) return 'EMPTY_PWD';
    if (!PASSWORD_RE.test(password)) return 'PWD_FORMAT';
    return null;
  };

  const handleLogin = (e) => {
    e.preventDefault();
    clearErrs();
    const bad = validateAccount();
    if (bad) return setFieldErr(bad);
    const r = login({ role, username, password });
    if (!r.ok) {
      if (r.error === 'LOCKED' || r.error === 'LOCKED_NOW') {
        setLockSec(Math.max(1, Math.ceil((r.remainMs || 0) / 1000)));
        setApiErr(null);
        return;
      }
      if (r.error === 'ROLE_MISMATCH') {
        setApiErr('该账号注册的身份是「' + ROLE_LABEL[r.actualRole] + '」，请返回重新选择身份');
        return;
      }
      setApiErr('账号或密码不正确');
      return;
    }
    toast.success('登录成功，欢迎回来，' + r.account.display);
    clearSelectedRole();
    setLocation(landingFor(role, consumeAfterLogin()));
  };

  const handleRegister = (e) => {
    e.preventDefault();
    clearErrs();
    let bad = validateAccount();
    if (bad === 'PWD_FORMAT' && !password) bad = 'EMPTY_PWD';
    if (bad) return setFieldErr(bad);
    if (password !== confirm) return setFieldErr('CONFIRM');
    const r = register({ role, username, nickname, password });
    if (!r.ok) {
      setApiErr('该账号已被注册，换个账号或直接登录');
      return;
    }
    toast.success('注册成功，已进入' + ROLE_LABEL[role] + '工作台');
    clearSelectedRole();
    setLocation(landingFor(role, consumeAfterLogin()));
  };

  const handleReset = (e) => {
    e.preventDefault();
    clearErrs();
    if (!username.trim()) return setFieldErr('EMPTY_ACCOUNT');
    if (!PASSWORD_RE.test(password)) return setFieldErr(password ? 'PWD_FORMAT' : 'EMPTY_PWD');
    if (password !== confirm) return setFieldErr('CONFIRM');
    const r = resetPassword({ username, password });
    if (!r.ok) {
      setApiErr('未注册该账号，请先注册或返回重新选择身份');
      return;
    }
    toast.success('密码已重置，请使用新密码登录');
    setMode('login');
    setPassword('');
    setConfirm('');
  };

  const submit = mode === 'login' ? handleLogin : mode === 'register' ? handleRegister : handleReset;

  const modeTabs = [
    { key: 'login', label: '登录' },
    { key: 'register', label: '注册' },
  ];

  const isReset = mode === 'reset';
  const ctaText = mode === 'login' ? '登录' : mode === 'register' ? '注册并进入' : '重置密码';

  return (
    <div className="relative flex min-h-screen flex-col bg-[var(--ink-deep)]">
      <div className="paper-grain pointer-events-none absolute inset-0 opacity-25" />
      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <Link href="/welcome" className="inline-flex items-center gap-1.5 text-sm text-white/70 transition-colors hover:text-white">
          <ArrowLeft className="h-4 w-4" /> 重新选择身份
        </Link>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--seal)] px-3 py-1 text-xs font-bold text-white">
          <BadgeCheck className="h-3.5 w-3.5" /> {ROLE_LABEL[role]}登录
        </span>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-5 pb-16">
        <form
          onSubmit={submit}
          className="animate-fade-up w-full max-w-md rounded-3xl bg-[var(--card)] p-7 shadow-2xl"
        >
          <div className="text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--seal)] font-display text-xl font-bold text-white">签</span>
            <h1 className="mt-3 font-display text-2xl font-black text-[var(--ink)]">
              {isReset ? '重置账号密码' : '以「' + ROLE_LABEL[role] + '」身份登录'}
            </h1>
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--ink-soft)]">
              {mode === 'register'
                ? '创建一个' + ROLE_LABEL[role] + '账号（昵称将作为现场签到登记姓名，可后续自行区分）'
                : '账号与密码仅保存在本设备浏览器中，非真实服务器认证'}
            </p>
          </div>

          {/* 登录/注册切换 */}
          {!isReset && (
            <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-[var(--paper)] p-1">
              {modeTabs.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => { clearErrs(); setMode(t.key); }}
                  className={cn(
                    'rounded-lg py-2 text-sm transition-colors',
                    mode === t.key ? 'bg-[var(--ink)] font-medium text-white' : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
          {isReset && (
            <div className="mt-5 rounded-xl bg-[var(--warn-soft)] px-4 py-2.5 text-xs leading-relaxed text-[var(--warn)]">
              本地模拟环境下忘记密码可直接重置：输入账号与新密码即可解除锁定；重置仅对本设备有效。
            </div>
          )}

          <div className="mt-5 space-y-4">
            <div>
              <label className="text-sm font-medium text-[var(--ink)]">账号</label>
              <input
                className={cn(inputCls, 'mt-1.5')}
                placeholder="2-20 位，不含空格与 @"
                value={username}
                autoComplete="off"
                maxLength={20}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="text-sm font-medium text-[var(--ink)]">昵称（选填）</label>
                <input
                  className={cn(inputCls, 'mt-1.5')}
                  placeholder="留空则与账号相同；将用于现场登记"
                  value={nickname}
                  maxLength={20}
                  onChange={(e) => setNickname(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-[var(--ink)]">{isReset ? '新密码' : '密码'}</label>
              <div className="relative mt-1.5">
                <input
                  type={showPwd ? 'text' : 'password'}
                  className={cn(inputCls, 'pr-11')}
                  placeholder={mode === 'register' || isReset ? '6-20 位，含字母数字符号均可' : '请输入密码'}
                  value={password}
                  autoComplete="off"
                  maxLength={20}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]/60 transition-colors hover:text-[var(--ink)]"
                  title={showPwd ? '隐藏密码' : '显示密码'}
                >
                  {showPwd ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            {(mode === 'register' || isReset) && (
              <div>
                <label className="text-sm font-medium text-[var(--ink)]">确认密码</label>
                <input
                  type={showPwd ? 'text' : 'password'}
                  className={cn(inputCls, 'mt-1.5')}
                  placeholder="再输入一次密码"
                  value={confirm}
                  autoComplete="off"
                  maxLength={20}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* 错误提示 */}
          {(fieldErr || apiErr) && (
            <p className="mt-4 rounded-xl bg-[var(--seal-soft)] px-4 py-2.5 text-xs leading-relaxed text-[var(--seal)]">
              {fieldErr ? FIELD_ERR[fieldErr] : apiErr}
            </p>
          )}

          <button
            type="submit"
            disabled={lockSec > 0}
            className="mt-6 w-full rounded-xl bg-[var(--seal)] py-3 font-bold text-white shadow-[0_4px_14px_rgba(184,68,44,0.35)] transition-all hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:brightness-100"
          >
            {lockSec > 0 ? '已锁定，请 ' + lockSec + ' 秒后重试' : ctaText}
          </button>

          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-[var(--ink-soft)]">
            {isReset ? (
              <button
                type="button"
                onClick={() => { clearErrs(); setMode('login'); }}
                className="inline-flex items-center gap-1 hover:text-[var(--ink)]"
              >
                <ArrowLeft className="h-3 w-3" /> 返回登录
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { clearErrs(); setMode('reset'); }}
                className="inline-flex items-center gap-1 hover:text-[var(--ink)]"
              >
                <KeyRound className="h-3 w-3" /> 忘记密码？
              </button>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}

