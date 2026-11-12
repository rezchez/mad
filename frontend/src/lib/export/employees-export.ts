import * as XLSX from 'xlsx';
import type { SchoolEmployee } from '@/lib/pocketbase/server';

const roleLabels: Record<string, string> = {
  admin: 'مدیر سامانه',
  teacher: 'دبیر / آموزگار',
  staff: 'پرسنل اداری',
};

/**
 * 1. Export Employees to Excel (.xlsx)
 */
export function exportEmployeesToExcel(employees: SchoolEmployee[], filename = 'school-personnel.xlsx') {
  // Format data for Excel
  const excelData = employees.map((emp, index) => ({
    'ردیف': index + 1,
    'نام و نام خانوادگی': `${emp.first_name} ${emp.last_name}`,
    'نقش سازمانی': roleLabels[emp.role] || emp.role,
    'دپارتمان / گروه': emp.department || 'عمومی',
    'کد پرسنلی': emp.personnel_code || '-',
    'کد ملی': emp.national_id || '-',
    'شماره تماس': emp.phone || '-',
    'ایمیل سازمانی': emp.email || '-',
  }));

  // Create worksheet with RTL direction
  const worksheet = XLSX.utils.json_to_sheet(excelData);
  worksheet['!dir'] = 'rtl';

  // Set column widths
  worksheet['!cols'] = [
    { wch: 8 },  // ردیف
    { wch: 25 }, // نام و نام خانوادگی
    { wch: 18 }, // نقش سازمانی
    { wch: 20 }, // دپارتمان
    { wch: 15 }, // کد پرسنلی
    { wch: 15 }, // کد ملی
    { wch: 16 }, // شماره تماس
    { wch: 25 }, // ایمیل
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'پرسنل مدرسه');

  XLSX.writeFile(workbook, filename);
}

/**
 * 2. Generate and download a standalone beautiful HTML report
 */
