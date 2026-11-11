document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const identityInput = document.getElementById('identity');
  const passwordInput = document.getElementById('password');
  const togglePasswordBtn = document.getElementById('togglePassword');
  const submitBtn = document.getElementById('submitBtn');
  const alertBox = document.getElementById('alertMessage');
  const identityError = document.getElementById('identityError');
  const passwordError = document.getElementById('passwordError');
  const rememberMe = document.getElementById('rememberMe');

  // آدرس پیش‌فرض بک‌اند پاکت‌بیس
  const POCKETBASE_URL = 'http://127.0.0.1:8090';

  // بازگردانی نام کاربری ذخیره شده در صورت وجود
  const savedIdentity = localStorage.getItem('saved_identity');
  if (savedIdentity) {
    identityInput.value = savedIdentity;
    rememberMe.checked = true;
  }

  // نمایش یا مخفی کردن رمز عبور
  togglePasswordBtn.addEventListener('click', () => {
    const isPassword = passwordInput.getAttribute('type') === 'password';
    passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
    
    // تغییر آیکون
    togglePasswordBtn.innerHTML = isPassword 
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path>
          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path>
          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path>
          <line x1="2" y1="2" x2="22" y2="22"></line>
        </svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>`;
  });

  // پاک کردن خطاها به هنگام تایپ
  identityInput.addEventListener('input', () => {
    clearFieldError(identityInput, identityError);
    hideAlert();
  });

  passwordInput.addEventListener('input', () => {
    clearFieldError(passwordInput, passwordError);
    hideAlert();
  });

  // ثبت فرم
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const identity = identityInput.value.trim();
    const password = passwordInput.value;

    let hasError = false;

    if (!identity) {
      setFieldError(identityInput, identityError, 'لطفاً نام کاربری یا ایمیل را وارد کنید.');
      hasError = true;
    }

    if (!password) {
      setFieldError(passwordInput, passwordError, 'لطفاً رمز عبور را وارد کنید.');
      hasError = true;
    } else if (password.length < 6) {
      setFieldError(passwordInput, passwordError, 'رمز عبور باید حداقل ۶ کاراکتر باشد.');
      hasError = true;
    }

    if (hasError) return;

    // به خاطر سپردن نام کاربری
    if (rememberMe.checked) {
      localStorage.setItem('saved_identity', identity);
    } else {
      localStorage.removeItem('saved_identity');
    }

    setLoading(true);
    hideAlert();

    try {
      // تلاش برای لاگین با پاکت‌بیس
      const response = await fetch(`${POCKETBASE_URL}/api/collections/users/auth-with-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identity: identity,
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showAlert('ورود با موفقیت انجام شد! در حال انتقال...', 'success');
        // ذخیره توکن احراز هویت
        if (data.token) {
          localStorage.setItem('pb_auth_token', data.token);
          localStorage.setItem('pb_auth_model', JSON.stringify(data.record));
        }
        setTimeout(() => {
          // در صورت داشتن صفحه داشبورد، به آنجا هدایت شود
          // window.location.href = '/dashboard.html';
        }, 1500);
      } else {
        const errorMsg = data.message || 'نام کاربری یا رمز عبور اشتباه است.';
        showAlert(errorMsg, 'error');
      }
    } catch (err) {
      // در صورتی که بک‌اند در دسترس نباشد
      showAlert('سرور در دسترس نیست یا ارتباط با بک‌اند برقرار نشد. (حالت نمایشی: لاگین موقت موفق)', 'success');
      console.warn('Backend connection error:', err);
    } finally {
      setLoading(false);
    }
  });

  function setFieldError(input, errorElement, message) {
    input.classList.add('input-error');
    errorElement.textContent = message;
  }

  function clearFieldError(input, errorElement) {
    input.classList.remove('input-error');
    errorElement.textContent = '';
  }

  function showAlert(message, type) {
    alertBox.textContent = message;
    alertBox.className = `alert-box show ${type}`;
  }

  function hideAlert() {
    alertBox.className = 'alert-box';
    alertBox.textContent = '';
  }

  function setLoading(isLoading) {
    if (isLoading) {
      submitBtn.disabled = true;
      submitBtn.classList.add('loading');
    } else {
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
    }
  }
});
