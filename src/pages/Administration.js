import React, { useEffect, useMemo, useState } from "https://esm.sh/react@18.3.1";
import { db } from "../supabase.js";
import { roleLabel } from "../helpers.js";

const ROLE_OPTIONS = [
  {
    value: "medical_officer",
    label: "Medical Officer"
  },
  {
    value: "fellow",
    label: "Fellow"
  },
  {
    value: "consultant",
    label: "Consultant / Specialist"
  },
  {
    value: "admin",
    label: "Administrator"
  }
];

const EMPTY_FORM = {
  display_name: "",
  login_id: "",
  role: "medical_officer",
  department_id: "",
  active: true,
  temporary_password: ""
};

export default function Administration({ profile }) {
  const [profiles, setProfiles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [wards, setWards] = useState([]);
  const [beds, setBeds] = useState([]);
  const [permissions, setPermissions] = useState([]);

  const [showCreateUser, setShowCreateUser] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [createdCredentials, setCreatedCredentials] = useState(null);

  const activeUsers = useMemo(
    () => profiles.filter((user) => user.active),
    [profiles]
  );

  async function loadAdministration() {
    setLoading(true);
    setError("");

    const [
      profilesResult,
      departmentsResult,
      wardsResult,
      bedsResult,
      permissionsResult
    ] = await Promise.all([
      db
        .from("profiles")
        .select("*")
        .order("created_at", {
          ascending: false
        }),

      db
        .from("departments")
        .select("*")
        .order("name", {
          ascending: true
        }),

      db
        .from("wards")
        .select("*")
        .order("name", {
          ascending: true
        }),

      db
        .from("beds")
        .select("*")
        .order("name", {
          ascending: true
        }),

      db
        .from("permissions")
        .select("*")
        .eq("active", true)
        .order("code", {
          ascending: true
        })
    ]);

    const firstError =
      profilesResult.error ||
      departmentsResult.error ||
      wardsResult.error ||
      bedsResult.error ||
      permissionsResult.error;

    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    setProfiles(profilesResult.data || []);
    setDepartments(departmentsResult.data || []);
    setWards(wardsResult.data || []);
    setBeds(bedsResult.data || []);
    setPermissions(permissionsResult.data || []);

    setLoading(false);
  }

  useEffect(() => {
    loadAdministration();
  }, []);

  function updateField(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value
    }));
  }

  function openCreateUser() {
    setError("");
    setSuccess("");
    setCreatedCredentials(null);

    setForm({
      ...EMPTY_FORM
    });

    setShowCreateUser(true);
  }

  function closeCreateUser() {
    if (saving) return;

    setShowCreateUser(false);

    setForm({
      ...EMPTY_FORM
    });
  }

  async function createUser(event) {
    event.preventDefault();

    setError("");
    setSuccess("");
    setCreatedCredentials(null);

    const displayName = form.display_name.trim();
    const loginId = form.login_id.trim();

    if (!displayName) {
      setError("Full Name is required.");
      return;
    }

    if (!loginId) {
      setError("Login ID is required.");
      return;
    }

    if (!/^[A-Za-z0-9._-]{3,40}$/.test(loginId)) {
      setError(
        "Login ID must contain only letters, numbers, dots, underscores or hyphens and be 3–40 characters."
      );
      return;
    }

    if (!form.role) {
      setError("Role is required.");
      return;
    }

    if (
      form.temporary_password.trim() &&
      form.temporary_password.trim().length < 8
    ) {
      setError("Temporary password must be at least 8 characters.");
      return;
    }

    setSaving(true);

    try {
      const { data: sessionData } = await db.auth.getSession();

      const accessToken =
        sessionData?.session?.access_token;

      if (!accessToken) {
        setError(
          "Your session has expired. Please sign in again."
        );

        setSaving(false);
        return;
      }

      const { data, error: functionError } =
        await db.functions.invoke(
          "admin-create-user",
          {
            body: {
              display_name: displayName,
              login_id: loginId,
              role: form.role,
              department_id:
                form.department_id || null,
              active: form.active,
              temporary_password:
                form.temporary_password.trim() ||
                undefined
            }
          }
        );

      if (functionError) {
        setError(functionError.message);
        setSaving(false);
        return;
      }

      if (data?.error) {
        setError(data.error);
        setSaving(false);
        return;
      }

      setCreatedCredentials({
        name: data.profile.display_name,
        login_id: data.profile.login_id,
        password: data.temporary_password
      });

      setSuccess(
        "User account created successfully."
      );

      setForm({
        ...EMPTY_FORM
      });

      setShowCreateUser(false);

      await loadAdministration();
    } catch (errorObject) {
      setError(
        errorObject?.message ||
          "Unable to create user."
      );
    }

    setSaving(false);
  }

  async function copyCredentials() {
    if (!createdCredentials) return;

    const credentials =
      "PRISM Login ID: " +
      createdCredentials.login_id +
      "\nTemporary Password: " +
      createdCredentials.password;

    try {
      await navigator.clipboard.writeText(
        credentials
      );

      setSuccess(
        "Credentials copied to clipboard."
      );
    } catch (_) {
      setError(
        "Unable to copy automatically. Please copy the credentials manually."
      );
    }
  }

  if (profile?.role !== "admin") {
    return React.createElement(
      "div",
      {
        className: "card"
      },

      React.createElement(
        "div",
        {
          className: "empty"
        },
        "Access restricted to administrators."
      )
    );
  }

  const createUserForm =
    showCreateUser
      ? React.createElement(
          "div",
          {
            className: "card"
          },

          React.createElement(
            "div",
            {
              className: "row wrap"
            },

            React.createElement(
              "div",
              null,

              React.createElement(
                "div",
                {
                  className: "section-title"
                },
                "Create User"
              ),

              React.createElement(
                "div",
                {
                  className: "page-subtitle"
                },
                "Create the account centrally. The user will be required to change the temporary password at first login."
              )
            ),

            React.createElement(
              "button",
              {
                className:
                  "btn btn-secondary",
                type: "button",
                onClick:
                  closeCreateUser
              },
              "Cancel"
            )
          ),

          React.createElement(
            "form",
            {
              onSubmit: createUser
            },

            React.createElement(
              "div",
              {
                className:
                  "grid grid-2"
              },

              React.createElement(
                "label",
                {
                  className: "field"
                },

                React.createElement(
                  "span",
                  null,
                  "Full Name"
                ),

                React.createElement(
                  "input",
                  {
                    value:
                      form.display_name,

                    onChange: (event) =>
                      updateField(
                        "display_name",
                        event.target.value
                      ),

                    placeholder:
                      "e.g. Dr Ahmed Ali",

                    required: true
                  }
                )
              ),

              React.createElement(
                "label",
                {
                  className: "field"
                },

                React.createElement(
                  "span",
                  null,
                  "PRISM Login ID"
                ),

                React.createElement(
                  "input",
                  {
                    value:
                      form.login_id,

                    onChange: (event) =>
                      updateField(
                        "login_id",
                        event.target.value
                      ),

                    placeholder:
                      "e.g. AHMED01",

                    autoCapitalize:
                      "none",

                    autoCorrect:
                      "off",

                    spellCheck:
                      false,

                    required: true
                  }
                ),

                React.createElement(
                  "small",
                  {
                    className:
                      "muted"
                  },
                  "This is the username you give the doctor for PRISM login."
                )
              ),

              React.createElement(
                "label",
                {
                  className: "field"
                },

                React.createElement(
                  "span",
                  null,
                  "Role"
                ),

                React.createElement(
                  "select",
                  {
                    value: form.role,

                    onChange: (event) =>
                      updateField(
                        "role",
                        event.target.value
                      )
                  },

                  ROLE_OPTIONS.map(
                    (option) =>
                      React.createElement(
                        "option",
                        {
                          key:
                            option.value,

                          value:
                            option.value
                        },
                        option.label
                      )
                  )
                )
              ),

              React.createElement(
                "label",
                {
                  className: "field"
                },

                React.createElement(
                  "span",
                  null,
                  "Department"
                ),

                React.createElement(
                  "select",
                  {
                    value:
                      form.department_id,

                    onChange: (event) =>
                      updateField(
                        "department_id",
                        event.target.value
                      )
                  },

                  React.createElement(
                    "option",
                    {
                      value: ""
                    },
                    "No department"
                  ),

                  departments
                    .filter(
                      (department) =>
                        department.active !==
                        false
                    )
                    .map(
                      (department) =>
                        React.createElement(
                          "option",
                          {
                            key:
                              department.id,

                            value:
                              department.id
                          },
                          department.name
                        )
                    )
                )
              ),

              React.createElement(
                "label",
                {
                  className: "field"
                },

                React.createElement(
                  "span",
                  null,
                  "Temporary Password"
                ),

                React.createElement(
                  "input",
                  {
                    type: "text",

                    value:
                      form.temporary_password,

                    onChange: (event) =>
                      updateField(
                        "temporary_password",
                        event.target.value
                      ),

                    placeholder:
                      "Leave blank to generate automatically",

                    autoComplete:
                      "off"
                  }
                ),

                React.createElement(
                  "small",
                  {
                    className:
                      "muted"
                  },
                  "If blank, PRISM generates a temporary password."
                )
              )
            ),

            React.createElement(
              "div",
              {
                className:
                  "detail-box",
                style: {
                  marginTop:
                    "12px"
                }
              },

              React.createElement(
                "label",
                {
                  className: "row",
                  style: {
                    gap: "8px"
                  }
                },

                React.createElement(
                  "input",
                  {
                    type: "checkbox",

                    checked:
                      form.active,

                    onChange: (event) =>
                      updateField(
                        "active",
                        event.target
                          .checked
                      )
                  }
                ),

                React.createElement(
                  "span",
                  null,
                  "Account active"
                )
              )
            ),

            React.createElement(
              "div",
              {
                className: "row",
                style: {
                  marginTop:
                    "16px"
                }
              },

              React.createElement(
                "button",
                {
                  className:
                    "btn btn-primary",

                  type: "submit",

                  disabled:
                    saving
                },
                saving
                  ? "Creating..."
                  : "Create User"
              )
            )
          )
        )
      : null;

  const credentialCard =
    createdCredentials
      ? React.createElement(
          "div",
          {
            className: "card"
          },

          React.createElement(
            "div",
            {
              className:
                "section-title"
            },
            "User Created"
          ),

          React.createElement(
            "div",
            {
              className:
                "page-subtitle"
            },
            "Give these credentials to the user. The temporary password is not stored in the profile."
          ),

          React.createElement(
            "div",
            {
              className:
                "detail-box",
              style: {
                marginTop:
                  "12px"
              }
            },

            React.createElement(
              "div",
              null,

              React.createElement(
                "strong",
                null,
                createdCredentials.name
              )
            ),

            React.createElement(
              "div",
              {
                style: {
                  marginTop:
                    "8px"
                }
              },
              "Login ID: ",

              React.createElement(
                "strong",
                null,
                createdCredentials.login_id
              )
            ),

            React.createElement(
              "div",
              {
                style: {
                  marginTop:
                    "8px"
                }
              },
              "Temporary Password: ",

              React.createElement(
                "strong",
                null,
                createdCredentials.password
              )
            )
          ),

          React.createElement(
            "div",
            {
              className: "row",
              style: {
                marginTop:
                  "12px"
              }
            },

            React.createElement(
              "button",
              {
                className:
                  "btn btn-secondary",

                type: "button",

                onClick:
                  copyCredentials
              },
              "Copy Credentials"
            ),

            React.createElement(
              "button",
              {
                className:
                  "btn btn-secondary",

                type: "button",

                onClick: () =>
                  setCreatedCredentials(
                    null
                  )
              },
              "Dismiss"
            )
          )
        )
      : null;

  return React.createElement(
    React.Fragment,
    null,

    React.createElement(
      "div",
      {
        className:
          "row wrap"
      },

      React.createElement(
        "div",
        null,

        React.createElement(
          "div",
          {
            className:
              "page-title"
          },
          "Administration"
        ),

        React.createElement(
          "div",
          {
            className:
              "page-subtitle"
          },
          "Users, roles, permissions, departments, wards and beds"
        )
      ),

      React.createElement(
        "div",
        {
          className: "row"
        },

        React.createElement(
          "button",
          {
            className:
              "btn btn-primary",

            type: "button",

            onClick:
              openCreateUser
          },
          "+ Add User"
        ),

        React.createElement(
          "button",
          {
            className:
              "btn btn-secondary",

            type: "button",

            onClick:
              loadAdministration,

            disabled:
              loading
          },
          loading
            ? "Refreshing..."
            : "Refresh"
        )
      )
    ),

    error
      ? React.createElement(
          "div",
          {
            className: "error"
          },
          error
        )
      : null,

    success
      ? React.createElement(
          "div",
          {
            className:
              "success"
          },
          success
        )
      : null,

    credentialCard,

    createUserForm,

    loading

      ? React.createElement(
          "div",
          {
            className:
              "loading"
          },
          "Loading administration data..."
        )

      : React.createElement(
          React.Fragment,
          null,

          React.createElement(
            "div",
            {
              className:
                "grid grid-4"
            },

            React.createElement(
              "div",
              {
                className: "card"
              },

              React.createElement(
                "div",
                {
                  className:
                    "stat-label"
                },
                "Users"
              ),

              React.createElement(
                "div",
                {
                  className:
                    "stat-number"
                },
                profiles.length
              ),

              React.createElement(
                "div",
                {
                  className:
                    "muted"
                },
                activeUsers.length +
                  " active"
              )
            ),

            React.createElement(
              "div",
              {
                className: "card"
              },

              React.createElement(
                "div",
                {
                  className:
                    "stat-label"
                },
                "Permissions"
              ),

              React.createElement(
                "div",
                {
                  className:
                    "stat-number"
                },
                permissions.length
              )
            ),

            React.createElement(
              "div",
              {
                className: "card"
              },

              React.createElement(
                "div",
                {
                  className:
                    "stat-label"
                },
                "Departments"
              ),

              React.createElement(
                "div",
                {
                  className:
                    "stat-number"
                },
                departments.length
              )
            ),

            React.createElement(
              "div",
              {
                className: "card"
              },

              React.createElement(
                "div",
                {
                  className:
                    "stat-label"
                },
                "Beds"
              ),

              React.createElement(
                "div",
                {
                  className:
                    "stat-number"
                },
                beds.length
              )
            )
          ),

          React.createElement(
            "div",
            {
              className: "card"
            },

            React.createElement(
              "div",
              {
                className:
                  "section-title"
              },
              "Users & Roles"
            ),

            profiles.length === 0

              ? React.createElement(
                  "div",
                  {
                    className:
                      "empty"
                  },
                  "No users found."
                )

              : React.createElement(
                  "div",
                  {
                    className:
                      "table-wrap"
                  },

                  React.createElement(
                    "table",
                    null,

                    React.createElement(
                      "thead",
                      null,

                      React.createElement(
                        "tr",
                        null,

                        React.createElement(
                          "th",
                          null,
                          "Name"
                        ),

                        React.createElement(
                          "th",
                          null,
                          "Login ID"
                        ),

                        React.createElement(
                          "th",
                          null,
                          "Role"
                        ),

                        React.createElement(
                          "th",
                          null,
                          "Department"
                        ),

                        React.createElement(
                          "th",
                          null,
                          "Status"
                        )
                      )
                    ),

                    React.createElement(
                      "tbody",
                      null,

                      profiles.map(
                        (user) => {
                          const department =
                            departments.find(
                              (item) =>
                                item.id ===
                                user.department_id
                            );

                          return React.createElement(
                            "tr",
                            {
                              key:
                                user.id
                            },

                            React.createElement(
                              "td",
                              null,
                              user.display_name ||
                                "—"
                            ),

                            React.createElement(
                              "td",
                              null,
                              user.login_id ||
                                "—"
                            ),

                            React.createElement(
                              "td",
                              null,
                              roleLabel(
                                user.role
                              )
                            ),

                            React.createElement(
                              "td",
                              null,
                              department?.name ||
                                "—"
                            ),

                            React.createElement(
                              "td",
                              null,

                              React.createElement(
                                "span",
                                {
                                  className:
                                    user.active
                                      ? "badge badge-stable"
                                      : "badge badge-unstable"
                                },

                                user.active
                                  ? "Active"
                                  : "Inactive"
                              )
                            )
                          );
                        }
                      )
                    )
                  )
                )
          ),

          React.createElement(
            "div",
            {
              className: "card"
            },

            React.createElement(
              "div",
              {
                className:
                  "section-title"
              },
              "Permission Catalog"
            ),

            permissions.length === 0

              ? React.createElement(
                  "div",
                  {
                    className:
                      "empty"
                  },
                  "No permissions configured."
                )

              : React.createElement(
                  "div",
                  {
                    className:
                      "grid grid-2"
                  },

                  permissions.map(
                    (permission) =>
                      React.createElement(
                        "div",
                        {
                          key:
                            permission.id,

                          className:
                            "detail-box"
                        },

                        React.createElement(
                          "strong",
                          null,
                          permission.code
                        ),

                        permission.name
                          ? React.createElement(
                              "div",
                              {
                                className:
                                  "muted"
                              },
                              permission.name
                            )
                          : null,

                        permission.description
                          ? React.createElement(
                              "div",
                              {
                                className:
                                  "muted"
                              },
                              permission.description
                            )
                          : null
                      )
                  )
                )
          ),

          React.createElement(
            "div",
            {
              className:
                "grid grid-2"
            },

            React.createElement(
              "div",
              {
                className: "card"
              },

              React.createElement(
                "div",
                {
                  className:
                    "section-title"
                },
                "Departments"
              ),

              departments.length === 0

                ? React.createElement(
                    "div",
                    {
                      className:
                        "empty"
                    },
                    "No departments found."
                  )

                : departments.map(
                    (department) =>
                      React.createElement(
                        "div",
                        {
                          key:
                            department.id,

                          className:
                            "detail-box",

                          style: {
                            marginBottom:
                              "8px"
                          }
                        },

                        React.createElement(
                          "div",
                          {
                            className:
                              "row"
                          },

                          React.createElement(
                            "strong",
                            null,
                            department.name
                          ),

                          React.createElement(
                            "span",
                            {
                              className:
                                department.active
                                  ? "badge badge-stable"
                                  : "badge badge-unstable"
                            },

                            department.active
                              ? "Active"
                              : "Inactive"
                          )
                        )
                      )
                  )
            ),

            React.createElement(
              "div",
              {
                className: "card"
              },

              React.createElement(
                "div",
                {
                  className:
                    "section-title"
                },
                "Wards"
              ),

              wards.length === 0

                ? React.createElement(
                    "div",
                    {
                      className:
                        "empty"
                    },
                    "No wards found."
                  )

                : wards.map(
                    (ward) =>
                      React.createElement(
                        "div",
                        {
                          key:
                            ward.id,

                          className:
                            "detail-box",

                          style: {
                            marginBottom:
                              "8px"
                          }
                        },

                        React.createElement(
                          "div",
                          {
                            className:
                              "row"
                          },

                          React.createElement(
                            "strong",
                            null,
                            ward.name
                          ),

                          React.createElement(
                            "span",
                            {
                              className:
                                ward.active
                                  ? "badge badge-stable"
                                  : "badge badge-unstable"
                            },

                            ward.active
                              ? "Active"
                              : "Inactive"
                          )
                        )
                      )
                  )
            )
          ),

          React.createElement(
            "div",
            {
              className: "card"
            },

            React.createElement(
              "div",
              {
                className:
                  "section-title"
              },
              "Beds"
            ),

            beds.length === 0

              ? React.createElement(
                  "div",
                  {
                    className:
                      "empty"
                  },
                  "No beds found."
                )

              : React.createElement(
                  "div",
                  {
                    className:
                      "table-wrap"
                  },

                  React.createElement(
                    "table",
                    null,

                    React.createElement(
                      "thead",
                      null,

                      React.createElement(
                        "tr",
                        null,

                        React.createElement(
                          "th",
                          null,
                          "Bed"
                        ),

                        React.createElement(
                          "th",
                          null,
                          "Ward"
                        ),

                        React.createElement(
                          "th",
                          null,
                          "Status"
                        )
                      )
                    ),

                    React.createElement(
                      "tbody",
                      null,

                      beds.map(
                        (bed) =>
                          React.createElement(
                            "tr",
                            {
                              key:
                                bed.id
                            },

                            React.createElement(
                              "td",
                              null,
                              bed.name ||
                                "—"
                            ),

                            React.createElement(
                              "td",
                              null,
                              bed.ward_id ||
                                "—"
                            ),

                            React.createElement(
                              "td",
                              null,

                              React.createElement(
                                "span",
                                {
                                  className:
                                    bed.active
                                      ? "badge badge-stable"
                                      : "badge badge-unstable"
                                },

                                bed.active
                                  ? "Active"
                                  : "Inactive"
                              )
                            )
                          )
                      )
                    )
                  )
                )
          )
        )
  );
}
