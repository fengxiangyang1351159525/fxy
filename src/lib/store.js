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

