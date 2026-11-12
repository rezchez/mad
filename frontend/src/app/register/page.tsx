'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  UserCheck,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Phone,
  Shield,
  Briefcase,
  ArrowRight,
} from 'lucide-react';

interface CaptchaData {
  id: string;
  question: string;
  expiresAt: number;
}

interface InvitationData {
  first_name: string;
  last_name: string;
  phone: string;
  role: 'teacher' | 'staff';
  department: string;
  national_id?: string;
  email?: string;
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  // Invitation status
  const [verifying, setVerifying] = useState(true);
  const [invitationError, setInvitationError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);

  // Form inputs
  const [nationalId, setNationalId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaAnswer, setCaptchaAnswer] = useState('');

  // Status
  const [loading, setLoading] = useState(false);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [captcha, setCaptcha] = useState<CaptchaData | null>(null);
  const [alert, setAlert] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  // 1. Verify invitation token on mount
  useEffect(() => {
    if (!token) {
      setInvitationError('لینک دعوت‌نامه مشخص نشده است. ثبت‌نام فقط از طریق لینک اختصاصی ارسالی توسط مدیر امکان‌پذیر است.');
      setVerifying(false);
      return;
    }

    async function checkToken() {
      try {
        const res = await fetch(`/api/auth/invitation/verify?token=${encodeURIComponent(token!)}`);
        const data = await res.json();

        if (res.ok && data.valid) {
          setInvitation(data.invitation);
          if (data.invitation.national_id) setNationalId(data.invitation.national_id);
          if (data.invitation.email) setEmail(data.invitation.email);
        } else {
          setInvitationError(data.message || 'لینک دعوت‌نامه منقضی شده یا قبلاً استفاده گردیده است.');
        }
      } catch {
        setInvitationError('خطا در بررسی اعتبار لینک دعوت‌نامه.');
      } finally {
        setVerifying(false);
      }
    }

    checkToken();
  }, [token]);

  // 2. Fetch CAPTCHA
  const fetchCaptcha = useCallback(async () => {
    setCaptchaLoading(true);
    try {
      const res = await fetch('/api/auth/captcha');
      const data = await res.json();
      if (res.ok) {
        setCaptcha(data);
        setCaptchaAnswer('');
      }
    } catch {}
    finally {
      setCaptchaLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!verifying && !invitationError) {
      fetchCaptcha();
    }
  }, [verifying, invitationError, fetchCaptcha]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);

    if (password.length < 8) {
      setAlert({ message: 'رمز عبور باید حداقل ۸ کاراکتر باشد.', type: 'error' });
      return;
    }

    if (password !== passwordConfirm) {
      setAlert({ message: 'رمز عبور با تکرار آن یکسان نیست.', type: 'error' });
      return;
    }