export function exportEmployeesToHTML(employees: SchoolEmployee[], filename = 'school-personnel.html') {
  const currentDate = new Date().toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const currentTime = new Date().toLocaleTimeString('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const teacherCount = employees.filter(e => e.role === 'teacher').length;
  const staffCount = employees.filter(e => e.role === 'staff').length;
  const adminCount = employees.filter(e => e.role === 'admin').length;

  const rowsHtml = employees
    .map(
      (emp, idx) => `
    <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
      <td style="text-align: center; color: #64748b; font-size: 13px;">${idx + 1}</td>
      <td style="font-weight: 600;">${emp.first_name} ${emp.last_name}</td>
      <td>
        <span class="role-badge ${emp.role}">
          ${roleLabels[emp.role] || emp.role}
        </span>
      </td>
      <td>${emp.department || 'عمومی'}</td>
      <td style="font-family: monospace; font-size: 13px;">${emp.personnel_code || '-'}</td>
      <td style="font-family: monospace; font-size: 13px;">${emp.national_id || '-'}</td>
      <td dir="ltr" style="font-family: monospace; font-size: 13px;">${emp.phone || '-'}</td>
      <td dir="ltr" style="font-size: 13px; color: #475569;">${emp.email || '-'}</td>
    </tr>
  `
    )
    .join('');

  const htmlContent = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>فهرست پرسنل و کادر آموزشی سامانه مدرسه</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Vazirmatn', Tahoma, sans-serif;
    }
    body {
      background-color: #f1f5f9;
      color: #1e293b;
      padding: 2.5rem 1.5rem;
    }
    .report-card {
      max-width: 1100px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
      padding: 2.5rem 2rem;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .header-title h1 {
      font-size: 1.5rem;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 0.25rem;
    }
    .header-title p {
      font-size: 0.875rem;
      color: #64748b;
    }
    .header-meta {
      text-align: left;
      font-size: 0.85rem;
      color: #64748b;
      line-height: 1.6;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 1rem;
      text-align: center;
    }
    .stat-card span {
      display: block;
      font-size: 0.8rem;
      color: #64748b;
      margin-bottom: 0.25rem;
    }
    .stat-card strong {
      font-size: 1.4rem;
      font-weight: 800;
      color: #0f172a;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    th {
      background-color: #f8fafc;
      border-bottom: 2px solid #cbd5e1;
      padding: 0.85rem 1rem;
      text-align: right;
      font-weight: 700;
      color: #334155;
    }
    td {
      padding: 0.85rem 1rem;
      border-bottom: 1px solid #e2e8f0;
      text-align: right;
    }
    .role-badge {
      display: inline-block;
      padding: 0.2rem 0.65rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .role-badge.admin {
      background-color: #fef3c7;
      color: #92400e;
    }
    .role-badge.teacher {
      background-color: #dbeafe;
      color: #1e40af;
    }
    .role-badge.staff {
      background-color: #e0e7ff;
      color: #3730a3;
    }
    .footer {
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.8rem;
      color: #94a3b8;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .report-card { border: none; box-shadow: none; padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="report-card">
    <div class="header">
      <div class="header-title">
        <h1>گزارش پرسنل و کادر آموزشی مدرسه</h1>
        <p>سامانه جامع مدیریت و خدمات پرسنلی مدرسه</p>
      </div>
      <div class="header-meta">
        <div>تاریخ صدور: <strong>${currentDate}</strong></div>
        <div>ساعت: <strong>${currentTime}</strong></div>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <span>کل پرسنل ثبت‌شده</span>
        <strong>${employees.length} نفر</strong>
      </div>
      <div class="stat-card">
        <span>کادر آموزشی و دبیران</span>
        <strong>${teacherCount} نفر</strong>
      </div>
      <div class="stat-card">
        <span>کادر اداری و اجرایی</span>
        <strong>${staffCount} نفر</strong>
      </div>
      <div class="stat-card">
        <span>مدیران سامانه</span>
        <strong>${adminCount} نفر</strong>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 40px; text-align: center;">#</th>
          <th>نام و نام خانوادگی</th>
          <th>نقش سازمانی</th>
          <th>دپارتمان</th>
          <th>کد پرسنلی</th>
          <th>کد ملی</th>
          <th>شماره تماس</th>
          <th>ایمیل</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="footer">
      <span>تولید شده توسط سامانه جامع مدرسه - پنل مدیریت</span>
      <span>محرمانه - ویژه بایگانی و مدیریت مدرسه</span>
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 3. Print / Save as PDF with native high-res Persian typography
 */
export function exportEmployeesToPDF(employees: SchoolEmployee[]) {
  const currentDate = new Date().toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const rowsHtml = employees
    .map(
      (emp, idx) => `
    <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
      <td style="text-align: center; color: #64748b; font-size: 11px;">${idx + 1}</td>
      <td style="font-weight: 700; font-size: 12px;">${emp.first_name} ${emp.last_name}</td>
      <td style="font-size: 11px;">${roleLabels[emp.role] || emp.role}</td>
      <td style="font-size: 11px;">${emp.department || 'عمومی'}</td>
      <td style="font-family: monospace; font-size: 11px;">${emp.personnel_code || '-'}</td>
      <td style="font-family: monospace; font-size: 11px;">${emp.national_id || '-'}</td>
      <td dir="ltr" style="font-family: monospace; font-size: 11px;">${emp.phone || '-'}</td>
    </tr>
  `
    )
    .join('');

  const printWindow = window.open('', '_blank', 'width=1000,height=800');
  if (!printWindow) {
    alert('لطفاً اجازه باز شدن پنجره پاپ‌آپ (Pop-up) را در مرورگر خود بدهید.');
    return;
  }

  printWindow.document.write(`<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>نسخه چاپی و PDF پرسنل مدرسه</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 10mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Vazirmatn', Tahoma, sans-serif;
    }
    body {
      background: #fff;
      color: #0f172a;
      padding: 10px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    .header h1 {
      font-size: 16px;
      font-weight: 800;
    }
    .header span {
      font-size: 11px;
      color: #475569;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    th {
      background-color: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 6px 8px;
      text-align: right;
      font-weight: 700;
    }
    td {
      padding: 6px 8px;
      border: 1px solid #cbd5e1;
      text-align: right;
    }
    .footer {
      margin-top: 15px;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #64748b;
      border-top: 1px solid #cbd5e1;
      padding-top: 8px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>فهرست پرسنل و کادر آموزشی مدرسه</h1>
      <span>تعداد کل پرسنل: ${employees.length} نفر</span>
    </div>
    <div>
      <span>تاریخ گزارش: <strong>${currentDate}</strong></span>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 30px; text-align: center;">#</th>
        <th>نام و نام خانوادگی</th>
        <th>نقش سازمانی</th>
        <th>دپارتمان</th>
        <th>کد پرسنلی</th>
        <th>کد ملی</th>
        <th>شماره تماس</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="footer">
    <span>سامانه جامع مدیریت هوشمند مدرسه</span>
    <span>صفحه ۱ از ۱</span>
  </div>

  <script>
    window.onload = function() {
      setTimeout(() => {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>`);

  printWindow.document.close();
}
