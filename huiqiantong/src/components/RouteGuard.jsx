import React, { useEffect } from 'react';
import { Redirect, useLocation } from 'wouter';
import { toast } from 'sonner';
import { useAuth, ROLE_LABEL, rememberAfterLogin } from '../lib/auth';

// 记录已提示过的错误跳转，避免导航抖动时重复弹 toast
const lastWarned = { key: '' };

/**
 * 页面级角色守卫：guardPage(Component, role)
 *  - 未登录：记录被拦截的原始地址 → 跳转 /welcome（登录成功后优先回跳）
 *  - 角色不符：提示后跳回该角色自己的首页（designer→/ ; user→/me）
 *  - 校验通过：渲染原页面
 */
export function guardPage(Component, role) {
  function Guarded(props) {
    const session = useAuth((s) => s.session);
    const [location] = useLocation();

    useEffect(() => {
      if (!session) rememberAfterLogin(location);
    }, [session, location]);

    useEffect(() => {
      if (session && session.role !== role) {
        const key = location + '#' + session.role;
        if (lastWarned.key !== key) {
          lastWarned.key = key;
          toast.error('身份不符：此页属于「' + ROLE_LABEL[role] + '」，已为你切换到自己的工作台');
        }
      }
    }, [session, location, role]);

    if (!session) return <Redirect to="/welcome" />;
    if (session.role !== role) return <Redirect to={role === 'designer' ? '/me' : '/'} />;
    return <Component {...props} />;
  }
  Guarded.displayName = 'Guarded(' + (Component.displayName || Component.name || 'Page') + ')';
  return Guarded;
}

