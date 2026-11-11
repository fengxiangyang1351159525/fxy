import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// —— 本地模拟账号体系：账号与密码仅保存在本设备浏览器（localStorage），
//    密码以加盐双哈希落盘，非生产级安全；换设备或清缓存即不复存在。——
const SALT = 'huiqiantong::v1';
const FAIL_LIMIT = 5; // 连续失败阈值
const LOCK_MS = 60000; // 锁定时长 60 秒
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const AFTER_LOGIN_KEY = 'hq-after-login'; // sessionStorage：登录后回跳的目标页
export const ROLE_LABEL = { designer: '设计者', user: '使用者' };

/** 账号规则：2-20 位，不含空格与 @；唯一性按小写比对 */
export const USERNAME_RE = /^[^@\s]{2,20}$/;
/** 密码规则：6-20 位任意可见字符 */
export const PASSWORD_RE = /^.{6,20}$/;

export function hashPassword(pwd) {
  let h1 = 5381;
  let h2 = 52711;
  const s = SALT + '|' + pwd + '|' + SALT;
  for (let i = 0; i < s.length; i += 1) {
    const c = s.charCodeAt(i);
    h1 = ((h1 * 33) ^ c) >>> 0;
    h2 = (h2 * 31 + c) >>> 0;
  }
  return h1.toString(36) + '.' + h2.toString(36);
}

/** 查看被拦截的回跳目标（不消费），用于欢迎页提示 */
export function peekAfterLogin() {
  try {
    return sessionStorage.getItem(AFTER_LOGIN_KEY) || '';
  } catch {
    return '';
  }
}

/** 登录成功后消费"被拦截回跳"目标（读后即删） */
export function consumeAfterLogin() {
  try {
    const from = sessionStorage.getItem(AFTER_LOGIN_KEY) || '';
    sessionStorage.removeItem(AFTER_LOGIN_KEY);
    return from;
  } catch {
    return '';
  }
}

/** 路由守卫在跳转欢迎页前记录被拦截的原始地址 */
export function rememberAfterLogin(from) {
  try {
    sessionStorage.setItem(AFTER_LOGIN_KEY, from);
  } catch {
    /* 无痕/受限环境忽略 */
  }
}

/** 身份选择标记（sessionStorage）：欢迎页点击身份卡片时保存，登录页作为兜底身份 */
export const SELECTED_ROLE_KEY = 'hq-selected-role';

export function saveSelectedRole(role) {
  try {
    if (role === 'designer' || role === 'user') sessionStorage.setItem(SELECTED_ROLE_KEY, role);
  } catch {
    /* 无痕/受限环境忽略 */
  }
}

export function getSelectedRole() {
  try {
    const v = sessionStorage.getItem(SELECTED_ROLE_KEY);
    return v === 'designer' || v === 'user' ? v : null;
  } catch {
    return null;
  }
}

export function clearSelectedRole() {
  try {
    sessionStorage.removeItem(SELECTED_ROLE_KEY);
  } catch {
    /* 无痕/受限环境忽略 */
  }
}

/**
 * accounts:  [{ id, role('designer'|'user'), username(唯一·小写), display(显示名), password(哈希), createdAt }]
 * session:   { accountId, role, username, display } | null（持久保持到手动退出）
 * failures:  { [username]: { count, lockUntil } } —— 连续失败 5 次锁定 60 秒
 */
export const useAuth = create(
  persist(
    (set, get) => ({
      accounts: [],
      session: null,
      failures: {},

      /** 注册即直接建立会话；error: USERNAME_TAKEN */
      register({ role, username, nickname, password }) {
        const key = username.trim().toLowerCase();
        if (get().accounts.some((a) => a.username === key)) {
          return { ok: false, error: 'USERNAME_TAKEN' };
        }
        const display = (nickname || '').trim() || username.trim();
        const account = {
          id: uid(),
          role,
          username: key,
          display,
          password: hashPassword(password),
          createdAt: Date.now(),
        };
        set((s) => ({
          accounts: [...s.accounts, account],
          failures: { ...s.failures, [key]: { count: 0, lockUntil: 0 } },
          session: { accountId: account.id, role: account.role, username: account.username, display: account.display },
        }));
        return { ok: true, account };
      },

      /**
       * 登录校验；error:
       *  - BAD_CREDENTIALS（账号不存在 / 密码错误，统一提示，不透露具体项，计入失败次数）
       *  - LOCKED（锁定期内拒绝，携带 remainMs 倒计时）
       *  - LOCKED_NOW（本次恰好触发第 5 次失败）
       *  - ROLE_MISMATCH（账号已注册为另一身份，不计入失败锁定）
       */
      login({ role, username, password }) {
        const key = username.trim().toLowerCase();
        const f = get().failures[key] || { count: 0, lockUntil: 0 };
        if (f.lockUntil && Date.now() < f.lockUntil) {
          return { ok: false, error: 'LOCKED', remainMs: f.lockUntil - Date.now() };
        }
        const account = get().accounts.find((a) => a.username === key);
        let result = null;
        let failed = false;
        if (!account) {
          result = { ok: false, error: 'BAD_CREDENTIALS' };
          failed = true;
        } else if (account.role !== role) {
          result = { ok: false, error: 'ROLE_MISMATCH', actualRole: account.role };
        } else if (account.password !== hashPassword(password)) {
          result = { ok: false, error: 'BAD_CREDENTIALS' };
          failed = true;
        }
        if (failed) {
          const count = f.count + 1;
          const lockUntil = count >= FAIL_LIMIT ? Date.now() + LOCK_MS : 0;
          set((s) => ({ failures: { ...s.failures, [key]: { count, lockUntil } } }));
          if (lockUntil) return { ok: false, error: 'LOCKED_NOW', remainMs: LOCK_MS };
          return result;
        }
        if (result) return result;
        set((s) => ({
          failures: { ...s.failures, [key]: { count: 0, lockUntil: 0 } },
          session: { accountId: account.id, role: account.role, username: account.username, display: account.display },
        }));
        return { ok: true, account };
      },

      /** 忘记密码：本地重置并顺带解除锁定；账号不存在时拒绝。error: NO_ACCOUNT */
      resetPassword({ username, password }) {
        const key = username.trim().toLowerCase();
        const account = get().accounts.find((a) => a.username === key);
        if (!account) return { ok: false, error: 'NO_ACCOUNT' };
        set((s) => ({
          accounts: s.accounts.map((a) => (a.username === key ? { ...a, password: hashPassword(password) } : a)),
          failures: { ...s.failures, [key]: { count: 0, lockUntil: 0 } },
        }));
        return { ok: true, account };
      },

      logout() {
        set({ session: null });
      },
    }),
    { name: 'meeting-check-auth-v1' }
  )
);

