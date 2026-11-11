/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  const employees = app.findCollectionByNameOrId("employees");

  const sampleUsers = [
    {
      name: "مدیر سیستم",
      email: "admin@school.ir",
      national_id: "0010000003",
      phone: "09121111111",
      role: "admin",
      password: "Password123!",
      employee: {
        personnel_code: "EMP-001",
        first_name: "علی",
        last_name: "مدیری",
        department: "مدیریت"
      }
    },
    {
      name: "سارا حسینی",
      email: "teacher@school.ir",
      national_id: "0020000006",
      phone: "09122222222",
      role: "teacher",
      password: "Password123!",
      employee: {
        personnel_code: "EMP-002",
        first_name: "سارا",
        last_name: "حسینی",
        department: "آموزش"
      }
    },
    {
      name: "رضا محمدی",
      email: "staff@school.ir",
      national_id: "0030000009",
      phone: "09123333333",
      role: "staff",
      password: "Password123!",
      employee: {
        personnel_code: "EMP-003",
        first_name: "رضا",
        last_name: "محمدی",
        department: "امور اداری و دفتری"
      }
    }
  ];

  for (const item of sampleUsers) {
    let userRecord;
    try {
      userRecord = app.findFirstRecordByFilter("users", "email = {:email}", { email: item.email });
    } catch (e) {
      userRecord = null;
    }

    if (!userRecord) {
      userRecord = new Record(users);
      userRecord.set("email", item.email);
      userRecord.set("name", item.name);
      userRecord.set("national_id", item.national_id);
      userRecord.set("phone", item.phone);
      userRecord.set("role", item.role);
      userRecord.set("verified", true);
      userRecord.set("emailVisibility", false);
      userRecord.setPassword(item.password);
      app.save(userRecord);
    }

    // Check employee record
    let empRecord;
    try {
      empRecord = app.findFirstRecordByFilter("employees", "user = {:userId}", { userId: userRecord.id });
    } catch (e) {
      empRecord = null;
    }

    if (!empRecord) {
      empRecord = new Record(employees);
      empRecord.set("user", userRecord.id);
      empRecord.set("personnel_code", item.employee.personnel_code);
      empRecord.set("first_name", item.employee.first_name);
      empRecord.set("last_name", item.employee.last_name);
      empRecord.set("national_id", item.national_id);
      empRecord.set("phone", item.phone);
      empRecord.set("role", item.role);
      empRecord.set("department", item.employee.department);
      app.save(empRecord);
    }
  }
}, (app) => {
  // down queries
});
