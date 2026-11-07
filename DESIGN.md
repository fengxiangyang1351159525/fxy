# DESIGN.md

## 概述

"会签通"设计体裁：档案式简约商务。核心隐喻是"纸面档案 + 朱红印章"——会议签到本就是一次"到此一签"的盖印仪式。深藏青承载专业与秩序，印章朱红作为唯一强调色，用在签到码、主操作与成功印章上；数字一律使用等宽字形，强化"记录/台账"的档案感。动效克制而有仪式感：页面元素错落上滑入场，签到/签退成功时呈现唯一的标志性瞬间——旋转盖章动效。

## 色彩

以 CSS 变量定义于 `src/index.css`，统一通过 Tailwind 任意值 `bg-[var(--x)]` 引用：

- `--ink` #12294b 主色·深藏青：导航、标题、头部横幅、当选中的 tab 与按钮
- `--ink-deep` #0b1c36 更深墨蓝：Hero/详情头条/签到台的深底，其上叠加 paper-grain 网格纹理
- `--ink-soft` #35507a 弱化蓝：正文中性文字；`--paper` #eef2f7 页面底；`--card` #ffffff 卡片；`--line` #dbe3ec 边框
- `--seal` #b8442c 印章朱红·唯一点缀：签到码提示、主 CTA、签退、成功印章
- 语义明暗对：`--ok` #1e7f4f（签到入场，配 `--ok-soft`）、`--warn` #8a6d1f（未到/待办，配 `--warn-soft`）、`--seal-soft`（签退/删除 hover）
- 状态徽章规则：进行中=绿、未开始/未签到=琥珀、已结束/已签退=灰蓝

## 字体排版

- 展示字体：Noto Serif SC（`.font-display`）——活动标题、标语、大按钮文字
- 正文字体：Noto Sans SC（body 默认）
- 数字字体：IBM Plex Mono + tabular-nums（`.font-mono-num`）——签到码、时间戳、统计数字、键盘
- 层级节奏：黑体大标题 → 小字装饰性全大写字距标签（如 `CHECK · IN`，letter-spacing 0.3em）→ 正文 13-14px → 辅助 11-12px

## 通用基础组件

- `Layout`：深藏青导航（印章方块 logo「签」）+ 页脚，内容容器 max-w-5xl（详情/首页 wide 为 max-w-6xl）；Kiosk 页不套用，为全屏沉浸式
- 卡片：白底、`--line` 边框、圆角 2xl、极浅阴影，hover 轻微上浮；活动卡片左侧 1.5px 藏青"书脊"
- 徽章（状态）、MiniStat 统计卡（大号 mono 数字 + 小标签）、进度条（藏青渐变填充）
- 表单输入：白底/纸灰底、圆角 xl、focus 主色描边 + 10% 光晕；危险/添加按钮轻量化（图标按钮 + hover 重着色）
- 两段式删除确认：第一次点击变为"确认删除？"，3 秒未确认自动退出
- 动画：`.animate-fade-up`（列表错落入场，animation-delay 递增）、`.animate-stamp`（成功盖章）、`.animate-ring`（主 CTA 点击光环）

## 该做与不该做

该做：
- 使用 CSS 变量取色、`.font-display` / `.font-mono-num` 排版
- 关键数字（签到率、人数、时间）用 mono 数字并 tabular 对齐
- 空态、筛选零结果均给明确文案；危险操作二次确认
- 新区块沿用"深色横幅/纹理层 + 白卡片"的层次语言

不该做：
- 不引入紫色渐变、彩虹渐变等与藏青体系冲突的颜色
- 不在深底纹理容器内直接叠放内容（`paper-grain` 只能作为独立的 `pointer-events-none absolute` 装饰层，否则内容会被纹理层透明度影响）
- 不滥用 toast 做状态展示；签到成功以盖章弹层为准
- 不用系统默认Arial/Inter 直排大标题，标题一律走 Noto Serif SC
