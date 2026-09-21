import React, {
  useEffect,
  useState
} from "https://esm.sh/react@18.3.1";

import { db } from "../supabase.js";

const SUPABASE_URL =
  "https://rcikgkdesnlfewkfeybv.supabase.co";

const FUNCTION_URL =
  `${SUPABASE_URL}/functions/v1/admin-create-user`;

function roleLabel(role) {
  const labels = {
    admin: "Administrator",
    medical_officer: "Medical Officer",
    fellow: "Fellow",
    consultant: "Consultant"
  };

  return labels[role] || role || "—";
}

export default function Administration({
  profile
}) {
  const [profiles, setProfiles] =
    useState([]);

  const [departments, setDepartments] =
    useState([]);

  const [units, setUnits] =
    useState([]);

  const [departmentRoles, setDepartmentRoles] =
    useState([]);

  const [wards, setWards] =
    useState([]);

  const [beds, setBeds] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [showCreateUser, setShowCreateUser] =
    useState(false);

  const [creatingUser, setCreatingUser] =
    useState(false);

  const [createError, setCreateError] =
    useState("");

  const [createdUser, setCreatedUser] =
    useState(null);

  const [form, setForm] = useState({
    display_name: "",
    login_id: "",
    role: "medical_officer",
    department_id: "",
    home_unit_id: "",
    department_role_id: "",
    active: true
  });


  /* ======================================================
     LOAD ADMINISTRATION DATA
  ====================================================== */

  async function loadAdministration() {
    setLoading(true);
    setError("");

    try {
      const [
        profilesResult,
        departmentsResult,
        unitsResult,
        rolesResult,
        wardsResult,
        bedsResult
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
          .from("units")
          .select("*")
          .order("name", {
            ascending: true
          }),

        db
          .from("department_roles")
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
          })
      ]);

      const firstError =
        profilesResult.error ||
        departmentsResult.error ||
        unitsResult.error ||
        rolesResult.error ||
        wardsResult.error ||
        bedsResult.error;

      if (firstError) {
        throw firstError;
      }

      setProfiles(
        profilesResult.data || []
      );

      setDepartments(
        departmentsResult.data || []
      );

      setUnits(
        unitsResult.data || []
      );

      setDepartmentRoles(
        rolesResult.data || []
      );

      setWards(
        wardsResult.data || []
      );

      setBeds(
        bedsResult.data || []
      );
    } catch (err) {
      console.error(
        "Administration loading error:",
        err
      );

      setError(
        err?.message ||
        "Unable to load administration data."
      );
    } finally {
      setLoading(false);
    }
  }


  useEffect(() => {
    loadAdministration();
  }, []);


  /* ======================================================
     FORM HELPERS
  ====================================================== */

  function updateField(
    field,
    value
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value
    }));
  }


  function resetCreateForm() {
    setForm({
      display_name: "",
      login_id: "",
      role: "medical_officer",
      department_id: "",
      home_unit_id: "",
      department_role_id: "",
      active: true
    });

    setCreateError("");
    setCreatedUser(null);
  }


  function openCreateUser() {
    resetCreateForm();
    setShowCreateUser(true);
  }


  function closeCreateUser() {
    if (creatingUser) {
      return;
    }

    setShowCreateUser(false);
    resetCreateForm();
  }


  /* ======================================================
     FILTERED OPTIONS
  ====================================================== */

  const filteredUnits =
    form.department_id
      ? units.filter(
          (unit) =>
            unit.department_id ===
            form.department_id
        )
      : [];

  const filteredRoles =
    form.department_id
      ? departmentRoles.filter(
          (role) =>
            role.department_id ===
              form.department_id &&
            role.active !== false
        )
      : [];


  /* ======================================================
     CREATE USER
  ====================================================== */

  async function createUser(
    event
  ) {
    event.preventDefault();

    setCreateError("");
    setCreatedUser(null);

    if (
      !form.display_name.trim()
    ) {
      setCreateError(
        "Full name is required."
      );
      return;
    }

    if (
      !form.login_id.trim()
    ) {
      setCreateError(
        "PRISM Login ID is required."
      );
      return;
    }

    if (
      !/^[A-Za-z0-9._-]{3,40}$/.test(
        form.login_id.trim()
      )
    ) {
      setCreateError(
        "Login ID must contain only letters, numbers, dot, underscore or hyphen."
      );
      return;
    }

    if (
      !form.role
    ) {
      setCreateError(
        "System role is required."
      );
      return;
    }

    setCreatingUser(true);

    try {
      const {
        data: {
          session
        }
      } = await db.auth.getSession();

      if (!session?.access_token) {
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      const response =
        await fetch(
          FUNCTION_URL,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${session.access_token}`
            },

            body: JSON.stringify({
              display_name:
                form.display_name.trim(),

              login_id:
                form.login_id.trim(),

              role:
                form.role,

              department_id:
                form.department_id ||
                null,

              home_unit_id:
                form.home_unit_id ||
                null,

              active:
                form.active
            })
          }
        );

      let payload = null;

      try {
        payload =
          await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok) {
        throw new Error(
          payload?.error ||
          `User creation failed (${response.status}).`
        );
      }

      if (
        !payload?.user_id
      ) {
        throw new Error(
          "The server did not return the created user."
        );
      }


      /* ==================================================
         OPTIONAL HOME UNIT
      ================================================== */

      if (
        form.home_unit_id
      ) {
        const {
          error:
            homeUnitError
        } = await db.rpc(
          "admin_set_home_unit",
          {
            p_user_id:
              payload.user_id,

            p_unit_id:
              form.home_unit_id
          }
        );

        if (homeUnitError) {
          throw new Error(
            `User created, but Home Unit assignment failed: ${homeUnitError.message}`
          );
        }
      }


      /* ==================================================
         OPTIONAL DEPARTMENT ROLE
      ================================================== */

      if (
        form.department_role_id
      ) {
        const {
          error:
            departmentRoleError
        } = await db.rpc(
          "admin_assign_department_role",
          {
            p_user_id:
              payload.user_id,

            p_department_role_id:
              form.department_role_id,

            p_unit_id:
              form.home_unit_id ||
              null
          }
        );

        if (departmentRoleError) {
          throw new Error(
            `User created, but Department Role assignment failed: ${departmentRoleError.message}`
          );
        }
      }


      setCreatedUser({
        user_id:
          payload.user_id,

        display_name:
          form.display_name.trim(),

        login_id:
          form.login_id.trim(),

        role:
          form.role,

        temporary_password:
          payload.temporary_password ||
          null
      });


      await loadAdministration();

    } catch (err) {
      console.error(
        "Create user error:",
        err
      );

      setCreateError(
        err?.message ||
        "Unable to create user."
      );
    } finally {
      setCreatingUser(false);
    }
  }


  /* ======================================================
     ACCESS CONTROL
  ====================================================== */

  if (
    profile?.role !==
    "admin"
  ) {
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


  /* ======================================================
     RENDER
  ====================================================== */

  return React.createElement(
    React.Fragment,
    null,


    /* ====================================================
       HEADER
    ==================================================== */

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
          "Users, departments, units, wards and beds"
        )
      ),

      React.createElement(
        "div",
        {
          className:
            "row wrap",
          style: {
            gap: "8px"
          }
        },

        React.createElement(
          "button",
          {
            className:
              "btn btn-primary",
            onClick:
              openCreateUser
          },
          "+ Add Person"
        ),

        React.createElement(
          "button",
          {
            className:
              "btn btn-secondary",
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


    /* ====================================================
       GLOBAL ERROR
    ==================================================== */

    error
      ? React.createElement(
          "div",
          {
            className:
              "alert alert-error",
            style: {
              marginTop:
                "16px"
            }
          },
          error
        )
      : null,


    /* ====================================================
       CREATE USER MODAL
    ==================================================== */

    showCreateUser
      ? React.createElement(
          "div",
          {
            className:
              "modal-backdrop"
          },

          React.createElement(
            "div",
            {
              className:
                "modal"
            },

            React.createElement(
              "div",
              {
                className:
                  "modal-header"
              },

              React.createElement(
                "div",
                null,

                React.createElement(
                  "div",
                  {
                    className:
                      "modal-title"
                  },
                  "Add Person"
                ),

                React.createElement(
                  "div",
                  {
                    className:
                      "page-subtitle"
                  },
                  "Create a PRISM clinical user"
                )
              ),

              React.createElement(
                "button",
                {
                  className:
                    "btn btn-secondary",
                  onClick:
                    closeCreateUser,
                  disabled:
                    creatingUser
                },
                "Close"
              )
            ),


            createdUser
              ? React.createElement(
                  "div",
                  {
                    className:
                      "alert alert-success",
                    style: {
                      marginBottom:
                        "16px"
                    }
                  },

                  React.createElement(
                    "strong",
                    null,
                    "User created successfully."
                  ),

                  React.createElement(
                    "div",
                    {
                      style: {
                        marginTop:
                          "8px"
                      }
                    },
                    `Name: ${createdUser.display_name}`
                  ),

                  React.createElement(
                    "div",
                    null,
                    `Login ID: ${createdUser.login_id}`
                  ),

                  React.createElement(
                    "div",
                    null,
                    `Role: ${roleLabel(createdUser.role)}`
                  ),

                  createdUser.temporary_password
                    ? React.createElement(
                        "div",
                        {
                          style: {
                            marginTop:
                              "10px"
                          }
                        },

                        React.createElement(
                          "strong",
                          null,
                          "Temporary Password: "
                        ),

                        React.createElement(
                          "code",
                          null,
                          createdUser.temporary_password
                        )
                      )
                    : null,

                  React.createElement(
                    "div",
                    {
                      className:
                        "muted small",
                      style: {
                        marginTop:
                          "10px"
                      }
                    },
                    "Store the temporary password securely. It is returned only at creation time."
                  )
                )
              : React.createElement(
                  "form",
                  {
                    onSubmit:
                      createUser
                  },

                  createError
                    ? React.createElement(
                        "div",
                        {
                          className:
                            "alert alert-error",
                          style: {
                            marginBottom:
                              "16px"
                          }
                        },
                        createError
                      )
                    : null,


                  React.createElement(
                    "div",
                    {
                      className:
                        "form-grid"
                    },

                    React.createElement(
                      "div",
                      {
                        className:
                          "field"
                      },

                      React.createElement(
                        "label",
                        null,
                        "Full Name *"
                      ),

                      React.createElement(
                        "input",
                        {
                          value:
                            form.display_name,

                          onChange:
                            (e) =>
                              updateField(
                                "display_name",
                                e.target.value
                              ),

                          required:
                            true,

                          placeholder:
                            "Full name"
                        }
                      )
                    ),


                    React.createElement(
                      "div",
                      {
                        className:
                          "field"
                      },

                      React.createElement(
                        "label",
                        null,
                        "PRISM Login ID *"
                      ),

                      React.createElement(
                        "input",
                        {
                          value:
                            form.login_id,

                          onChange:
                            (e) =>
                              updateField(
                                "login_id",
                                e.target.value
                              ),

                          required:
                            true,

                          placeholder:
                            "e.g. TEST012"
                        }
                      )
                    ),


                    React.createElement(
                      "div",
                      {
                        className:
                          "field"
                      },

                      React.createElement(
                        "label",
                        null,
                        "System Role *"
                      ),

                      React.createElement(
                        "select",
                        {
                          value:
                            form.role,

                          onChange:
                            (e) =>
                              updateField(
                                "role",
                                e.target.value
                              )
                        },

                        React.createElement(
                          "option",
                          {
                            value:
                              "medical_officer"
                          },
                          "Medical Officer"
                        ),

                        React.createElement(
                          "option",
                          {
                            value:
                              "fellow"
                          },
                          "Fellow"
                        ),

                        React.createElement(
                          "option",
                          {
                            value:
                              "consultant"
                          },
                          "Consultant"
                        ),

                        React.createElement(
                          "option",
                          {
                            value:
                              "admin"
                          },
                          "Administrator"
                        )
                      )
                    ),


                    React.createElement(
                      "div",
                      {
                        className:
                          "field"
                      },

                      React.createElement(
                        "label",
                        null,
                        "Department"
                      ),

                      React.createElement(
                        "select",
                        {
                          value:
                            form.department_id,

                          onChange:
                            (e) => {
                              setForm(
                                (previous) => ({
                                  ...previous,

                                  department_id:
                                    e.target.value,

                                  home_unit_id:
                                    "",

                                  department_role_id:
                                    ""
                                })
                              );
                            }
                        },

                        React.createElement(
                          "option",
                          {
                            value:
                              ""
                          },
                          "No department"
                        ),

                        departments.map(
                          (
                            department
                          ) =>
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
                      "div",
                      {
                        className:
                          "field"
                      },

                      React.createElement(
                        "label",
                        null,
                        "Home Unit"
                      ),

                      React.createElement(
                        "select",
                        {
                          value:
                            form.home_unit_id,

                          onChange:
                            (e) =>
                              updateField(
                                "home_unit_id",
                                e.target.value
                              ),

                          disabled:
                            !form.department_id
                        },

                        React.createElement(
                          "option",
                          {
                            value:
                              ""
                          },
                          form.department_id
                            ? "No home unit"
                            : "Select department first"
                        ),

                        filteredUnits.map(
                          (
                            unit
                          ) =>
                            React.createElement(
                              "option",
                              {
                                key:
                                  unit.id,
                                value:
                                  unit.id
                              },
                              unit.name
                            )
                        )
                      )
                    ),


                    React.createElement(
                      "div",
                      {
                        className:
                          "field"
                      },

                      React.createElement(
                        "label",
                        null,
                        "Department Role"
                      ),

                      React.createElement(
                        "select",
                        {
                          value:
                            form.department_role_id,

                          onChange:
                            (e) =>
                              updateField(
                                "department_role_id",
                                e.target.value
                              ),

                          disabled:
                            !form.department_id
                        },

                        React.createElement(
                          "option",
                          {
                            value:
                              ""
                          },
                          form.department_id
                            ? "No department role"
                            : "Select department first"
                        ),

                        filteredRoles.map(
                          (
                            role
                          ) =>
                            React.createElement(
                              "option",
                              {
                                key:
                                  role.id,
                                value:
                                  role.id
                              },
                              role.name
                            )
                        )
                      )
                    )
                  ),


                  React.createElement(
                    "label",
                    {
                      className:
                        "checkbox-row"
                    },

                    React.createElement(
                      "input",
                      {
                        type:
                          "checkbox",

                        checked:
                          form.active,

                        onChange:
                          (e) =>
                            updateField(
                              "active",
                              e.target.checked
                            )
                      }
                    ),

                    React.createElement(
                      "span",
                      null,
                      "Active user"
                    )
                  ),


                  React.createElement(
                    "div",
                    {
                      className:
                        "row wrap",
                      style: {
                        justifyContent:
                          "flex-end",
                        gap:
                          "8px",
                        marginTop:
                          "20px"
                      }
                    },

                    React.createElement(
                      "button",
                      {
                        type:
                          "button",

                        className:
                          "btn btn-secondary",

                        onClick:
                          closeCreateUser,

                        disabled:
                          creatingUser
                      },
                      "Cancel"
                    ),

                    React.createElement(
                      "button",
                      {
                        type:
                          "submit",

                        className:
                          "btn btn-primary",

                        disabled:
                          creatingUser
                      },
                      creatingUser
                        ? "Creating..."
                        : "Create User"
                    )
                  )
                )
          )
        )
      : null,


    /* ====================================================
       LOADING
    ==================================================== */

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


          /* ==============================================
             SUMMARY
          ============================================== */

          React.createElement(
            "div",
            {
              className:
                "grid grid-4",
              style: {
                marginTop:
                  "16px"
              }
            },

            React.createElement(
              "div",
              {
                className:
                  "card"
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
              )
            ),

            React.createElement(
              "div",
              {
                className:
                  "card"
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
                className:
                  "card"
              },

              React.createElement(
                "div",
                {
                  className:
                    "stat-label"
                },
                "Units"
              ),

              React.createElement(
                "div",
                {
                  className:
                    "stat-number"
                },
                units.length
              )
            ),

            React.createElement(
              "div",
              {
                className:
                  "card"
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


          /* ==============================================
             USERS
          ============================================== */

          React.createElement(
            "div",
            {
              className:
                "card",
              style: {
                marginTop:
                  "16px"
              }
            },

            React.createElement(
              "div",
              {
                className:
                  "section-title"
              },
              "Users"
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
                          "Home Unit"
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
                              (department) =>
                                department.id ===
                                user.department_id
                            );

                          const unit =
                            units.find(
                              (unit) =>
                                unit.id ===
                                user.home_unit_id
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
                                user.email ||
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
                              unit?.name ||
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


          /* ==============================================
             DEPARTMENTS + UNITS
          ============================================== */

          React.createElement(
            "div",
            {
              className:
                "grid grid-2",
              style: {
                marginTop:
                  "16px"
              }
            },

            React.createElement(
              "div",
              {
                className:
                  "card"
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
                    (
                      department
                    ) =>
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
                className:
                  "card"
              },

              React.createElement(
                "div",
                {
                  className:
                    "section-title"
                },
                "Units"
              ),

              units.length === 0

                ? React.createElement(
                    "div",
                    {
                      className:
                        "empty"
                    },
                    "No units found."
                  )

                : units.map(
                    (
                      unit
                    ) => {
                      const department =
                        departments.find(
                          (
                            department
                          ) =>
                            department.id ===
                            unit.department_id
                        );

                      return React.createElement(
                        "div",
                        {
                          key:
                            unit.id,

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
                            unit.name
                          ),

                          React.createElement(
                            "span",
                            {
                              className:
                                "muted small"
                            },
                            department?.name ||
                              "—"
                          )
                        )
                      );
                    }
                  )
            )
          ),


          /* ==============================================
             WARDS
          ============================================== */

          React.createElement(
            "div",
            {
              className:
                "card",
              style: {
                marginTop:
                  "16px"
              }
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
                          "Ward"
                        ),

                        React.createElement(
                          "th",
                          null,
                          "Department"
                        ),

                        React.createElement(
                          "th",
                          null,
                          "Unit"
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

                      wards.map(
                        (ward) => {
                          const department =
                            departments.find(
                              (
                                department
                              ) =>
                                department.id ===
                                ward.department_id
                            );

                          const unit =
                            units.find(
                              (
                                unit
                              ) =>
                                unit.id ===
                                ward.unit_id
                            );

                          return React.createElement(
                            "tr",
                            {
                              key:
                                ward.id
                            },

                            React.createElement(
                              "td",
                              null,
                              ward.name ||
                                "—"
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
                              unit?.name ||
                                "—"
                            ),

                            React.createElement(
                              "td",
                              null,

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
                          );
                        }
                      )
                    )
                  )
                )
          ),


          /* ==============================================
             BEDS
          ============================================== */

          React.createElement(
            "div",
            {
              className:
                "card",
              style: {
                marginTop:
                  "16px"
              }
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
                        (bed) => {
                          const ward =
                            wards.find(
                              (
                                ward
                              ) =>
                                ward.id ===
                                bed.ward_id
                            );

                          return React.createElement(
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
                              ward?.name ||
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
                          );
                        }
                      )
                    )
                  )
                )
          )
        )
  );
}
