// 二维码内容构造与解析（活动签到码 / 参会人个人码）
// 码内容统一为完整 URL（hash 路由），手机相机/扫码枪扫到的都是这个地址：
//   个人码 → <origin><pathname>#/kiosk?act=<活动id>&att=<参会人记录id>
//   活动码 → <origin><pathname>#/kiosk?code=<6位签到码>
// 说明：本地模式下数据保存在当前浏览器，扫码识别限定在同一浏览器数据域内（跨设备打开会提示无数据）。

const baseHref = () => {
  if (typeof window === 'undefined') return '';
  return window.location.origin + window.location.pathname;
};

/** 参会人个人码（现场签到台扫码 → 自动识别该人 → 签到/签退） */
export function buildAttendeeCodeUrl(activityId, attendeeId) {
  return baseHref() + '#/kiosk?act=' + encodeURIComponent(activityId) + '&att=' + encodeURIComponent(attendeeId);
}

/** 活动码（扫码直达对应活动的签到台） */
export function buildActivityCodeUrl(code) {
  return baseHref() + '#/kiosk?code=' + encodeURIComponent(code);
}

/**
 * 解析摄像头扫到的文本：
 *  - 个人码 → { kind: 'attendee', activityId, attendeeId }
 *  - 活动码 → { kind: 'activity', code }
 *  - 其它（无效文本）→ null
 */
export function parseCodeText(text) {
  if (!text || typeof text !== 'string') return null;
  const raw = text.trim();
  if (raw.length > 300) return null;
  const idx = raw.indexOf('#/kiosk?');
  if (idx < 0) return null;
  const qs = raw.slice(idx + '#/kiosk?'.length).split('#')[0];
  let p;
  try {
    p = new URLSearchParams(qs);
  } catch {
    return null;
  }
  const act = p.get('act');
  const att = p.get('att');
  if (act && att) return { kind: 'attendee', activityId: act, attendeeId: att };
  const code = p.get('code');
  if (code && /^[0-9]{6}$/.test(code)) return { kind: 'activity', code };
  return null;
}

