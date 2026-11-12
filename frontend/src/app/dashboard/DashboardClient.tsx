'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  LogOut,
  User,
  ShieldCheck,
  Briefcase,
  Phone,
  CreditCard,
  Building,
  UserPlus,
  Users,
  Search,
  Filter,
  Copy,
  Check,
  Clock,
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  LayoutDashboard,
  Menu,
  X,
  School,
  ChevronLeft,
  FileSpreadsheet,
  FileText,
  Code,
  Download,
} from 'lucide-react';
import type { SchoolUser, SchoolEmployee } from '@/lib/pocketbase/server';
import {
  exportEmployeesToExcel,
  exportEmployeesToHTML,
  exportEmployeesToPDF,
} from '@/lib/export/employees-export';

interface DashboardProps {
  user: SchoolUser;
  employee: SchoolEmployee | null;
  initialAllEmployees?: SchoolEmployee[] | null;
}

interface InvitationItem {
  id: string;
  token: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: 'teacher' | 'staff';
  department: string;
  expires_at: string;
  used: boolean;
  used_at?: string;
  created?: string;
}

export default function DashboardClient({ user, employee, initialAllEmployees }: DashboardProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  // Active Navigation Tab: 'overview' | 'directory' | 'invite'
  const [activeTab, setActiveTab] = useState<'overview' | 'directory' | 'invite'>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // All Employees Directory (Admin View)
  const [allEmployees, setAllEmployees] = useState<SchoolEmployee[]>(initialAllEmployees || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'all' | 'admin' | 'teacher' | 'staff'>('all');

  // Admin Invitation Management State
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // New Invitation Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'teacher' | 'staff'>('teacher');
  const [department, setDepartment] = useState('');
  const [submittingInvite, setSubmittingInvite] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ url: string; expiresAt: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchInvitations = async () => {
    if (user.role !== 'admin') return;
    setLoadingInvitations(true);
    try {
      const res = await fetch('/api/admin/invitations');
      const data = await res.json();
      if (res.ok && data.invitations) {
        setInvitations(data.invitations);
      }
    } catch {
    } finally {
      setLoadingInvitations(false);
    }
  };

  const fetchAllEmployees = async () => {
    if (user.role !== 'admin') return;
    try {
      const res = await fetch('/api/admin/employees');
      const data = await res.json();
      if (res.ok && data.employees) {
        setAllEmployees(data.employees);
      }
    } catch {}
  };

  useEffect(() => {
    if (user.role === 'admin') {
      fetchInvitations();
      if (!initialAllEmployees || initialAllEmployees.length === 0) {
        fetchAllEmployees();
      }
    }
  }, [user.role, initialAllEmployees]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    router.push('/login');
    router.refresh();
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setInviteResult(null);

    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      setFormError('لطفاً نام، نام خانوادگی و شماره موبایل را وارد کنید.');
      return;
    }

    setSubmittingInvite(true);
    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          role,
          department: department.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setInviteResult({
          url: data.inviteUrl,
          expiresAt: data.expiresAt,
        });
        setFirstName('');
        setLastName('');
        setPhone('');
        setDepartment('');
        fetchInvitations();
      } else {
        setFormError(data.error || 'خطا در صدور دعوت‌نامه.');
      }
    } catch {
      setFormError('خطا در برقراری ارتباط با سرور.');
    } finally {
      setSubmittingInvite(false);
    }
  };

  const copyToClipboard = (text: string, token: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const roleLabels: Record<string, { label: string; className: string }> = {
    admin: { label: 'مدیر سامانه', className: 'admin' },
    teacher: { label: 'دبیر / آموزگار', className: 'teacher' },
    staff: { label: 'پرسنل اداری', className: 'staff' },
  };

  const roleInfo = roleLabels[user.role] || { label: user.role, className: 'staff' };

  // Filtered employees list for Directory
  const filteredEmployees = useMemo(() => {
    return allEmployees.filter((emp) => {
      if (selectedRoleFilter !== 'all' && emp.role !== selectedRoleFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
        const code = (emp.personnel_code || '').toLowerCase();
        const nid = (emp.national_id || '').toLowerCase();
        const phoneNum = (emp.phone || '').toLowerCase();
        const dept = (emp.department || '').toLowerCase();
        const emailStr = (emp.email || '').toLowerCase();
        return (
          fullName.includes(q) ||
          code.includes(q) ||
          nid.includes(q) ||
          phoneNum.includes(q) ||
          dept.includes(q) ||
          emailStr.includes(q)
        );
      }
      return true;
    });
  }, [allEmployees, selectedRoleFilter, searchQuery]);

  // Statistics
  const teacherCount = useMemo(() => allEmployees.filter((e) => e.role === 'teacher').length, [allEmployees]);
  const staffCount = useMemo(() => allEmployees.filter((e) => e.role === 'staff').length, [allEmployees]);
  const adminCount = useMemo(() => allEmployees.filter((e) => e.role === 'admin').length, [allEmployees]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', background: '#f8fafc', position: 'relative' }}>
      
      {/* MOBILE BACKDROP */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.4)',
            zIndex: 40,
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* SIDEBAR NAVIGATION */}
      <aside
        style={{
          width: '280px',
          background: '#ffffff',
          borderLeft: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '1.5rem 1rem',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 50,
          transition: 'transform 0.3s ease',
        }}
        className={`sidebar-nav ${mobileMenuOpen ? 'sidebar-open' : ''}`}
      >
        <div>
          {/* Brand Logo & Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 0.5rem 1.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <School size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>سامانه هوشمند مدرسه</h1>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>پنل مدیریت و خدمات پرسنل</span>
            </div>
          </div>

          {/* Current User Card in Sidebar */}
          <div style={{ background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>{user.name}</span>
              <span className={`role-badge ${roleInfo.className}`} style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}>
                {roleInfo.label}
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }} dir="ltr">
              {user.email}
            </div>
          </div>

          {/* Menu Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ padding: '0 0.5rem 0.4rem', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>
              منوی دسترسی
            </div>

            {/* Overview / Personal Info Button */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('overview');
                setMobileMenuOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '0.75rem 1rem',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                background: activeTab === 'overview' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'overview' ? '#ffffff' : 'var(--text-main)',
                fontSize: '0.9rem',
                fontWeight: activeTab === 'overview' ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <LayoutDashboard size={18} />
                <span>میز کار و پروفایل</span>
              </div>
              <ChevronLeft size={16} style={{ opacity: activeTab === 'overview' ? 1 : 0.4 }} />
            </button>

            {/* ADMIN EXCLUSIVE SIDEBAR BUTTONS */}
            {user.role === 'admin' && (
              <>
                {/* Personnel Directory Button */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('directory');
                    setMobileMenuOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    background: activeTab === 'directory' ? 'var(--primary)' : 'transparent',
                    color: activeTab === 'directory' ? '#ffffff' : 'var(--text-main)',
                    fontSize: '0.9rem',
                    fontWeight: activeTab === 'directory' ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Users size={18} />
                    <span>لیست پرسنل</span>
                  </div>
                  <span
                    style={{
                      background: activeTab === 'directory' ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                      color: activeTab === 'directory' ? '#ffffff' : '#475569',
                      fontSize: '0.75rem',
                      padding: '0.1rem 0.5rem',
                      borderRadius: '10px',
                      fontWeight: 700,
                    }}
                  >
                    {allEmployees.length}
                  </span>
                </button>

                {/* Invite Personnel Button */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('invite');
                    setMobileMenuOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    background: activeTab === 'invite' ? 'var(--primary)' : 'transparent',
                    color: activeTab === 'invite' ? '#ffffff' : 'var(--text-main)',
                    fontSize: '0.9rem',
                    fontWeight: activeTab === 'invite' ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <UserPlus size={18} />
                    <span>صدور دعوت‌نامه پرسنل</span>
                  </div>
                  <ChevronLeft size={16} style={{ opacity: activeTab === 'invite' ? 1 : 0.4 }} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Logout Button in Sidebar Bottom */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              width: '100%',
              padding: '0.7rem 1rem',
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fee2e2',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'var(--transition)',
            }}
            title="خروج از حساب کاربری"
          >
            <LogOut size={16} />
            <span>{loggingOut ? 'در حال خروج...' : 'خروج از حساب'}</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowY: 'auto' }}>
        
        {/* TOP BAR FOR MOBILE & HEADER */}
        <header
          style={{
            background: '#ffffff',
            borderBottom: '1px solid var(--border-color)',
            padding: '1rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="mobile-menu-btn"
              style={{
                background: '#f1f5f9',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '0.45rem',
                display: 'none',
                cursor: 'pointer',
              }}
              aria-label="منو"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {activeTab === 'overview' && 'میز کار و مشخصات کاربری'}
                {activeTab === 'directory' && 'فهرست جامع پرسنل و دبیران'}
                {activeTab === 'invite' && 'صدور لینک دعوت‌نامه ۲۴ ساعته'}
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {activeTab === 'overview' && 'اطلاعات هویتی و پرسنلی ثبت‌شده در سامانه'}
                {activeTab === 'directory' && `مشاهده مشخصات ${allEmployees.length} پرسنل به همراه تفکیک نقش‌ها`}
                {activeTab === 'invite' && 'ثبت‌نام پرسنل جدید صرفاً با مجوز مدیر و لینک یکبار مصرف'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className={`role-badge ${roleInfo.className}`}>
              {roleInfo.label}
            </span>
          </div>
        </header>

        {/* TAB CONTENTS */}
        <div style={{ padding: '2rem 1.75rem', maxWidth: '1300px', width: '100%', margin: '0 auto' }}>

          {/* TAB 1: OVERVIEW & PERSONAL INFO */}
          {activeTab === 'overview' && (
            <div>
              {/* Quick Summary Cards */}
              {user.role === 'admin' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                  <div
                    onClick={() => setActiveTab('directory')}
                    style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                  >
                    <div style={{ background: '#e0e7ff', color: '#4338ca', padding: '0.85rem', borderRadius: '12px' }}>
                      <Users size={24} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>کل پرسنل مدرسه</span>
                      <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.2rem' }}>{allEmployees.length} نفر</h3>
                    </div>
                  </div>

                  <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ background: '#dbeafe', color: '#1d4ed8', padding: '0.85rem', borderRadius: '12px' }}>
                      <GraduationCap size={24} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>دبیران آموزشی</span>
                      <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.2rem' }}>{teacherCount} نفر</h3>
                    </div>
                  </div>

                  <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ background: '#fef3c7', color: '#b45309', padding: '0.85rem', borderRadius: '12px' }}>
                      <Briefcase size={24} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>کادر اداری</span>
                      <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.2rem' }}>{staffCount} نفر</h3>
                    </div>
                  </div>

                  <div
                    onClick={() => setActiveTab('invite')}
                    style={{ background: '#ffffff', border: '1px solid #c7d2fe', borderRadius: 'var(--radius-md)', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
                  >
                    <div style={{ background: '#eef2ff', color: 'var(--primary)', padding: '0.85rem', borderRadius: '12px' }}>
                      <UserPlus size={24} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>لینک دعوت‌نامه</span>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '0.2rem', color: 'var(--primary)' }}>صدور دعوت جدید</h3>
                    </div>
                  </div>
                </div>
              )}

              {/* Personal Details Card */}
              <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User size={20} color="var(--primary)" />
                  مشخصات پرسنلی شما
                </h3>

                <div className="info-grid" style={{ marginBottom: 0 }}>
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
              </div>

              {/* Non-Admin Notice */}
              {user.role !== 'admin' && (
                <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    {user.role === 'teacher' && 'میز کار دبیران'}
                    {user.role === 'staff' && 'بخش امور اداری و دفتری'}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                    {user.role === 'teacher' && 'دسترسی شما به عنوان دبیر تایید شده است. رکوردهای کلاسی و آموزشی در دسترس است.'}
                    {user.role === 'staff' && 'دسترسی شما به عنوان پرسنل اداری تایید شده است. اطلاعات هویتی و پرسنلی بارگذاری شد.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ALL EMPLOYEES DIRECTORY (LIST OF PERSONNEL IN SIDEBAR) */}
          {activeTab === 'directory' && user.role === 'admin' && (
            <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              
              {/* Header & Filter Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
                
                {/* Action Toolbar: Title & Export Buttons */}
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Users size={20} color="var(--primary)" />
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                      فهرست کامل پرسنل مدرسه ({filteredEmployees.length} نفر)
                    </h3>
                  </div>

                  {/* Export Buttons: Excel, PDF, HTML */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginLeft: '0.25rem' }}>
                      <Download size={15} />
                      خروجی:
                    </span>

                    {/* Excel Button */}
                    <button
                      type="button"
                      onClick={() => exportEmployeesToExcel(filteredEmployees)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: '#ecfdf5',
                        color: '#065f46',
                        border: '1px solid #a7f3d0',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.5rem 0.85rem',
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'var(--transition)',
                      }}
                      title="دانلود فایل اکسل پرسنل"
                    >
                      <FileSpreadsheet size={16} color="#059669" />
                      <span>خروجی Excel</span>
                    </button>

                    {/* PDF Button */}
                    <button
                      type="button"
                      onClick={() => exportEmployeesToPDF(filteredEmployees)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: '#fef2f2',
                        color: '#991b1b',
                        border: '1px solid #fecaca',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.5rem 0.85rem',
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'var(--transition)',
                      }}
                      title="خروجی و چاپ نسخه PDF"
                    >
                      <FileText size={16} color="#dc2626" />
                      <span>خروجی PDF</span>
                    </button>

                    {/* HTML Button */}
                    <button
                      type="button"
                      onClick={() => exportEmployeesToHTML(filteredEmployees)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: '#eff6ff',
                        color: '#1e40af',
                        border: '1px solid #bfdbfe',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.5rem 0.85rem',
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'var(--transition)',
                      }}
                      title="دانلود گزارش کامل در قالب HTML"
                    >
                      <Code size={16} color="#2563eb" />
                      <span>خروجی HTML</span>
                    </button>
                  </div>
                </div>

                {/* Search & Filter Bar */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
                  {/* Search Bar */}
                  <div style={{ position: 'relative', flex: '1', minWidth: '280px' }}>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="جستجو بر اساس نام، کد پرسنلی، کد ملی، شماره موبایل یا دپارتمان..."
                      style={{
                        width: '100%',
                        padding: '0.75rem 2.5rem 0.75rem 0.85rem',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        outline: 'none',
                        fontSize: '0.9rem',
                      }}
                    />
                    <Search
                      size={18}
                      style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                    />
                  </div>

                  {/* Role Filter Buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedRoleFilter('all')}
                      style={{
                        padding: '0.55rem 0.95rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        background: selectedRoleFilter === 'all' ? 'var(--primary)' : '#fff',
                        color: selectedRoleFilter === 'all' ? '#fff' : 'var(--text-main)',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      همه ({allEmployees.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRoleFilter('teacher')}
                      style={{
                        padding: '0.55rem 0.95rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid #bfdbfe',
                        background: selectedRoleFilter === 'teacher' ? '#2563eb' : '#eff6ff',
                        color: selectedRoleFilter === 'teacher' ? '#fff' : '#1e40af',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      دبیران ({teacherCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRoleFilter('staff')}
                      style={{
                        padding: '0.55rem 0.95rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid #fed7aa',
                        background: selectedRoleFilter === 'staff' ? '#d97706' : '#fffbeb',
                        color: selectedRoleFilter === 'staff' ? '#fff' : '#92400e',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      کادر اداری ({staffCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRoleFilter('admin')}
                      style={{
                        padding: '0.55rem 0.95rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid #a7f3d0',
                        background: selectedRoleFilter === 'admin' ? '#059669' : '#ecfdf5',
                        color: selectedRoleFilter === 'admin' ? '#fff' : '#065f46',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      مدیریت ({adminCount})
                    </button>
                  </div>
                </div>
              </div>

              {/* Employees Table */}
              <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border-color)' }}>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>#</th>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>نام و نام خانوادگی</th>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>نقش سازمانی</th>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>دپارتمان / بخش</th>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>کد پرسنلی</th>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>کد ملی</th>
                      <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>شماره تماس</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          پرسنلی با این مشخصات یافت نشد.
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.map((emp, idx) => (
                        <tr
                          key={emp.id}
                          style={{
                            borderBottom: '1px solid var(--border-color)',
                            backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fbfcfd',
                          }}
                        >
                          <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>{idx + 1}</td>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>
                            {emp.first_name} {emp.last_name}
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span className={`role-badge ${emp.role}`} style={{ fontSize: '0.78rem' }}>
                              {roleLabels[emp.role]?.label || emp.role}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>
                            {emp.department || 'عمومی'}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontWeight: 600 }}>
                            {emp.personnel_code || '-'}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace' }}>
                            {emp.national_id || '-'}
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }} dir="ltr">
                            {emp.phone || '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <span>نمایش {filteredEmployees.length} از {allEmployees.length} پرسنل مدرسه</span>
                <span>پایگاه داده به روز رسانی شده است</span>
              </div>
            </div>
          )}

          {/* TAB 3: ADMIN 24H INVITATION ISSUING */}
          {activeTab === 'invite' && user.role === 'admin' && (
            <div>
              {/* Issuance Form */}
              <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <UserPlus size={20} color="var(--primary)" />
                  صدور مجوز ثبت‌نام و تولید لینک دعوت ۲۴ ساعته
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                  ثبت‌نام مستقیم کاربران در سامانه غیرفعال است. با ثبت مشخصات در این بخش، یک لینک با توکن امنیتی کریپتوگرافیک تولید می‌شود که دقیقاً ۲۴ ساعت اعتبار دارد و پس از ثبت‌نام فرد، خودکار باطل می‌گردد.
                </p>

                {formError && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', color: '#dc2626', fontSize: '0.875rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={18} />
                    <span>{formError}</span>
                  </div>
                )}

                {inviteResult && (
                  <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#047857', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                      <CheckCircle2 size={20} />
                      <span>لینک دعوت‌نامه با موفقیت صادر شد!</span>
                    </div>
                    <p style={{ fontSize: '0.825rem', color: '#065f46', marginBottom: '0.75rem' }}>
                      این لینک تا تاریخ {new Date(inviteResult.expiresAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })} فردا معتبر است (۲۴ ساعت). لطفاً آن را برای پرسنل مدنظر ارسال فرمایید:
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        readOnly
                        value={inviteResult.url}
                        dir="ltr"
                        style={{ flex: 1, padding: '0.65rem 0.85rem', border: '1px solid #6ee7b7', borderRadius: 'var(--radius-sm)', background: '#fff', fontSize: '0.85rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => copyToClipboard(inviteResult.url, 'new-invite')}
                        style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '0.65rem 1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 600 }}
                      >
                        {copiedToken === 'new-invite' ? <Check size={16} /> : <Copy size={16} />}
                        <span>{copiedToken === 'new-invite' ? 'کپی شد!' : 'کپی لینک'}</span>
                      </button>
                    </div>
                  </div>
                )}

                <form onSubmit={handleCreateInvite}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>نام *</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="مثال: علی"
                        required
                        style={{ width: '100%', padding: '0.7rem 0.85rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', outline: 'none' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>نام خانوادگی *</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="مثال: محمدی"
                        required
                        style={{ width: '100%', padding: '0.7rem 0.85rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', outline: 'none' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>شماره همراه *</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                        required
                        dir="ltr"
                        style={{ width: '100%', padding: '0.7rem 0.85rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', outline: 'none', textAlign: 'right' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>نقش سازمانی *</label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as 'teacher' | 'staff')}
                        style={{ width: '100%', padding: '0.7rem 0.85rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', outline: 'none', background: '#fff' }}
                      >
                        <option value="teacher">دبیر / آموزگار</option>
                        <option value="staff">کادر اداری / اجرایی</option>
                      </select>
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>دپارتمان / گروه درسی</label>
                      <input
                        type="text"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder="مثال: ریاضی، ادبیات، امور مالی..."
                        style={{ width: '100%', padding: '0.7rem 0.85rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', outline: 'none' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="submit"
                      disabled={submittingInvite}
                      style={{
                        background: 'var(--primary)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.75rem 1.75rem',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <UserPlus size={18} />
                      <span>{submittingInvite ? 'در حال صدور...' : 'تولید لینک دعوت ۲۴ ساعته'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Issued Invitations List */}
              <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={18} color="var(--text-muted)" />
                  سوابق دعوت‌نامه‌های صادر شده
                </h3>

                {loadingInvitations ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>در حال بارگذاری دعوت‌نامه‌ها...</div>
                ) : invitations.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>هنوز دعوت‌نامه‌ای صادر نشده است.</div>
                ) : (
                  <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: '0.75rem 1rem' }}>نام مدعو</th>
                          <th style={{ padding: '0.75rem 1rem' }}>شماره همراه</th>
                          <th style={{ padding: '0.75rem 1rem' }}>نقش</th>
                          <th style={{ padding: '0.75rem 1rem' }}>دپارتمان</th>
                          <th style={{ padding: '0.75rem 1rem' }}>وضعیت لینک</th>
                          <th style={{ padding: '0.75rem 1rem' }}>عملیات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invitations.map((inv) => {
                          const isExpired = new Date(inv.expires_at).getTime() < Date.now();
                          const inviteLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/register?token=${inv.token}`;

                          return (
                            <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                                {inv.first_name} {inv.last_name}
                              </td>
                              <td style={{ padding: '0.75rem 1rem' }} dir="ltr">
                                {inv.phone}
                              </td>
                              <td style={{ padding: '0.75rem 1rem' }}>
                                <span className={`role-badge ${inv.role}`} style={{ fontSize: '0.75rem' }}>
                                  {inv.role === 'teacher' ? 'دبیر' : 'اداری'}
                                </span>
                              </td>
                              <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                                {inv.department || '-'}
                              </td>
                              <td style={{ padding: '0.75rem 1rem' }}>
                                {inv.used ? (
                                  <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', fontWeight: 600 }}>
                                    <Check size={14} />
                                    ثبت‌نام شد (باطل شده)
                                  </span>
                                ) : isExpired ? (
                                  <span style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', fontWeight: 600 }}>
                                    <Clock size={14} />
                                    منقضی شده (پایان ۲۴ ساعت)
                                  </span>
                                ) : (
                                  <span style={{ color: '#2563eb', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', fontWeight: 600 }}>
                                    <Clock size={14} />
                                    فعال (در انتظار ثبت‌نام)
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '0.75rem 1rem' }}>
                                {!inv.used && !isExpired && (
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(inviteLink, inv.token)}
                                    style={{ background: '#f1f5f9', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.35rem 0.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}
                                    title="کپی مجدد لینک"
                                  >
                                    {copiedToken === inv.token ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                                    <span>{copiedToken === inv.token ? 'کپی شد' : 'کپی لینک'}</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Responsive Style for Mobile Navigation Drawer */}
      <style jsx global>{`
        @media (max-width: 900px) {
          .sidebar-nav {
            position: fixed !important;
            top: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            transform: translateX(100%);
            box-shadow: -4px 0 20px rgba(0,0,0,0.15);
          }
          .sidebar-nav.sidebar-open {
            transform: translateX(0) !important;
          }
          .mobile-menu-btn {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
