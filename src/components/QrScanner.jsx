import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { X, ScanLine } from 'lucide-react';

/**
 * 摄像头扫码浮层：逐帧解码二维码，识别成功回调 onText(text)。
 * 权限被拒 / 非 HTTPS / 无摄像头时在浮层内给出回退提示，由调用方关闭。
 */
export default function QrScanner({ onText, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cbRef = useRef(onText);
  cbRef.current = onText;
  const lastRef = useRef({ text: '', at: 0 });
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const rafRef = { id: 0 };
    let stream = null;

    const stop = () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.id);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      stream = null;
    };

    const start = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw Object.assign(new Error('unsupported'), { name: 'UnsupportedError' });
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) return stop();
        const video = videoRef.current;
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        video.muted = true;
        try {
          await video.play();
        } catch {
          /* 自动播放策略忽略，用户手势后可恢复 */
        }
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const tick = () => {
          if (cancelled) return;
          if (video.readyState >= video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const res = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
            if (res && res.data) {
              const now = Date.now();
              // 同一码 2.5 秒内只回一次，避免连续触发
              if (res.data !== lastRef.current.text || now - lastRef.current.at > 2500) {
                lastRef.current = { text: res.data, at: now };
                cbRef.current(res.data);
              }
            }
          }
          rafRef.id = requestAnimationFrame(tick);
        };
        rafRef.id = requestAnimationFrame(tick);
      } catch (e) {
        if (cancelled) return;
        const name = e && e.name;
        if (name === 'NotAllowedError') setError('摄像头权限被拒绝，请在浏览器设置中允许后重试，或改为姓名签到');
        else if (name === 'NotFoundError' || name === 'UnsupportedError') setError('当前设备没有可用摄像头，或浏览器不支持，请改为姓名签到');
        else if (name === 'NotReadableError') setError('摄像头被其它程序占用，请关闭后重试或改为姓名签到');
        else if (!window.isSecureContext) setError('摄像头需要在 HTTPS 环境下使用，请改为姓名签到');
        else setError('摄像头启动失败，请重试或改为姓名签到');
      }
    };
    start();
    return stop;
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-[var(--ink-deep)]/85 px-5 backdrop-blur-sm">
      <div className="animate-fade-up w-full max-w-md rounded-3xl bg-[var(--card)] p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 font-display text-lg font-bold text-[var(--ink)]">
            <ScanLine className="h-5 w-5 text-[var(--seal)]" /> 二维码签到
          </div>
          <button
            onClick={onClose}
            title="关闭扫码"
            className="rounded-lg p-2 text-[var(--ink-soft)] transition-colors hover:bg-[var(--paper)] hover:text-[var(--ink)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error ? (
          <div className="mt-4 flex h-64 items-center justify-center rounded-2xl bg-[var(--paper)] px-6 text-center">
            <p className="text-sm leading-relaxed text-[var(--seal)]">{error}</p>
          </div>
        ) : (
          <div className="relative mt-4 overflow-hidden rounded-2xl bg-black">
            <video ref={videoRef} className="block h-64 w-full object-cover" />
            {/* 取景框 */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-44 w-44 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]">
                <span className="absolute -left-1 -top-1 h-6 w-6 rounded-tl-2xl border-l-4 border-t-4 border-[var(--seal)]" />
                <span className="absolute -right-1 -top-1 h-6 w-6 rounded-tr-2xl border-r-4 border-t-4 border-[var(--seal)]" />
                <span className="absolute -bottom-1 -left-1 h-6 w-6 rounded-bl-2xl border-b-4 border-l-4 border-[var(--seal)]" />
                <span className="absolute -bottom-1 -right-1 h-6 w-6 rounded-br-2xl border-b-4 border-r-4 border-[var(--seal)]" />
              </div>
            </div>
            <p className="absolute inset-x-0 bottom-0 bg-black/40 py-2 text-center text-xs text-white/90">
              对准参会人出示的个人参会码，即可自动签到 / 签退
            </p>
          </div>
        )}

        <p className="mt-3 text-center text-[11px] leading-relaxed text-[var(--ink-soft)]">
          个人码由参会人在个人中心出示（或纸质打印）；扫码仅识别本设备的签到数据
        </p>
      </div>
      {/* 解码用离屏画布 */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

