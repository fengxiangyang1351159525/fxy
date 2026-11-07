# AGENTS.md

## 技术栈

- React 18（JavaScript，禁用 TypeScript）+ wouter（hash 路由，页面跳转必须使用 wouter 的 `Link` / `useLocation` API）
- 样式：Tailwind CSS v4（CDN 全局提供，直接使用类名）；自定义样式仅使用 CSS（`src/index.css`），禁止 CSS-in-JS / Less / Sass
- 状态管理：zustand v5（`persist` 中间件做本地持久化）
- 图标：lucide-react；提示：sonner（toast）
- 颜色/样式封装：clsx + tailwind-merge（`src/lib/utils.js` 的 `cn`）

## 目录结构

```
src/
├── App.jsx                 # 路由入口（hash 路由）：/ /create /activity/:id /kiosk 404
├── index.jsx               # React 挂载入口
├── index.css               # 全局样式：字体、CSS 变量、纹理、盖章/入场动画
├── components/
│   └── Layout.jsx          # 顶部导航 + 页脚布局壳
├── lib/
│   ├── store.js            # zustand 数据层（活动、参会人、签到/签退 action）
│   └── utils.js            # cn、时间格式化、状态判断、统计计算、名单解析
└── pages/
    ├── Home.jsx            # 活动总览
    ├── CreateActivity.jsx  # 创建活动 + 名单导入
    ├── ActivityDetail.jsx  # 活动详情统计与名单管理（支持 activityId prop 复用）
    ├── Kiosk.jsx           # 现场签到台（无 Layout 壳，沉浸式全屏）
    └── NotFound.jsx        # 404
```

## 数据存储

- 浏览器本地存储（localStorage，persist key：`meeting-check-v1`），无后端、无用户认证
- 数据模型：
  - `activities: [{ id, name, location, startAt, endAt, code(6位数字签到码), createdAt }]`
  - `attendees: [{ id, activityId, name, tag(部门), status('pending'|'in'|'out'), checkinAt, checkoutAt, method('kiosk'|'manual') }]`
- 活动"未开始/进行中/已结束"状态由当前时间与起止时间实时推算，不落库

## 依赖服务

- 无外部后端依赖服务；Google Fonts（fonts.googleapis.cn，Noto Serif SC / Noto Sans SC / IBM Plex Mono）

## 架构说明

- 单设备本地模式：组织者在自己设备创建活动，现场设备（入口电脑/平板）通过"现场签到台"输码进入对应活动操作签到/签退；统计实时反映在详情页
- zustand selector 只返回原始引用（数组/对象/filter 结果放组件内 useMemo），避免 v5 getSnapshot 缓存问题
- 签到动作唯一入口是 `checkInAttendee / checkOutAttendee`，状态机：pending → in → out，越权调用自动忽略

## 使用的 Skills

- 前端网页设计

## 其它

- 不修改构建工具链配置（vite/tailwind/postcss/html 入口）
- 运行环境不支持 `import.meta.glob` / `?raw` 等构建期文件内联能力，勿依赖其做运行时读源码
- 不运行 npm 等命令行脚本；依赖变更直接改 package.json
- 新组件如遇 lint 报错需显式 `import React from 'react'`
