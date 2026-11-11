/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");

  // Add fields to users if they don't already exist
  if (!users.fields.getByName("national_id")) {
    users.fields.add(new TextField({
      name: "national_id",
      min: 10,
      max: 10,
      pattern: "^[0-9]{10}$",
      presentable: true,
      required: false
    }));
  }

  if (!users.fields.getByName("phone")) {
    users.fields.add(new TextField({
      name: "phone",
      min: 11,
      max: 11,
      pattern: "^09[0-9]{9}$",
      presentable: true,
      required: false
    }));
  }

  if (!users.fields.getByName("role")) {
    users.fields.add(new SelectField({
      name: "role",
      values: ["admin", "teacher", "staff"],
      maxSelect: 1,
      required: true,
      presentable: true
    }));
  }

  // Add indexes to users
  const userIndexes = users.indexes || [];
  if (!userIndexes.some(idx => idx.includes("idx_users_national_id"))) {
    userIndexes.push("CREATE UNIQUE INDEX `idx_users_national_id` ON `users` (`national_id`) WHERE `national_id` != ''");
  }
  if (!userIndexes.some(idx => idx.includes("idx_users_phone"))) {
    userIndexes.push("CREATE UNIQUE INDEX `idx_users_phone` ON `users` (`phone`) WHERE `phone` != ''");
  }
  users.indexes = userIndexes;

  app.save(users);

  // Check if employees collection already exists
  let employees;
  try {
    employees = app.findCollectionByNameOrId("employees");
  } catch (e) {
    employees = null;
  }

  if (!employees) {
    employees = new Collection({
      name: "employees",
      type: "base",
      listRule: "@request.auth.id != '' && (user = @request.auth.id || @request.auth.role = 'admin')",
      viewRule: "@request.auth.id != '' && (user = @request.auth.id || @request.auth.role = 'admin')",
      createRule: "@request.auth.role = 'admin'",
      updateRule: "@request.auth.role = 'admin'",
      deleteRule: "@request.auth.role = 'admin'",
      fields: [
        {
          name: "user",
          type: "relation",
          required: true,
          maxSelect: 1,
          collectionId: users.id,
          cascadeDelete: false
        },
        {
          name: "personnel_code",
          type: "text",
          required: true,
          min: 1,
          max: 50
        },
        {
          name: "first_name",
          type: "text",
          required: true,
          min: 1,
          max: 100
        },
        {
          name: "last_name",
          type: "text",
          required: true,
          min: 1,
          max: 100
        },
        {
          name: "national_id",
          type: "text",
          required: true,
          min: 10,
          max: 10
        },
        {
          name: "phone",
          type: "text",
          required: true,
          min: 11,
          max: 11
        },
        {
          name: "role",
          type: "select",
          required: true,
          values: ["admin", "teacher", "staff"],
          maxSelect: 1
        },
        {
          name: "department",
          type: "text",
          required: false
        }
      ],
      indexes: [
        "CREATE UNIQUE INDEX `idx_employees_user` ON `employees` (`user`)",
        "CREATE UNIQUE INDEX `idx_employees_personnel_code` ON `employees` (`personnel_code`)",
        "CREATE UNIQUE INDEX `idx_employees_national_id` ON `employees` (`national_id`)"
      ]
    });
    app.save(employees);
  }
}, (app) => {
  // Rollback logic
  try {
    const employees = app.findCollectionByNameOrId("employees");
    if (employees) app.delete(employees);
  } catch (e) {}

  try {
    const users = app.findCollectionByNameOrId("users");
    users.fields.removeByName("national_id");
    users.fields.removeByName("phone");
    users.fields.removeByName("role");
    app.save(users);
  } catch (e) {}
});
