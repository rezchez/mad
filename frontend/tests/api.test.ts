import { describe, it, expect, beforeEach } from 'bun:test';
import { NextRequest } from 'next/server';
import { GET as captchaGet } from '../src/app/api/auth/captcha/route';
import { POST as loginPost } from '../src/app/api/auth/login/route';
import { POST as logoutPost } from '../src/app/api/auth/logout/route';
import { GET as meGet } from '../src/app/api/auth/me/route';
import { GET as employeesMeGet } from '../src/app/api/employees/me/route';
import { authRateLimiter, captchaRateLimiter } from '../src/lib/security/rate-limiter';
import { normalizePersianDigits } from '../src/lib/security/input-validation';
import { consumedCaptchaStore } from '../src/lib/security/captcha';

function createMockRequest(url: string, options: { method?: string; body?: any; cookies?: Record<string, string>; headers?: Record<string, string> } = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (options.cookies) {
    const cookieHeader = Object.entries(options.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
    headers.set('Cookie', cookieHeader);
  }

  return new NextRequest(new URL(url, 'http://localhost:3005'), {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

describe('5. End-to-End API Routes Testing', () => {
  beforeEach(() => {
    authRateLimiter.clear();
    captchaRateLimiter.clear();
    consumedCaptchaStore.clear();
  });

  it('GET /api/auth/captcha returns question and sets HttpOnly cookie', async () => {
    const req = createMockRequest('/api/auth/captcha');
    const res = await captchaGet(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.question).toContain('؟');

    // Verify Set-Cookie header contains captcha_token
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toContain('captcha_token=');
    expect(setCookie?.toLowerCase()).toContain('httponly');
  });

  it('POST /api/auth/login succeeds with valid National ID and correct CAPTCHA', async () => {
    // 1. Get CAPTCHA
    const capReq = createMockRequest('/api/auth/captcha');
    const capRes = await captchaGet(capReq);
    const capData = await capRes.json();
    const capCookie = capRes.headers.get('set-cookie')?.split(';')[0].split('=')[1];

    // Compute answer
    const cleanQ = normalizePersianDigits(capData.question);
    const match = cleanQ.match(/(\d+)\s*([+\-×])\s*(\d+)/);
    const n1 = parseInt(match![1], 10);
    const op = match![2];
    const n2 = parseInt(match![3], 10);
    const answer = op === '+' ? n1 + n2 : op === '-' ? n1 - n2 : n1 * n2;

    // 2. Submit Login
    const loginReq = createMockRequest('/api/auth/login', {
      method: 'POST',
      body: {
        identifier: '0010000003',
        password: 'Password123!',
        captchaAnswer: answer.toString(),
        rememberMe: true,
      },
      cookies: {
        captcha_token: capCookie!,
      },
    });

    const loginRes = await loginPost(loginReq);
    expect(loginRes.status).toBe(200);
    const loginData = await loginRes.json();
    expect(loginData.success).toBe(true);
    expect(loginData.user.email).toBe('admin@school.ir');
    expect(loginData.user.role).toBe('admin');

    // Verify pb_auth cookie is set as HttpOnly
    const setCookie = loginRes.headers.get('set-cookie');
    expect(setCookie).toContain('pb_auth=');
    expect(setCookie?.toLowerCase()).toContain('httponly');
  });

  it('POST /api/auth/login succeeds with Mobile Number', async () => {
    // 1. Get CAPTCHA
    const capReq = createMockRequest('/api/auth/captcha');
    const capRes = await captchaGet(capReq);
    const capData = await capRes.json();
    const capCookie = capRes.headers.get('set-cookie')?.split(';')[0].split('=')[1];

    const cleanQ = normalizePersianDigits(capData.question);
    const match = cleanQ.match(/(\d+)\s*([+\-×])\s*(\d+)/);
    const n1 = parseInt(match![1], 10);
    const op = match![2];
    const n2 = parseInt(match![3], 10);
    const answer = op === '+' ? n1 + n2 : op === '-' ? n1 - n2 : n1 * n2;

    // 2. Login with Phone: 09122222222 (teacher)
    const loginReq = createMockRequest('/api/auth/login', {
      method: 'POST',
      body: {
        identifier: '+989122222222', // International format
        password: 'Password123!',
        captchaAnswer: answer.toString(),
      },
      cookies: {
        captcha_token: capCookie!,
      },
    });

    const loginRes = await loginPost(loginReq);
    expect(loginRes.status).toBe(200);
    const loginData = await loginRes.json();
    expect(loginData.success).toBe(true);
    expect(loginData.user.email).toBe('teacher@school.ir');
    expect(loginData.user.role).toBe('teacher');
  });

  it('POST /api/auth/login rejects incorrect CAPTCHA without hitting PocketBase auth', async () => {
    const capReq = createMockRequest('/api/auth/captcha');
    const capRes = await captchaGet(capReq);
    const capCookie = capRes.headers.get('set-cookie')?.split(';')[0].split('=')[1];

    const loginReq = createMockRequest('/api/auth/login', {
      method: 'POST',
      body: {
        identifier: '0010000003',
        password: 'Password123!',
        captchaAnswer: '9999', // Incorrect answer
      },
      cookies: {
        captcha_token: capCookie!,
      },
    });

    const loginRes = await loginPost(loginReq);
    expect(loginRes.status).toBe(400);
    const loginData = await loginRes.json();
    expect(loginData.error).toContain('کد امنیتی اشتباه است');
    expect(loginData.captchaFailed).toBe(true);
  });

  it('POST /api/auth/login rejects reused CAPTCHA attempt (replay attack)', async () => {
    const capReq = createMockRequest('/api/auth/captcha');
    const capRes = await captchaGet(capReq);
    const capData = await capRes.json();
    const capCookie = capRes.headers.get('set-cookie')?.split(';')[0].split('=')[1];

    const cleanQ = normalizePersianDigits(capData.question);
    const match = cleanQ.match(/(\d+)\s*([+\-×])\s*(\d+)/);
    const n1 = parseInt(match![1], 10);
    const op = match![2];
    const n2 = parseInt(match![3], 10);
    const answer = op === '+' ? n1 + n2 : op === '-' ? n1 - n2 : n1 * n2;

    // First attempt: valid
    const req1 = createMockRequest('/api/auth/login', {
      method: 'POST',
      body: {
        identifier: '0010000003',
        password: 'Password123!',
        captchaAnswer: answer.toString(),
      },
      cookies: { captcha_token: capCookie! },
    });
    const res1 = await loginPost(req1);
    expect(res1.status).toBe(200);

    // Second attempt with exact same CAPTCHA cookie: replay attack
    const req2 = createMockRequest('/api/auth/login', {
      method: 'POST',
      body: {
        identifier: '0010000003',
        password: 'Password123!',
        captchaAnswer: answer.toString(),
      },
      cookies: { captcha_token: capCookie! },
    });
    const res2 = await loginPost(req2);
    expect(res2.status).toBe(400);
    const data2 = await res2.json();
    expect(data2.error).toContain('استفاده شده');
  });

  it('POST /api/auth/login returns generic error on wrong password without information disclosure', async () => {
    const capReq = createMockRequest('/api/auth/captcha');
    const capRes = await captchaGet(capReq);
    const capData = await capRes.json();
    const capCookie = capRes.headers.get('set-cookie')?.split(';')[0].split('=')[1];

    const cleanQ = normalizePersianDigits(capData.question);
    const match = cleanQ.match(/(\d+)\s*([+\-×])\s*(\d+)/);
    const n1 = parseInt(match![1], 10);
    const op = match![2];
    const n2 = parseInt(match![3], 10);
    const answer = op === '+' ? n1 + n2 : op === '-' ? n1 - n2 : n1 * n2;

    const loginReq = createMockRequest('/api/auth/login', {
      method: 'POST',
      body: {
        identifier: '0010000003',
        password: 'WrongPassword!',
        captchaAnswer: answer.toString(),
      },
      cookies: { captcha_token: capCookie! },
    });

    const res = await loginPost(loginReq);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('اطلاعات ورود یا رمز عبور نادرست است.');
  });

  it('POST /api/auth/login returns generic error on non-existent account without information disclosure', async () => {
    const capReq = createMockRequest('/api/auth/captcha');
    const capRes = await captchaGet(capReq);
    const capData = await capRes.json();
    const capCookie = capRes.headers.get('set-cookie')?.split(';')[0].split('=')[1];

    const cleanQ = normalizePersianDigits(capData.question);
    const match = cleanQ.match(/(\d+)\s*([+\-×])\s*(\d+)/);
    const n1 = parseInt(match![1], 10);
    const op = match![2];
    const n2 = parseInt(match![3], 10);
    const answer = op === '+' ? n1 + n2 : op === '-' ? n1 - n2 : n1 * n2;

    const loginReq = createMockRequest('/api/auth/login', {
      method: 'POST',
      body: {
        identifier: 'nonexistent@school.ir',
        password: 'Password123!',
        captchaAnswer: answer.toString(),
      },
      cookies: { captcha_token: capCookie! },
    });

    const res = await loginPost(loginReq);
    expect(res.status).toBe(401);
    const data = await res.json();
    // Same generic error message!
    expect(data.error).toBe('اطلاعات ورود یا رمز عبور نادرست است.');
  });

  it('POST /api/auth/logout clears auth cookie', async () => {
    const res = await logoutPost();
    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toContain('pb_auth=;');
  });

  it('GET /api/auth/me returns 401 when unauthenticated', async () => {
    const res = await meGet();
    expect(res.status).toBe(401);
  });

  it('GET /api/employees/me returns 401 when unauthenticated', async () => {
    const res = await employeesMeGet();
    expect(res.status).toBe(401);
  });
});