    if (!captchaAnswer.trim()) {
      setAlert({ message: 'لطفاً پاسخ کد امنیتی را وارد کنید.', type: 'error' });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/invitation/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
          nationalId: nationalId.trim(),
          email: email.trim().toLowerCase(),
          captchaAnswer: captchaAnswer.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setAlert({
          message: 'ثبت‌نام شما با موفقیت تکمیل شد! در حال انتقال به صفحه ورود...',
          type: 'success',
        });
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setAlert({ message: data.error || 'خطا در ثبت‌نام.', type: 'error' });
        fetchCaptcha();
      }
    } catch {
      setAlert({ message: 'خطا در برقراری ارتباط با سرور.', type: 'error' });
      fetchCaptcha();
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="login-wrapper">
        <div className="login-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div className="spinner" style={{ width: '32px', height: '32px', borderTopColor: 'var(--primary)', margin: '0 auto 1rem' }}></div>
          <p style={{ color: 'var(--text-muted)' }}>در حال بررسی اعتبار لینک دعوت‌نامه مدیر...</p>
        </div>
      </div>
    );
  }

  if (invitationError) {
    return (
      <div className="login-wrapper">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <div className="logo-icon" style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}>
            <AlertCircle size={36} />
          </div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: '#b91c1c' }}>
            دعوت‌نامه غیرفعال یا منقضی شده
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
            {invitationError}
          </p>
          <button
            type="button"
            className="submit-btn"
            onClick={() => router.push('/login')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <span>بازگشت به صفحه ورود</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  const roleTitle = invitation?.role === 'teacher' ? 'دبیر / آموزگار' : 'پرسنل اداری';

  return (
    <div className="login-wrapper" style={{ maxWidth: '480px' }}>
      <div className="login-card">
        <div className="card-header">
          <div className="logo-icon">
            <UserCheck size={34} />
          </div>
          <h2>تکمیل ثبت‌نام پرسنل</h2>
          <p className="subtitle">
            دعوت‌نامه صادرشده توسط مدیریت مدرسه (معتبر به مدت ۲۴ ساعت)
          </p>
        </div>

        {/* Invited Info Badge */}
        <div style={{ background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)' }}>
              {invitation?.first_name} {invitation?.last_name}
            </span>
            <span className={`role-badge ${invitation?.role}`} style={{ fontSize: '0.75rem' }}>
              {roleTitle}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Phone size={14} />
              <b dir="ltr">{invitation?.phone}</b>
            </span>
            {invitation?.department && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Briefcase size={14} />
                {invitation.department}
              </span>
            )}
          </div>
        </div>

        {alert && (
          <div className={`alert-box show ${alert.type}`} role="alert">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {alert.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
              <span>{alert.message}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* National ID */}
          <div className="form-group">
            <label htmlFor="nationalId">کد ملی</label>
            <div className="input-wrapper">
              <input
                type="text"
                id="nationalId"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                placeholder="کد ملی ۱۰ رقمی"
                maxLength={10}
                required
                readOnly={Boolean(invitation?.national_id)}
                style={invitation?.national_id ? { backgroundColor: '#f1f5f9' } : {}}
              />
            </div>
          </div>

          {/* Email */}
          <div className="form-group">
            <label htmlFor="email">پست الکترونیک (ایمیل)</label>
            <div className="input-wrapper">
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@school.ir"
                required
                readOnly={Boolean(invitation?.email)}
                style={invitation?.email ? { backgroundColor: '#f1f5f9' } : {}}
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="password">رمز عبور دلخواه (حداقل ۸ کاراکتر)</label>
            <div className="input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="نمایش یا مخفی کردن رمز"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label htmlFor="passwordConfirm">تکرار رمز عبور</label>
            <div className="input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="passwordConfirm"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {/* Persian CAPTCHA */}
          <div className="form-group">
            <label htmlFor="captchaAnswer">کد امنیتی</label>
            <div className="captcha-container">
              <div className="captcha-display">
                {captchaLoading ? '...' : captcha ? captcha.question : 'در حال بارگذاری...'}
              </div>
              <button
                type="button"
                className="captcha-refresh-btn"
                onClick={fetchCaptcha}
                disabled={captchaLoading}
                title="تغییر کد امنیتی"
              >
                <RefreshCw size={18} style={{ animation: captchaLoading ? 'spin 0.8s linear infinite' : 'none' }} />
              </button>
            </div>
            <div className="input-wrapper captcha-input-wrapper">
              <input
                type="text"
                id="captchaAnswer"
                value={captchaAnswer}
                onChange={(e) => setCaptchaAnswer(e.target.value)}
                placeholder="پاسخ را وارد کنید"
                inputMode="numeric"
                dir="ltr"
                required
              />
            </div>
          </div>

          {/* Submit */}
          <button type="submit" className="submit-btn" disabled={loading} style={{ marginTop: '1rem' }}>
            {loading && <span className="spinner"></span>}
            <span>{loading ? 'در حال فعال‌سازی حساب...' : 'تکمیل ثبت‌نام و فعال‌سازی'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="login-wrapper">
          <div className="login-card" style={{ textAlign: 'center', padding: '3rem' }}>
            <span className="spinner" style={{ width: '28px', height: '28px' }}></span>
          </div>
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
