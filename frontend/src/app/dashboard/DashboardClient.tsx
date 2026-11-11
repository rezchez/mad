'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, User, ShieldCheck, Briefcase, Phone, CreditCard, Building } from 'lucide-react';
import type { SchoolUser, SchoolEmployee } from '@/lib/pocketbase/server';

interface DashboardProps {
  user: SchoolUser;
  employee: SchoolEmployee | null;
}

export default function DashboardClient({ user, employee }: DashboardProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    router.push('/login');
    router.refresh();
  };

  const roleLabels: Record<string, { label: string; className: string }> = {
    admin: { label: 'مدیر سامانه', className: 'admin' },
    teacher: { label: 'دبیر / آموزگار', className: 'teacher' },
    staff: { label: 'پرسنل اداری', className: 'staff' },
  };

  const roleInfo = roleLabels[user.role] || { label: user.role, className: 'staff' };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.35rem' }}>
            {user.name} خوش آمدید
          </h2>
          <span className={`role-badge ${roleInfo.className}`}>
            {roleInfo.label}
          </span>
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          title="خروج از حساب کاربری"
        >
          <LogOut size={16} />
          <span>{loggingOut ? 'در حال خروج...' : 'خروج از حساب'}</span>
        </button>
      </div>

      {/* User and Employee Information */}
      <div className="info-grid">
        <div className="info-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <User size={16} color="var(--text-muted)" />
            <h4>پست الکترونیک</h4>
          </div>
          <p dir="ltr" style={{ textAlign: 'right' }}>{user.email}</p>
        </div>

        <div className="info-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <CreditCard size={16} color="var(--text-muted)" />
            <h4>کد ملی</h4>
          </div>
          <p>{user.national_id || 'ثبت نشده'}</p>
        </div>

        <div className="info-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <Phone size={16} color="var(--text-muted)" />
            <h4>شماره تماس</h4>
          </div>
          <p dir="ltr" style={{ textAlign: 'right' }}>{user.phone || 'ثبت نشده'}</p>
        </div>

        <div className="info-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <Briefcase size={16} color="var(--text-muted)" />
            <h4>کد پرسنلی</h4>
          </div>
          <p>{employee?.personnel_code || 'ثبت نشده'}</p>
        </div>

        <div className="info-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <Building size={16} color="var(--text-muted)" />
            <h4>دپارتمان / بخش</h4>
          </div>
          <p>{employee?.department || 'ثبت نشده'}</p>
        </div>

        <div className="info-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <ShieldCheck size={16} color="var(--text-muted)" />
            <h4>سطح دسترسی</h4>
          </div>
          <p>{roleInfo.label}</p>
        </div>
      </div>

      {/* Role-Specific Notices / Dashboards */}
      <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          {user.role === 'admin' && 'پنل مدیریت مدرسه'}
          {user.role === 'teacher' && 'میز کار دبیران'}
          {user.role === 'staff' && 'بخش امور اداری و دفتری'}
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
          {user.role === 'admin' && 'دسترسی شما به عنوان مدیر تایید شده است. تمام رکوردهای پرسنلی و امنیتی تحت نظارت است.'}
          {user.role === 'teacher' && 'دسترسی شما به عنوان دبیر تایید شده است. رکوردهای کلاسی و آموزشی در دسترس است.'}
          {user.role === 'staff' && 'دسترسی شما به عنوان پرسنل اداری تایید شده است. اطلاعات هویتی و پرسنلی بارگذاری شد.'}
        </p>
      </div>
    </div>
  );
}
