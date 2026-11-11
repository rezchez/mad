@echo off
chcp 65001 >nul
title سامانه جامع مدرسه - سرور توسعه

echo ============================================================
echo   🚀 اجرای محیط توسعه سامانه جامع مدرسه (Madrese Dev Server)
echo ============================================================
echo   🌐 فرانت‌اند (Next.js):      http://localhost:3005
echo   🗄️  بک‌اند (PocketBase):      http://127.0.0.1:8095
echo   🛠️  پنل ادمین (Dashboard):  http://127.0.0.1:8095/_/
echo ------------------------------------------------------------
echo   برای متوقف کردن سرویس‌ها پنجره‌های ترمینال مربوطه را ببندید.
echo ============================================================
echo.

set "ROOT_DIR=%~dp0"

echo ▶ [1/2] در حال اجرای بک‌اند (PocketBase روی پورت 8095)...
if exist "%ROOT_DIR%backend\pocketbase.exe" (
    start "Madrese - Backend (PocketBase)" /D "%ROOT_DIR%backend" cmd /k "pocketbase.exe serve --http=127.0.0.1:8095 --dir=pb_data"
) else if exist "%ROOT_DIR%backend\pocketbase" (
    start "Madrese - Backend (PocketBase)" /D "%ROOT_DIR%backend" cmd /k "pocketbase serve --http=127.0.0.1:8095 --dir=pb_data"
) else (
    echo [هشدار] فایل اجرایی pocketbase در پوشه backend یافت نشد.
)

timeout /t 2 /nobreak >nul

echo ▶ [2/2] در حال اجرای فرانت‌اند (Next.js روی پورت 3005)...
start "Madrese - Frontend (Next.js)" /D "%ROOT_DIR%frontend" cmd /k "bun run dev"

echo.
echo هر دو سرویس در ترمینال اجرا شدند.
pause
