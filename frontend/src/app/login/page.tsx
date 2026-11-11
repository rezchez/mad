'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  School,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

interface CaptchaData {
  id: string;
  question: string;
  expiresAt: number;
}

export default function LoginPage() {
  const router = useRouter();

  // Form states
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Status states
  const [loading, setLoading] = useState(false);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [captcha, setCaptcha] = useState<CaptchaData | null>(null);

  // Error and alert states
  const [alert, setAlert] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [identifierError, setIdentifierError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [captchaError, setCaptchaError] = useState('');

  // Password recovery dialog state
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);

  // Load saved identifier on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('school_saved_identifier');
      if (saved) {
        setIdentifier(saved);
        setRememberMe(true);
      }
    } catch {}
  }, []);

  // Fetch CAPTCHA from server
  const fetchCaptcha = useCallback(async () => {
    setCaptchaLoading(true);
    setCaptchaError('');
    try {
      const res = await fetch('/api/auth/captcha');
      const data = await res.json();
      if (res.ok) {
        setCaptcha(data);
        setCaptchaAnswer('');
      } else {
        setAlert({
          message: data.error || 'خطا در دریافت کد امنیتی. لطفاً مجدداً تلاش کنید.',
          type: 'error',
        });
      }
    } catch {
      setAlert({
        message: 'خطا در ارتباط با سرور هنگام دریافت کد امنیتی.',
        type: 'error',
      });
    } finally {
      setCaptchaLoading(false);
    }
  }, []);

  // Initial CAPTCHA load
  useEffect(() => {
    fetchCaptcha();
  }, [fetchCaptcha]);

  // Client-side quick input validation
  const validateForm = (): boolean => {
    let isValid = true;
    setIdentifierError('');
    setPasswordError('');
    setCaptchaError('');

    const cleanId = identifier.trim();
    if (!cleanId) {
      setIdentifierError('لطفاً کد ملی، شماره موبایل یا ایمیل خود را وارد کنید.');
      isValid = false;
    }

    if (!password) {
      setPasswordError('لطفاً رمز عبور خود را وارد کنید.');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('رمز عبور باید حداقل ۶ کاراکتر باشد.');
      isValid = false;
    }

    if (!captchaAnswer.trim()) {
      setCaptchaError('لطفاً پاسخ کد امنیتی را وارد کنید.');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);

    if (!validateForm()) return;

    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
          captchaAnswer: captchaAnswer.trim(),
          rememberMe,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Save or clear remembered identifier
        try {
          if (rememberMe) {
            localStorage.setItem('school_saved_identifier', identifier.trim());
          } else {
            localStorage.removeItem('school_saved_identifier');
          }
        } catch {}

        setAlert({
          message: 'ورود با موفقیت انجام شد! در حال انتقال به سامانه...',
          type: 'success',
        });

        // Redirect to dashboard
        setTimeout(() => {
          router.push(data.redirectTo || '/dashboard');
        }, 1200);
      } else {
        setAlert({
          message: data.error || 'اطلاعات ورود نادرست است.',
          type: 'error',
        });
        // Always refresh CAPTCHA on failed attempt
        fetchCaptcha();
      }
    } catch {
      setAlert({
        message: 'خطا در برقراری ارتباط با سرور. لطفاً اتصال اینترنت خود را بررسی کنید.',
        type: 'error',
      });
      fetchCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        {/* Header */}
        <div className="card-header">
          <div className="logo-icon" aria-hidden="true">
            <School size={34} />
          </div>
          <h2>ورود به سامانه مدرسه</h2>
          <p className="subtitle">
            ورود با کد ملی، شماره موبایل یا پست الکترونیک
          </p>
        </div>

        {/* Alert box */}
        {alert && (
          <div
            className={`alert-box show ${alert.type}`}
            role="alert"
            aria-live="polite"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {alert.type === 'error' ? (
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
              ) : (
                <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              )}
              <span>{alert.message}</span>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} noValidate>
          {/* Identifier Input */}
          <div className="form-group">
            <label htmlFor="identifier">شناسه کاربری</label>
            <div className="input-wrapper">
              <input
                type="text"
                id="identifier"
                name="identifier"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (identifierError) setIdentifierError('');
                  if (alert) setAlert(null);
                }}
                placeholder="کد ملی، شماره موبایل یا ایمیل"
                autoComplete="username"
                dir="auto"
                className={identifierError ? 'input-error' : ''}
                required
              />
              <span className="field-icon" aria-hidden="true">
                <User size={18} />
              </span>
            </div>
            <span className="error-text" id="identifierError">
              {identifierError}
            </span>
          </div>

          {/* Password Input */}
          <div className="form-group">
            <div className="label-row">
              <label htmlFor="password">رمز عبور</label>
              <button
                type="button"
                className="forgot-link"
                onClick={() => setShowRecoveryDialog(true)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                فراموشی رمز؟
              </button>
            </div>
            <div className="input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                  if (alert) setAlert(null);
                }}
                placeholder="••••••••"
                autoComplete="current-password"
                className={passwordError ? 'input-error' : ''}
                required
              />
              <span className="field-icon" aria-hidden="true">
                <Lock size={18} />
              </span>
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'مخفی کردن رمز عبور' : 'نمایش رمز عبور'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <span className="error-text" id="passwordError">
              {passwordError}
            </span>
          </div>

          {/* Persian CAPTCHA Group */}
          <div className="form-group">
            <label htmlFor="captchaAnswer">کد امنیتی (حساب کنید)</label>
            <div className="captcha-container">
              <div
                className="captcha-display"
                title="مسئله ریاضی را حل کرده و پاسخ را وارد کنید"
                aria-label={captcha ? `کد امنیتی: ${captcha.question}` : 'در حال بارگذاری'}
              >
                {captchaLoading ? '...' : captcha ? captcha.question : 'در حال دریافت...'}
              </div>
              <button
                type="button"
                className="captcha-refresh-btn"
                onClick={fetchCaptcha}
                disabled={captchaLoading}
                title="تغییر کد امنیتی"
                aria-label="تغییر کد امنیتی"
              >
                <RefreshCw
                  size={18}
                  style={{
                    animation: captchaLoading ? 'spin 0.8s linear infinite' : 'none',
                  }}
                />
              </button>
            </div>

            <div className="input-wrapper captcha-input-wrapper">
              <input
                type="text"
                id="captchaAnswer"
                name="captchaAnswer"
                value={captchaAnswer}
                onChange={(e) => {
                  setCaptchaAnswer(e.target.value);
                  if (captchaError) setCaptchaError('');
                  if (alert) setAlert(null);
                }}
                placeholder="پاسخ را به عدد وارد کنید (مثال: ۱۲)"
                inputMode="numeric"
                dir="ltr"
                className={captchaError ? 'input-error' : ''}
                autoComplete="off"
                required
              />
            </div>
            <span className="error-text" id="captchaError">
              {captchaError}
            </span>
          </div>

          {/* Options: Remember Me */}
          <div className="form-options">
            <label className="remember-me">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>مرا به خاطر بسپار</span>
            </label>
          </div>

          {/* Submit Button */}
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading && <span className="spinner" aria-hidden="true"></span>}
            <span>{loading ? 'در حال بررسی...' : 'ورود به سامانه'}</span>
          </button>
        </form>

        {/* Footer info */}
        <div className="card-footer">
          <p>
            پشتیبانی و امور فناوری اطلاعات مدرسه | تماس با مدیر سامانه
          </p>
        </div>
      </div>

      {/* Password Recovery Modal / Dialog */}
      {showRecoveryDialog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 100,
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="recoveryTitle"
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '420px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <HelpCircle size={24} color="#4f46e5" />
              <h3 id="recoveryTitle" style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                راهنمای بازیابی رمز عبور
              </h3>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
              جهت حفظ امنیت اطلاعات و حریم خصوصی کادر آموزشی و دانش‌آموزان، بازیابی رمز عبور تنها از طریق مراجعه به دفتر مدیریت یا تماس با مسئول فناوری مدرسه با ارائه مدارک هویتی امکان‌پذیر است.
            </p>
            <button
              type="button"
              className="submit-btn"
              onClick={() => setShowRecoveryDialog(false)}
            >
              متوجه شدم
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
