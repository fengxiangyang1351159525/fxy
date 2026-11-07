import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { Plus, X, ClipboardPaste, Users, Check } from 'lucide-react';
import Layout from '../components/Layout';
import { useStore } from '../lib/store';
import { cn, parseRosterText } from '../lib/utils';

const inputCls =
  'w-full rounded-xl border border-[var(--line)] bg-white px-3.5 py-2.5 text-sm text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--ink-soft)]/40 focus:border-[var(--ink)] focus:ring-2 focus:ring-[var(--ink)]/10';

export default function CreateActivity() {
  const [, setLocation] = useLocation();
  const createActivity = useStore((s) => s.createActivity);

  const [name, setName] = useState('');
  const [location, setLocationText] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [roster, setRoster] = useState([]);
  const [personName, setPersonName] = useState('');
  const [personTag, setPersonTag] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [showBulk, setShowBulk] = useState(false);

  const addPerson = () => {
    const n = personName.trim();
    if (!n) return;
    if (roster.some((r) => r.name === n)) {
      toast.warning(`「${n}」已在名单中`);
      return;
    }
    setRoster([...roster, { name: n, tag: personTag.trim() }]);
    setPersonName('');
    setPersonTag('');
  };

  const importBulk = () => {
    const list = parseRosterText(bulkText);
    if (!list.length) {
      toast.warning('没有识别到有效的名单，请每行填写一个姓名');
      return;
    }
    setRoster((prev) => {
      const seen = new Set(prev.map((r) => r.name));
      return [...prev, ...list.filter((r) => !seen.has(r.name))];
    });
    setBulkText('');
    setShowBulk(false);
    toast.success(`已导入名单，共 ${list.length} 人`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('请填写活动名称');
    if (!startAt || !endAt) return toast.error('请选择开始与结束时间');
    const s = new Date(startAt).getTime();
    const t = new Date(endAt).getTime();
    if (Number.isNaN(s) || Number.isNaN(t)) return toast.error('时间格式有误');
    if (t <= s) return toast.error('结束时间必须晚于开始时间');

    const id = createActivity({
      name: name.trim(),
      location: location.trim(),
      startAt: s,
      endAt: t,
      roster,
    });
    toast.success('活动已创建', { description: `签到码生成完毕，已导入名单 ${roster.length} 人` });
    setLocation(`/activity/${id}`);
  };

  return (
    <Layout>
      <h1 className="font-display text-2xl font-black">新建活动签到</h1>
      <p className="mt-1 text-sm text-[var(--ink-soft)]">填写活动信息并录入参会人名单，系统将自动生成现场签到码。</p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-5 lg:grid-cols-[1fr_340px]">
        {/* 左：基本信息 */}
        <div className="space-y-5 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-6">
          <div>
            <label className="text-sm font-medium">活动名称 <span className="text-[var(--seal)]">*</span></label>
            <input
              className={cn(inputCls, 'mt-1.5')}
              placeholder="如：2026 年第三季度全员大会"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
            />
          </div>

          <div>
            <label className="text-sm font-medium">活动地点</label>
            <input
              className={cn(inputCls, 'mt-1.5')}
              placeholder="如：总部大厦 3F 多功能会议厅"
              value={location}
              onChange={(e) => setLocationText(e.target.value)}
              maxLength={40}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">开始时间 <span className="text-[var(--seal)]">*</span></label>
              <input type="datetime-local" className={cn(inputCls, 'mt-1.5')} value={startAt} onChange={(e) => setStartAt(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">结束时间 <span className="text-[var(--seal)]">*</span></label>
              <input type="datetime-local" className={cn(inputCls, 'mt-1.5')} value={endAt} onChange={(e) => setEndAt(e.target.value)} />
            </div>
          </div>

          <div className="rounded-xl bg-[var(--warn-soft)] px-4 py-3 text-xs leading-relaxed text-[var(--warn)]">
            参会人凭「签到码」在现场签到台完成签到与签退；你也可以随时在本页下面的名单中补充人员，或在签到台现场登记新到人员。
          </div>
        </div>

        {/* 右：参会人名单 */}
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-6">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 font-medium">
              <Users className="h-4 w-4 text-[var(--seal)]" />
              参会人名单
              <span className="font-mono-num rounded-full bg-[var(--paper)] px-2 py-0.5 text-xs font-bold">{roster.length}</span>
            </div>
            <button
              type="button"
              onClick={() => setShowBulk((v) => !v)}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] px-2.5 py-1.5 text-xs text-[var(--ink-soft)] hover:border-[var(--ink)] hover:text-[var(--ink)]"
            >
              <ClipboardPaste className="h-3.5 w-3.5" /> 批量导入
            </button>
          </div>

          {showBulk && (
            <div className="mt-3">
              <textarea
                className={cn(inputCls, 'min-h-[90px] resize-y')}
                placeholder={'每行一人，支持「姓名,部门」格式\n张三,市场部\n李四\n王五,财务部'}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
              />
              <button
                type="button"
                onClick={importBulk}
                className="mt-2 w-full rounded-xl bg-[var(--ink)] py-2 text-sm font-medium text-white hover:bg-[var(--ink-deep)]"
              >
                解析并加入名单
              </button>
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <input
              className={cn(inputCls, 'mt-0 flex-1')}
              placeholder="姓名"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPerson())}
              maxLength={20}
            />
            <input
              className={cn(inputCls, 'mt-0 w-28')}
              placeholder="部门(可选)"
              value={personTag}
              onChange={(e) => setPersonTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPerson())}
              maxLength={16}
            />
            <button
              type="button"
              onClick={addPerson}
              className="shrink-0 rounded-xl bg-[var(--paper)] px-3 text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-white"
              title="添加到名单"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* 名单预览 */}
          <div className="mt-4 max-h-[320px] space-y-1.5 overflow-y-auto pr-1">
            {roster.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[var(--line)] py-6 text-center text-xs text-[var(--ink-soft)]/70">
                名单为空，会议现场可临时登记
              </p>
            ) : (
              roster.map((r, i) => (
                <div
                  key={r.name}
                  className="flex items-center justify-between rounded-lg bg-[var(--paper)] px-3 py-2 text-sm animate-fade-up"
                  style={{ animationDelay: `${Math.min(i * 30, 400)}ms` }}
                >
                  <span className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-[var(--ok)]" />
                    {r.name}
                    {r.tag && <span className="text-xs text-[var(--ink-soft)]">· {r.tag}</span>}
                  </span>
                  <button type="button" onClick={() => setRoster(roster.filter((x) => x.name !== r.name))} className="text-[var(--ink-soft)]/50 hover:text-[var(--seal)]">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <button
            type="submit"
            className="w-full rounded-xl bg-[var(--seal)] py-3.5 font-bold text-white shadow-[0_4px_14px_rgba(184,68,44,0.35)] transition-all hover:-translate-y-0.5 hover:brightness-110 sm:w-auto sm:px-10"
          >
            创建活动，生成签到码
          </button>
        </div>
      </form>
    </Layout>
  );
}

