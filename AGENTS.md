# AGENTS.md

## 技术栈

- React 18（JavaScript，禁用 TypeScript）+ wouter（hash 路由，页面跳转必须使用 wouter 的 `Link` / `useLocation` API）
- 样式：Tailwind CSS v4（CDN 全局提供，直接使用类名）；自定义样式仅使用 CSS（`src/index.css`），禁止 CSS-in-JS / Less / Sass
- 状态管理：zustand v5（`persist` 中间件做本地持久化）
- 图标：lucide-react；提示：sonner（toast）；二维码：qrcode.react（QRCodeCanvas 生成）+ jsqr（摄像头逐帧解码）
- 颜色/样式封装：clsx + tailwind-merge（`src/lib/utils.js` 的 `cn`）

## 目录结构

```
src/
├── App.jsx                 # 路由入口：/welcome /login（公开）· / /create /activity/:id（设计者）· /me（使用者）· /kiosk（公开）· 404
├── index.jsx               # React 挂载入口
├── index.css               # 全局样式：字体、CSS 变量、纹理、盖章/入场动画
├── components/
│   ├── Layout.jsx          # 顶部导航（按角色渲染）+ 退出登录 + 页脚
│   ├── QrScanner.jsx       # 摄像头扫码浮层（jsqr 逐帧解码，权限/HTTPS 异常回退提示）
│   └── RouteGuard.jsx      # guardPage(Component, role)：页面级角色守卫（未登录重定向/角色切换）
├── lib/
│   ├── qrcode.js           # 二维码内容构造与解析（个人码 /kiosk?act=&att=、活动码 /kiosk?code=）
│   ├── auth.js             # 本地模拟账号体系（注册/登录/锁定/重置/退出，persist: meeting-check-auth-v1）
│   ├── store.js            # 业务数据层（活动、参会人、签到/签退、自助加入，persist: meeting-check-v1）
│   ├── utils.js            # cn、时间格式化、状态判断、统计计算、名单解析
│   ├── exportSource.js     # 「导出源码」：JSZip 打包 + file-saver 触发下载
│   └── sourceBundle/       # 导出用源码内嵌包（part-*.js 为文本数据，index.js 聚合，勿随意手改）
└── pages/
    ├── Welcome.jsx         # 欢迎页：选择身份（设计者/使用者）
    ├── Login.jsx           # 登录页：登录 / 注册 / 忘记密码三模式（含锁定倒计时）
    ├── Home.jsx            # 活动总览（设计者）
    ├── CreateActivity.jsx  # 创建活动 + 名单导入（设计者）
    ├── ActivityDetail.jsx  # 活动详情统计与名单管理（设计者，支持 activityId prop 复用）
    ├── MyAttendance.jsx    # 个人中心：输码加入活动、自助签到/签退（使用者）
    ├── Kiosk.jsx           # 现场签到台（无 Layout 壳，沉浸式全屏，公开）
    └── NotFound.jsx        # 404
```

## 数据存储

- 浏览器本地存储双 persist：
  - 业务数据 `meeting-check-v1`（store.js）
  - 账号与会话 `meeting-check-auth-v1`（auth.js）：本地模拟账号，密码加盐双哈希落盘，非生产级安全
- 数据模型：
  - `activities: [{ id, name, location, startAt, endAt, code(6位数字签到码), createdAt }]`
  - `attendees: [{ id, activityId, name, tag(部门), status('pending'|'in'|'out'), checkinAt, checkoutAt, method('kiosk'|'manual'|'self'|'qrcode'), accountId(自助加入者绑定) }]`
  - `accounts: [{ id, role('designer'|'user'), username(唯一·小写), display(显示名=昵称或账号), password(哈希), createdAt }]`
  - `session: { accountId, role, username, display } | null`（保持到手动退出）；`failures: { [username]: { count, lockUntil } }`
- 活动"未开始/进行中/已结束"状态由当前时间与起止时间实时推算，不落库

## 依赖服务

- 无外部后端依赖服务；Google Fonts（fonts.googleapis.cn，Noto Serif SC / Noto Sans SC / IBM Plex Mono）

## 架构说明

- 登录流程：未登录访问受保护页 → RouteGuard 记录目标（sessionStorage `hq-after-login`）并重定向 /welcome → 点击身份卡片即保存角色标记（sessionStorage `hq-selected-role`）→ /login（URL 参数优先、标记兜底；登录/注册/忘记密码）→ 成功后清除标记，优先回跳目标页（权限相符），否则按角色进入默认页：设计者 `/`，使用者 `/me`
- 权限矩阵：设计者域 `/` `/create` `/activity/:id`；使用者域 `/me`；公开 `/welcome` `/login` `/kiosk`；角色不符由 guardPage 切换本人工作台并 toast
- 密码连续错误 5 次（BAD_CREDENTIALS 计数）锁定 60 秒；ROLE_MISMATCH 不计入失败锁定；忘记密码重置顺带解锁
- 自助加入规则（joinActivityAsAccount）：活动已结束不可加入；同活动同账号不可重复加入；与名义名单中同名且无账号绑定的记录自动合并；自助签到/签退的时间窗（未开始/已结束不可自助操作，设计者手动登记不受限）
- 二维码签到：码内容统一为完整 URL（hash 路由），由 lib/qrcode.js 构造/解析——个人码 `#/kiosk?act=<活动id>&att=<记录id>`、活动码 `#/kiosk?code=<6位码>`；Kiosk 扫个人码直接 checkIn/checkOut（method='qrcode'）并盖章复位，扫活动码切换/进入签到台；ActivityDetail 展示活动码二维码，/me 出示个人码；扫码限定同一浏览器数据域，摄像头仅在 HTTPS（或 localhost）可用，异常在浮层内提示并回退姓名签到
- 单设备本地模式：数据在同一浏览器各账号间共享，权限只做页面/操作域隔离；现场设备（入口电脑/平板）通过"现场签到台"输码进入对应活动操作签到/签退
- zustand selector 只返回原始引用（数组/对象/filter 结果放组件内 useMemo），避免 v5 getSnapshot 缓存问题
- 签到动作唯一入口是 `checkInAttendee / checkOutAttendee`，状态机：pending → in → out，越权调用自动忽略

## 使用的 Skills

- 前端网页设计

## 其它

- 不修改构建工具链配置（vite/tailwind/postcss/html 入口）
- 顶部「导出源码」：源码文本内嵌于 `src/lib/sourceBundle/`（运行环境不支持 `import.meta.glob` / `?raw`，任何依赖它们的方案都会崩溃）；内嵌的 Layout 为无导出按钮的净化版，导出包中的 package.json / vite.config.js / index.html / Tailwind 首行引入为独立运行配置，由 `exportSource.js` 构造，与平台内文件略有差异
- 不运行 npm 等命令行脚本；依赖变更直接改 package.json
- 新组件如遇 lint 报错需显式 `import React from 'react'`
