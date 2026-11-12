/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  const employees = app.findCollectionByNameOrId("employees");

  const personnelList = [
    // --- 20 معلمان و کادر آموزشی (Teachers) ---
    {
      code: "EMP-101",
      firstName: "محمد",
      lastName: "رضایی",
      role: "teacher",
      department: "گروه ریاضی و هندسه",
      email: "m.rezaei@school.ir",
      nationalId: "0040000011",
      phone: "09120000101"
    },
    {
      code: "EMP-102",
      firstName: "فاطمه",
      lastName: "حسینی",
      role: "teacher",
      department: "گروه زبان و ادبیات فارسی",
      email: "f.hosseini@school.ir",
      nationalId: "0040000028",
      phone: "09120000102"
    },
    {
      code: "EMP-103",
      firstName: "حسین",
      lastName: "مرادی",
      role: "teacher",
      department: "گروه فیزیک",
      email: "h.moradi@school.ir",
      nationalId: "0040000036",
      phone: "09120000103"
    },
    {
      code: "EMP-104",
      firstName: "زهرا",
      lastName: "کریمی",
      role: "teacher",
      department: "گروه شیمی",
      email: "z.karimi@school.ir",
      nationalId: "0040000044",
      phone: "09120000104"
    },
    {
      code: "EMP-105",
      firstName: "علی",
      lastName: "احمدی",
      role: "teacher",
      department: "گروه زیست‌شناسی",
      email: "a.ahmadi@school.ir",
      nationalId: "0040000052",
      phone: "09120000105"
    },
    {
      code: "EMP-106",
      firstName: "مریم",
      lastName: "صادقی",
      role: "teacher",
      department: "گروه زبان انگلیسی",
      email: "m.sadeghi@school.ir",
      nationalId: "0040000060",
      phone: "09120000106"
    },
    {
      code: "EMP-107",
      firstName: "مهدی",
      lastName: "موسوی",
      role: "teacher",
      department: "گروه عربی و معارف",
      email: "m.mousavi@school.ir",
      nationalId: "0040000079",
      phone: "09120000107"
    },
    {
      code: "EMP-108",
      firstName: "نرگس",
      lastName: "ابراهیمی",
      role: "teacher",
      department: "گروه تاریخ و جغرافیا",
      email: "n.ebrahimi@school.ir",
      nationalId: "0040000087",
      phone: "09120000108"
    },
    {
      code: "EMP-109",
      firstName: "امیرحسین",
      lastName: "باقری",
      role: "teacher",
      department: "گروه دین و زندگی",
      email: "a.bagheri@school.ir",
      nationalId: "0040000095",
      phone: "09120000109"
    },
    {
      code: "EMP-110",
      firstName: "سمیرا",
      lastName: "نجفی",
      role: "teacher",
      department: "گروه هنر و خوشنویسی",
      email: "s.najafi@school.ir",
      nationalId: "0040000109",
      phone: "09120000110"
    },
    {
      code: "EMP-111",
      firstName: "علیرضا",
      lastName: "اکبری",
      role: "teacher",
      department: "گروه علوم اجتماعی",
      email: "a.akbari@school.ir",
      nationalId: "0040000117",
      phone: "09120000111"
    },
    {
      code: "EMP-112",
      firstName: "سارا",
      lastName: "جعفری",
      role: "teacher",
      department: "گروه کامپیوتر و هوش مصنوعی",
      email: "s.jafari@school.ir",
      nationalId: "0040000125",
      phone: "09120000112"
    },
    {
      code: "EMP-113",
      firstName: "مسعود",
      lastName: "قاسم‌زاده",
      role: "teacher",
      department: "گروه تربیت بدنی و سلامت",
      email: "m.ghasemzadeh@school.ir",
      nationalId: "0040000133",
      phone: "09120000113"
    },
    {
      code: "EMP-114",
      firstName: "الناز",
      lastName: "تقوی",
      role: "teacher",
      department: "گروه زبان و ادبیات عرب",
      email: "e.taghavi@school.ir",
      nationalId: "0040000141",
      phone: "09120000114"
    },
    {
      code: "EMP-115",
      firstName: "سعید",
      lastName: "رمضانی",
      role: "teacher",
      department: "گروه حسابان و دیفرانسیل",
      email: "s.ramezani@school.ir",
      nationalId: "0040000151",
      phone: "09120000115"
    },
    {
      code: "EMP-116",
      firstName: "پگاه",
      lastName: "طاهری",
      role: "teacher",
      department: "گروه مطالعات و جامعه‌شناسی",
      email: "p.taheri@school.ir",
      nationalId: "0040000168",
      phone: "09120000116"
    },
    {
      code: "EMP-117",
      firstName: "احسان",
      lastName: "شریفی",
      role: "teacher",
      department: "گروه زبان انگلیسی پیشرفته",
      email: "e.sharifi@school.ir",
      nationalId: "0040000176",
      phone: "09120000117"
    },
    {
      code: "EMP-118",
      firstName: "بهاره",
      lastName: "کاظمی",
      role: "teacher",
      department: "گروه زمین‌شناسی و محیط‌زیست",
      email: "b.kazemi@school.ir",
      nationalId: "0040000184",
      phone: "09120000118"
    },
    {
      code: "EMP-119",
      firstName: "نیما",
      lastName: "داوودی",
      role: "teacher",
      department: "گروه آزمایشگاه فیزیک و نانو",
      email: "n.davoodi@school.ir",
      nationalId: "0040000192",
      phone: "09120000119"
    },
    {
      code: "EMP-120",
      firstName: "شیما",
      lastName: "مختاری",
      role: "teacher",
      department: "گروه زیست‌فناوری و سلولی",
      email: "s.mokhtari@school.ir",
      nationalId: "0040000206",
      phone: "09120000120"
    },

    // --- 10 کادر اداری و اجرایی (Administrative Staff) ---
    {
      code: "EMP-121",
      firstName: "غلامرضا",
      lastName: "نوری",
      role: "staff",
      department: "معاونت آموزشی و برنامه‌ریزی",
      email: "gh.nouri@school.ir",
      nationalId: "0040000214",
      phone: "09120000121"
    },
    {
      code: "EMP-122",
      firstName: "لیلا",
      lastName: "رستمی",
      role: "staff",
      department: "معاونت پرورشی و فرهنگی",
      email: "l.rostami@school.ir",
      nationalId: "0040000222",
      phone: "09120000122"
    },
    {
      code: "EMP-123",
      firstName: "بهروز",
      lastName: "یوسفی",
      role: "staff",
      department: "معاونت فناوری و هوشمندسازی",
      email: "b.yousefi@school.ir",
      nationalId: "0040000230",
      phone: "09120000123"
    },
    {
      code: "EMP-124",
      firstName: "اعظم",
      lastName: "حیدری",
      role: "staff",
      department: "امور دفتری، دبیرخانه و بایگانی",
      email: "a.heidari@school.ir",
      nationalId: "0040000249",
      phone: "09120000124"
    },
    {
      code: "EMP-125",
      firstName: "کامران",
      lastName: "سعیدی",
      role: "staff",
      department: "امور مالی و حسابداری",
      email: "k.saeedi@school.ir",
      nationalId: "0040000257",
      phone: "09120000125"
    },
    {
      code: "EMP-126",
      firstName: "معصومه",
      lastName: "شکوری",
      role: "staff",
      department: "مرکز مشاوره و هدایت تحصیلی",
      email: "m.shakoori@school.ir",
      nationalId: "0040000265",
      phone: "09120000126"
    },
    {
      code: "EMP-127",
      firstName: "جواد",
      lastName: "همتی",
      role: "staff",
      department: "مدیریت کتابخانه و مرکز اسناد",
      email: "j.hemmati@school.ir",
      nationalId: "0040000273",
      phone: "09120000127"
    },
    {
      code: "EMP-128",
      firstName: "فرزانه",
      lastName: "ملکی",
      role: "staff",
      department: "مدیریت آزمایشگاه‌ها و کارگاه‌ها",
      email: "f.maleki@school.ir",
      nationalId: "0040000281",
      phone: "09120000128"
    },
    {
      code: "EMP-129",
      firstName: "داوود",
      lastName: "میرزایی",
      role: "staff",
      department: "پذیرش، ثبت‌نام و آمار",
      email: "d.mirzaei@school.ir",
      nationalId: "0040000291",
      phone: "09120000129"
    },
    {
      code: "EMP-130",
      firstName: "مهناز",
      lastName: "خسروی",
      role: "staff",
      department: "امور فارغ‌التحصیلان و گواهی‌نامه‌ها",
      email: "m.khosravi@school.ir",
      nationalId: "0040000303",
      phone: "09120000130"
    }
  ];

  const defaultPassword = "School123456!";

  for (const item of personnelList) {
    const fullName = `${item.firstName} ${item.lastName}`;

    let userRecord;
    try {
      userRecord = app.findFirstRecordByFilter("users", "email = {:email}", { email: item.email });
    } catch (e) {
      userRecord = null;
    }

    if (!userRecord) {
      userRecord = new Record(users);
      userRecord.set("email", item.email);
      userRecord.set("name", fullName);
      userRecord.set("national_id", item.nationalId);
      userRecord.set("phone", item.phone);
      userRecord.set("role", item.role);
      userRecord.set("verified", true);
      userRecord.set("emailVisibility", false);
      userRecord.setPassword(defaultPassword);
      app.save(userRecord);
    }

    let empRecord;
    try {
      empRecord = app.findFirstRecordByFilter("employees", "user = {:userId}", { userId: userRecord.id });
    } catch (e) {
      empRecord = null;
    }

    if (!empRecord) {
      empRecord = new Record(employees);
      empRecord.set("user", userRecord.id);
      empRecord.set("personnel_code", item.code);
      empRecord.set("first_name", item.firstName);
      empRecord.set("last_name", item.lastName);
      empRecord.set("national_id", item.nationalId);
      empRecord.set("phone", item.phone);
      empRecord.set("role", item.role);
      empRecord.set("department", item.department);
      app.save(empRecord);
    }
  }
}, (app) => {
  // down queries
});
