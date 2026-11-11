import React from 'react';
import { Route, Switch, Router } from 'wouter';
// Must use hash mode, useHashLocation export from "wouter/use-hash-location", not direct import from "wouter"
import { useHashLocation } from 'wouter/use-hash-location';
import { Toaster } from 'sonner';
import { guardPage } from './components/RouteGuard';
import Home from './pages/Home';
import CreateActivity from './pages/CreateActivity';
import ActivityDetail from './pages/ActivityDetail';
import Kiosk from './pages/Kiosk';
import MyAttendance from './pages/MyAttendance';
import Welcome from './pages/Welcome';
import Login from './pages/Login';
import NotFound from './pages/NotFound';

// 角色守卫（模块级生成，保证组件引用稳定）
const HomeDesigner = guardPage(Home, 'designer');
const CreateDesigner = guardPage(CreateActivity, 'designer');
const ActivityDetailDesigner = guardPage(ActivityDetail, 'designer');
const MyAttendanceUser = guardPage(MyAttendance, 'user');

export default function App() {
  return (
    <Router hook={useHashLocation}>
      <Switch>
        {/* 公开入口：欢迎页选择身份、登录页输账号 */}
        <Route path="/welcome" component={Welcome} />
        <Route path="/login" component={Login} />

        {/* 设计者域：活动管理 / 统计（需设计者会话） */}
        <Route path="/" component={HomeDesigner} />
        <Route path="/create" component={CreateDesigner} />
        <Route path="/activity/:id" component={ActivityDetailDesigner} />

        {/* 使用者域：个人出勤与自助签到（需使用者会话） */}
        <Route path="/me" component={MyAttendanceUser} />

        {/* 公开：现场签到台（部署在会场入口的设备，无需登录） */}
        <Route path="/kiosk" component={Kiosk} />

        <Route component={NotFound} />
      </Switch>
      <Toaster position="top-center" richColors />
    </Router>
  );
}

