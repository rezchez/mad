/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");

  let invitations;
  try {
    invitations = app.findCollectionByNameOrId("invitations");
  } catch (e) {
    invitations = null;
  }

  if (!invitations) {
    invitations = new Collection({
      name: "invitations",
      type: "base",
      listRule: "@request.auth.role = 'admin'",
      viewRule: "@request.auth.role = 'admin'",
      createRule: "@request.auth.role = 'admin'",
      updateRule: "@request.auth.role = 'admin'",
      deleteRule: "@request.auth.role = 'admin'",
      fields: [
        {
          name: "token",
          type: "text",
          required: true,
          min: 32,
          max: 128
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
          name: "phone",
          type: "text",
          required: true,
          min: 11,
          max: 11
        },
        {
          name: "email",
          type: "text",
          required: false
        },
        {
          name: "national_id",
          type: "text",
          required: false,
          min: 10,
          max: 10
        },
        {
          name: "role",
          type: "select",
          required: true,
          values: ["teacher", "staff"],
          maxSelect: 1
        },
        {
          name: "department",
          type: "text",
          required: false
        },
        {
          name: "expires_at",
          type: "text",
          required: true
        },
        {
          name: "used",
          type: "bool",
          required: false
        },
        {
          name: "used_at",
          type: "text",
          required: false
        },
        {
          name: "created_by",
          type: "relation",
          required: false,
          maxSelect: 1,
          collectionId: users.id,
          cascadeDelete: false
        }
      ],
      indexes: [
        "CREATE UNIQUE INDEX `idx_invitations_token` ON `invitations` (`token`)",
        "CREATE INDEX `idx_invitations_phone` ON `invitations` (`phone`)"
      ]
    });
    app.save(invitations);
  }
}, (app) => {
  try {
    const invitations = app.findCollectionByNameOrId("invitations");
    if (invitations) app.delete(invitations);
  } catch (e) {}
});
