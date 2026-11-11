import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const ATTEND_STATUS = {
  pending: '未签到',
  in: '已签到',
  out: '已签退',
};

const genCode = (existing) => {
  const taken = new Set(existing);
  let code;
  do {
    code = String(Math.floor(100000 + Math.random() * 900000));
  } while (taken.has(code));
  return code;
};

/**
 * 数据持久化于浏览器本地（localStorage）
 * activities: [{id,name,location,startAt,endAt,code,createdAt}]
 * attendees:  [{id,activityId,name,tag,status,checkinAt,checkoutAt,method}]
 */
export const useStore = create(
  persist(
    (set, get) => ({
      activities: [],
      attendees: [],

      createActivity({ name, location, startAt, endAt, roster = [] }) {
        const id = uid();
        const code = genCode(get().activities);
        set((s) => ({
          activities: [
            { id, name, location, startAt, endAt, code, createdAt: Date.now() },
            ...s.activities,
          ],
          attendees: [
            ...s.attendees,
            ...roster
              .filter((r) => r.name && r.name.trim())
              .map((r) => ({
                id: uid(),
                activityId: id,
                name: r.name.trim(),
                tag: (r.tag || '').trim(),
                status: 'pending',
                checkinAt: null,
                checkoutAt: null,
                method: null,
              })),
          ],
        }));
        return id;
      },

      deleteActivity(id) {
        set((s) => ({
          activities: s.activities.filter((a) => a.id !== id),
          attendees: s.attendees.filter((t) => t.activityId !== id),
        }));
      },

      getActivities: () => get().activities,

      findActivityByCode(code) {
        return get().activities.find((a) => a.code === code) || null;
      },

      addAttendee(activityId, { name, tag = '' }) {
        const trimmed = (name || '').trim();
        if (!trimmed) return null;
        const t = {
          id: uid(),
          activityId,
          name: trimmed,
          tag: (tag || '').trim(),
          status: 'pending',
          checkinAt: null,
          checkoutAt: null,
          method: null,
        };
        set((s) => ({ attendees: [...s.attendees, t] }));
        return t.id;
      },

      /**
       * 使用者以个人账号加入活动并自动登记为参会人（自助签到）。
       * reason: ACTIVITY_MISSING / ACTIVITY_ENDED / ALREADY_JOINED
       * 同名且无账号关联的既有名单记录会被合并（打上 accountId，避免重复计数）
       */
      joinActivityAsAccount(activityId, { name, tag = '', accountId }) {
        const trimmed = (name || '').trim();
        if (!trimmed || !accountId) return { ok: false, reason: 'INVALID' };
        const act = get().activities.find((a) => a.id === activityId);
        if (!act) return { ok: false, reason: 'ACTIVITY_MISSING' };
        if (Date.now() > act.endAt) return { ok: false, reason: 'ACTIVITY_ENDED' };
        if (get().attendees.some((t) => t.activityId === activityId && t.accountId === accountId)) {
          return { ok: false, reason: 'ALREADY_JOINED' };
        }
        const twin = get().attendees.find(
          (t) => t.activityId === activityId && !t.accountId && t.name === trimmed
        );
        if (twin) {
          set((s) => ({
            attendees: s.attendees.map((t) => (t.id === twin.id ? { ...t, accountId } : t)),
          }));
          return { ok: true, attendeeId: twin.id, merged: true };
        }
        const t = {
          id: uid(),
          activityId,
          name: trimmed,
          tag,
          accountId,
          status: 'pending',
          checkinAt: null,
          checkoutAt: null,
          method: null,
        };
        set((s) => ({ attendees: [...s.attendees, t] }));
        return { ok: true, attendeeId: t.id, merged: false };
      },

      removeAttendee(id) {
        set((s) => ({ attendees: s.attendees.filter((t) => t.id !== id) }));
      },

      checkInAttendee(id, method = 'manual') {
        set((s) => ({
          attendees: s.attendees.map((t) =>
            t.id === id && t.status === 'pending'
              ? { ...t, status: 'in', checkinAt: Date.now(), method }
              : t
          ),
        }));
      },

      checkOutAttendee(id, method = 'manual') {
        set((s) => ({
          attendees: s.attendees.map((t) =>
            t.id === id && t.status === 'in'
              ? { ...t, status: 'out', checkoutAt: Date.now(), method }
              : t
          ),
        }));
      },

      resetAttendee(id) {
        set((s) => ({
          attendees: s.attendees.map((t) =>
            t.id === id
              ? { ...t, status: 'pending', checkinAt: null, checkoutAt: null, method: null }
              : t
          ),
        }));
      },
    }),
    { name: 'meeting-check-v1' }
  )
);

