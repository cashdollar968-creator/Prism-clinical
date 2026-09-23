import React, { useEffect, useMemo, useState } from "https://esm.sh/react@18.3.1";
import { db } from "../supabase.js";
import { roleLabel } from "../helpers.js";

const SYSTEM_ROLE_OPTIONS = [
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
    label: "Consultant"
  },
  {
    value: "admin",
    label: "Administrator"
  }
];

const CLINICAL_UNIT_ROLES = [
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
    label: "Consultant"
  }
];

const COVERAGE_OPTIONS = [
  {
    value: "ward",
    label: "Ward"
  },
  {
    value: "ccu",
    label: "CCU"
  },
  {
    value: "private_icu",
    label: "Private ICU"
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

const EMPTY_UNIT_FORM = {
  department_id: "",
  name: "",
  coverage: ["ward"],
  consultant_id: ""
};

const EMPTY_TEAM_FORM = {
  user_id: "",
  role: "medical_officer"
};

function labelForClinicalRole(role) {
  const option = CLINICAL_UNIT_ROLES.find(
    (item) => item.value === role
  );

  return option?.label || role || "—";
}

function coverageLabel(value) {
  return (
    COVERAGE_OPTIONS.find(
      (item) => item.value === value
    )?.label || value
  );
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

function permissionMapFromRole(roleRow) {
  if (!roleRow) return {};

  if (
    roleRow.permissions &&
    typeof roleRow.permissions === "object"
  ) {
    return roleRow.permissions;
  }

  return {};
}

export default function Administration({ profile }) {
  const [profiles, setProfiles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [units, setUnits] = useState([]);
  const [wards, setWards] = useState([]);
  const [beds, setBeds] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [departmentRoles, setDepartmentRoles] = useState([]);
  const [unitRolePermissions, setUnitRolePermissions] =
    useState([]);
  const [unitAssignments, setUnitAssignments] =
    useState([]);
  const [userUnitPermissions, setUserUnitPermissions] =
    useState([]);

  const [showCreateUser, setShowCreateUser] =
    useState(false);

  const [showCreateUnit, setShowCreateUnit] =
    useState(false);

  const [selectedUnit, setSelectedUnit] =
    useState(null);

  const [showTeamEditor, setShowTeamEditor] =
    useState(false);

  const [form, setForm] = useState(EMPTY_FORM);

  const [unitForm, setUnitForm] =
    useState(EMPTY_UNIT_FORM);

  const [teamForm, setTeamForm] =
    useState(EMPTY_TEAM_FORM);

  const [saving, setSaving] = useState(false);
  const [savingUnit, setSavingUnit] =
    useState(false);
  const [savingTeam, setSavingTeam] =
    useState(false);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [createdCredentials, setCreatedCredentials] =
    useState(null);

  const activeUsers = useMemo(
    () => profiles.filter((user) => user.active),
    [profiles]
  );

  const clinicalProfiles = useMemo(
    () =>
      profiles.filter(
        (user) =>
          user.active !== false &&
          [
            "medical_officer",
            "fellow",
            "consultant"
          ].includes(user.role)
      ),
    [profiles]
  );

  const activeDepartments = useMemo(
    () =>
      departments.filter(
        (department) =>
          department.active !== false
      ),
    [departments]
  );

  const activeUnits = useMemo(
    () =>
      units.filter(
        (unit) => unit.active !== false
      ),
    [units]
  );

  async function loadAdministration() {
    setLoading(true);
    setError("");

    const [
      profilesResult,
      departmentsResult,
      unitsResult,
      wardsResult,
      bedsResult,
      permissionsResult,
      rolesResult,
      rolePermissionsResult,
      assignmentsResult,
      userPermissionsResult
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
        .from("permission_catalog")
        .select("*")
        .eq("active", true)
        .order("sort_order", {
          ascending: true
        }),

      db
        .from("department_roles")
        .select("*")
        .eq("active", true)
        .in("code", [
          "medical_officer",
          "fellow",
          "consultant"
        ])
        .order("name", {
          ascending: true
        }),

      db
        .from("unit_role_permissions")
        .select("*")
        .eq("active", true),

      db
        .from("user_unit_assignments")
        .select("*")
        .eq("active", true),

      db
        .from("user_unit_permissions")
        .select("*")
        .eq("allowed", true)
    ]);

    const firstError =
      profilesResult.error ||
      departmentsResult.error ||
      unitsResult.error ||
      wardsResult.error ||
      bedsResult.error ||
      permissionsResult.error ||
      rolesResult.error ||
      rolePermissionsResult.error ||
      assignmentsResult.error ||
      userPermissionsResult.error;

    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    setProfiles(profilesResult.data || []);
    setDepartments(
      departmentsResult.data || []
    );
    setUnits(unitsResult.data || []);
    setWards(wardsResult.data || []);
    setBeds(bedsResult.data || []);
    setPermissions(
      permissionsResult.data || []
    );
    setDepartmentRoles(
      rolesResult.data || []
    );
    setUnitRolePermissions(
      rolePermissionsResult.data || []
    );
    setUnitAssignments(
      assignmentsResult.data || []
    );
    setUserUnitPermissions(
      userPermissionsResult.data || []
    );

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

  function updateUnitField(field, value) {
    setUnitForm((previous) => ({
      ...previous,
      [field]: value
    }));
  }

  function updateTeamField(field, value) {
    setTeamForm((previous) => ({
      ...previous,
      [field]: value
    }));
  }

  function toggleCoverage(value) {
    setUnitForm((previous) => {
      const exists =
        previous.coverage.includes(value);

      if (exists) {
        const next =
          previous.coverage.filter(
            (item) => item !== value
          );

        return {
          ...previous,
          coverage:
            next.length > 0
              ? next
              : previous.coverage
        };
      }

      return {
        ...previous,
        coverage: [
          ...previous.coverage,
          value
        ]
      };
    });
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

  function openCreateUnit() {
    setError("");
    setSuccess("");

    setUnitForm({
      ...EMPTY_UNIT_FORM,
      department_id:
        activeDepartments[0]?.id || ""
    });

    setShowCreateUnit(true);
  }

  function closeCreateUnit() {
    if (savingUnit) return;

    setShowCreateUnit(false);

    setUnitForm({
      ...EMPTY_UNIT_FORM
    });
  }

  function openUnit(unit) {
    setSelectedUnit(unit);
    setShowTeamEditor(false);
    setTeamForm({
      ...EMPTY_TEAM_FORM
    });
    setError("");
    setSuccess("");
  }

  function closeUnit() {
    setSelectedUnit(null);
    setShowTeamEditor(false);
  }

  async function createUser(event) {
    event.preventDefault();

    setError("");
    setSuccess("");
    setCreatedCredentials(null);

    const displayName =
      form.display_name.trim();

    const loginId =
      form.login_id.trim();

    if (!displayName) {
      setError("Full Name is required.");
      return;
    }

    if (!loginId) {
      setError("Login ID is required.");
      return;
    }

    if (
      !/^[A-Za-z0-9._-]{3,40}$/.test(
        loginId
      )
    ) {
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
      setError(
        "Temporary password must be at least 8 characters."
      );
      return;
    }

    setSaving(true);

    try {
      const { data: sessionData } =
        await db.auth.getSession();

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
              display_name:
                displayName,
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
        name:
          data.profile.display_name,
        login_id:
          data.profile.login_id,
        password:
          data.temporary_password
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

  async function createUnit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const name =
      unitForm.name.trim();

    if (!name) {
      setError("Unit Name is required.");
      return;
    }

    if (!unitForm.department_id) {
      setError(
        "Department is required."
      );
      return;
    }

    if (
      !unitForm.coverage ||
      unitForm.coverage.length === 0
    ) {
      setError(
        "Select at least one coverage area."
      );
      return;
    }

    setSavingUnit(true);

    try {
      const code = slugify(name);

      const duplicate = units.find(
        (unit) =>
          unit.department_id ===
            unitForm.department_id &&
          (
            unit.code === code ||
            unit.name
              ?.trim()
              .toLowerCase() ===
              name.toLowerCase()
          )
      );

      if (duplicate) {
        setError(
          "A unit with this name already exists in the selected department."
        );
        setSavingUnit(false);
        return;
      }

      /*
       * Current database schema supports one unit_type.
       * Keep the first selected coverage as the
       * operational primary unit type.
       */
      const primaryCoverage =
        unitForm.coverage[0];

      const { data: newUnit, error: unitError } =
        await db
          .from("units")
          .insert({
            department_id:
              unitForm.department_id,
            code,
            name,
            unit_type:
              primaryCoverage,
            active: true
          })
          .select("*")
          .single();

      if (unitError) {
        setError(unitError.message);
        setSavingUnit(false);
        return;
      }

      if (
        unitForm.consultant_id &&
        newUnit?.id
      ) {
        const { error:
          consultantError } =
          await db
            .from(
              "user_unit_assignments"
            )
            .insert({
              user_id:
                unitForm.consultant_id,
              unit_id:
                newUnit.id,
              assignment_type:
                "consultant",
              active: true,
              created_by:
                profile?.id || null
            });

        if (consultantError) {
          setError(
            consultantError.message
          );
          setSavingUnit(false);
          return;
        }
      }

      setSuccess(
        "Unit created successfully."
      );

      setShowCreateUnit(false);

      setUnitForm({
        ...EMPTY_UNIT_FORM
      });

      await loadAdministration();

      const refreshedUnit =
        newUnit;

      setSelectedUnit(
        refreshedUnit
      );
    } catch (errorObject) {
      setError(
        errorObject?.message ||
          "Unable to create unit."
      );
    }

    setSavingUnit(false);
  }

  async function addTeamMember(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!selectedUnit?.id) {
      setError("Select a unit first.");
      return;
    }

    if (!teamForm.user_id) {
      setError("Select a doctor.");
      return;
    }

    if (!teamForm.role) {
      setError("Select a clinical role.");
      return;
    }

    setSavingTeam(true);

    try {
      const existing =
        unitAssignments.find(
          (assignment) =>
            assignment.unit_id ===
              selectedUnit.id &&
            assignment.user_id ===
              teamForm.user_id
        );

      if (existing) {
        const { error:
          updateError } =
          await db
            .from(
              "user_unit_assignments"
            )
            .update({
              assignment_type:
                teamForm.role,
              active: true,
              end_at: null,
              updated_at:
                new Date().toISOString()
            })
            .eq(
              "id",
              existing.id
            );

        if (updateError) {
          setError(
            updateError.message
          );
          setSavingTeam(false);
          return;
        }
      } else {
        const { error:
          insertError } =
          await db
            .from(
              "user_unit_assignments"
            )
            .insert({
              user_id:
                teamForm.user_id,
              unit_id:
                selectedUnit.id,
              assignment_type:
                teamForm.role,
              active: true,
              created_by:
                profile?.id || null
            });

        if (insertError) {
          setError(
            insertError.message
          );
          setSavingTeam(false);
          return;
        }
      }

      setSuccess(
        "Doctor added to the unit."
      );

      setTeamForm({
        ...EMPTY_TEAM_FORM
      });

      setShowTeamEditor(false);

      await loadAdministration();
    } catch (errorObject) {
      setError(
        errorObject?.message ||
          "Unable to add doctor."
      );
    }

    setSavingTeam(false);
  }

  async function removeTeamMember(
    assignment
  ) {
    setError("");
    setSuccess("");

    const { error:
      updateError } =
      await db
        .from(
          "user_unit_assignments"
        )
        .update({
          active: false,
          end_at:
            new Date().toISOString(),
          updated_at:
            new Date().toISOString()
        })
        .eq(
          "id",
          assignment.id
        );

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(
      "Doctor removed from the unit."
    );

    await loadAdministration();
  }

  function getUnitTeam(unitId) {
    return unitAssignments
      .filter(
        (assignment) =>
          assignment.unit_id ===
          unitId &&
          assignment.active !== false
      )
      .map((assignment) => {
        const user =
          profiles.find(
            (item) =>
              item.id ===
              assignment.user_id
          );

        return {
          ...assignment,
          user
        };
      })
      .filter((item) => item.user);
  }

  function getUnitConsultant(unitId) {
    const consultantAssignment =
      unitAssignments.find(
        (assignment) =>
          assignment.unit_id ===
            unitId &&
          assignment.active !== false &&
          assignment.assignment_type ===
            "consultant"
      );

    return profiles.find(
      (user) =>
        user.id ===
        consultantAssignment?.user_id
    );
  }

  function getDepartmentRolesForUnit(
    unit
  ) {
    return departmentRoles.filter(
      (role) =>
        role.department_id ===
          unit.department_id &&
        CLINICAL_UNIT_ROLES.some(
          (item) =>
            item.value === role.code
        )
    );
  }

  function getDefaultPermissionsForRole(
    unit,
    roleCode
  ) {
    const roleRows =
      getDepartmentRolesForUnit(
        unit
      ).filter(
        (role) =>
          role.code === roleCode
      );

    const roleRow =
      roleRows[0];

    const unitRoleRow =
      unitRolePermissions.find(
        (row) => {
          const matchingRole =
            departmentRoles.find(
              (role) =>
                role.id ===
                  row.department_role_id &&
                role.code ===
                  roleCode &&
                role.department_id ===
                  unit.department_id
            );

          return (
            row.unit_id ===
              unit.id &&
            matchingRole
          );
        }
      );

    return permissionMapFromRole(
      unitRoleRow || roleRow
    );
  }

  function getUserCustomPermissions(
    userId,
    unitId
  ) {
    return userUnitPermissions.filter(
      (item) =>
        item.user_id === userId &&
        item.unit_id === unitId &&
        item.allowed !== false
    );
  }

  async function saveCustomPermission(
    userId,
    unitId,
    permissionCode,
    allowed
  ) {
    setError("");

    const existing =
      userUnitPermissions.find(
        (item) =>
          item.user_id ===
            userId &&
          item.unit_id ===
            unitId &&
          item.permission_code ===
            permissionCode
      );

    if (existing) {
      const { error:
        updateError } =
        await db
          .from(
            "user_unit_permissions"
          )
          .update({
            allowed,
            source: "explicit",
            updated_at:
              new Date().toISOString()
          })
          .eq(
            "user_id",
            userId
          )
          .eq(
            "unit_id",
            unitId
          )
          .eq(
            "permission_code",
            permissionCode
          );

      if (updateError) {
        setError(
          updateError.message
        );
        return;
      }
    } else {
      const { error:
        insertError } =
        await db
          .from(
            "user_unit_permissions"
          )
          .insert({
            user_id: userId,
            unit_id: unitId,
            permission_code:
              permissionCode,
            allowed,
            source: "explicit",
            created_by:
              profile?.id || null
          });

      if (insertError) {
        setError(
          insertError.message
        );
        return;
      }
    }

    await loadAdministration();
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
                  className:
                    "section-title"
                },
                "Create User"
              ),

              React.createElement(
                "div",
                {
                  className:
                    "page-subtitle"
                },
                "Create a PRISM account. Clinical role permissions are configured separately at the unit level."
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
                  "System Role"
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

                  SYSTEM_ROLE_OPTIONS.map(
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
                ),

                React.createElement(
                  "small",
                  {
                    className:
                      "muted"
                  },
                  "System role. Clinical unit role is assigned separately."
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

                  activeDepartments.map(
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
                    type:
                      "checkbox",

                    checked:
                      form.active,

                    onChange: (
                      event
                    ) =>
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

  const createUnitForm =
    showCreateUnit
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
                  className:
                    "section-title"
                },
                "Add Unit"
              ),

              React.createElement(
                "div",
                {
                  className:
                    "page-subtitle"
                },
                "Create a clinical unit under a department."
              )
            ),

            React.createElement(
              "button",
              {
                className:
                  "btn btn-secondary",
                type: "button",
                onClick:
                  closeCreateUnit
              },
              "Cancel"
            )
          ),

          React.createElement(
            "form",
            {
              onSubmit:
                createUnit
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
                  "Department"
                ),

                React.createElement(
                  "select",
                  {
                    value:
                      unitForm.department_id,

                    onChange: (
                      event
                    ) =>
                      updateUnitField(
                        "department_id",
                        event.target
                          .value
                      ),

                    required: true
                  },

                  React.createElement(
                    "option",
                    {
                      value: ""
                    },
                    "Select department"
                  ),

                  activeDepartments.map(
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
                  "Unit Name"
                ),

                React.createElement(
                  "input",
                  {
                    value:
                      unitForm.name,

                    onChange: (
                      event
                    ) =>
                      updateUnitField(
                        "name",
                        event.target
                          .value
                      ),

                    placeholder:
                      "e.g. Cardiology Ward",

                    required: true
                  }
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
                "div",
                {
                  className:
                    "section-title"
                },
                "Coverage / What does it cover?"
              ),

              React.createElement(
                "div",
                {
                  className:
                    "grid grid-3",
                  style: {
                    marginTop:
                      "10px"
                  }
                },

                COVERAGE_OPTIONS.map(
                  (option) =>
                    React.createElement(
                      "label",
                      {
                        key:
                          option.value,
                        className:
                          "detail-box",
                        style: {
                          cursor:
                            "pointer"
                        }
                      },

                      React.createElement(
                        "div",
                        {
                          className:
                            "row",
                          style: {
                            gap:
                              "8px"
                          }
                        },

                        React.createElement(
                          "input",
                          {
                            type:
                              "checkbox",

                            checked:
                              unitForm.coverage.includes(
                                option.value
                              ),

                            onChange:
                              () =>
                                toggleCoverage(
                                  option.value
                                )
                          }
                        ),

                        React.createElement(
                          "strong",
                          null,
                          option.label
                        )
                      )
                    )
                )
              ),

              React.createElement(
                "small",
                {
                  className:
                    "muted",
                  style: {
                    display:
                      "block",
                    marginTop:
                      "8px"
                  }
                },
                "The current database keeps one primary unit type; the first selected coverage is stored as the primary type."
              )
            ),

            React.createElement(
              "label",
              {
                className:
                  "field",
                style: {
                  marginTop:
                    "12px"
                }
              },

              React.createElement(
                "span",
                null,
                "Current Consultant"
              ),

              React.createElement(
                "select",
                {
                  value:
                    unitForm.consultant_id,

                  onChange: (
                    event
                  ) =>
                    updateUnitField(
                      "consultant_id",
                      event.target
                        .value
                    )
                },

                React.createElement(
                  "option",
                  {
                    value: ""
                  },
                  "No consultant assigned yet"
                ),

                profiles
                  .filter(
                    (user) =>
                      user.active !==
                        false &&
                      user.role ===
                        "consultant"
                  )
                  .map(
                    (user) =>
                      React.createElement(
                        "option",
                        {
                          key:
                            user.id,
                          value:
                            user.id
                        },
                        user.display_name
                      )
                  )
              ),

              React.createElement(
                "small",
                {
                  className:
                    "muted"
                },
                "The consultant is an existing PRISM user."
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
                    savingUnit
                },
                savingUnit
                  ? "Creating..."
                  : "Create Unit"
              )
            )
          )
        )
      : null;

  const unitDetail =
    selectedUnit
      ? React.createElement(
          "div",
          {
            className: "card"
          },

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
                    "section-title"
                },
                selectedUnit.name
              ),

              React.createElement(
                "div",
                {
                  className:
                    "page-subtitle"
                },
                departments.find(
                  (department) =>
                    department.id ===
                    selectedUnit.department_id
                )?.name ||
                  "Department"
              )
            ),

            React.createElement(
              "button",
              {
                className:
                  "btn btn-secondary",
                type: "button",
                onClick:
                  closeUnit
              },
              "Close"
            )
          ),

          React.createElement(
            "div",
            {
              className:
                "grid grid-3",
              style: {
                marginTop:
                  "16px"
              }
            },

            React.createElement(
              "div",
              {
                className:
                  "detail-box"
              },

              React.createElement(
                "div",
                {
                  className:
                    "muted"
                },
                "Coverage"
              ),

              React.createElement(
                "strong",
                null,
                coverageLabel(
                  selectedUnit.unit_type
                )
              )
            ),

            React.createElement(
              "div",
              {
                className:
                  "detail-box"
              },

              React.createElement(
                "div",
                {
                  className:
                    "muted"
                },
                "Current Consultant"
              ),

              React.createElement(
                "strong",
                null,
                getUnitConsultant(
                  selectedUnit.id
                )?.display_name ||
                  "Not assigned"
              )
            ),

            React.createElement(
              "div",
              {
                className:
                  "detail-box"
              },

              React.createElement(
                "div",
                {
                  className:
                    "muted"
                },
                "Team Members"
              ),

              React.createElement(
                "strong",
                null,
                getUnitTeam(
                  selectedUnit.id
                ).length
              )
            )
          ),

          React.createElement(
            "div",
            {
              className:
                "row wrap",
              style: {
                marginTop:
                  "18px"
              }
            },

            React.createElement(
              "div",
              {
                className:
                  "section-title"
              },
              "Unit Team"
            ),

            React.createElement(
              "button",
              {
                className:
                  "btn btn-primary",
                type: "button",
                onClick: () => {
                  setTeamForm({
                    ...EMPTY_TEAM_FORM
                  });

                  setShowTeamEditor(
                    true
                  );
                }
              },
              "+ Add Doctor"
            )
          ),

          showTeamEditor
            ? React.createElement(
                "form",
                {
                  className:
                    "detail-box",
                  onSubmit:
                    addTeamMember,
                  style: {
                    marginTop:
                      "12px"
                  }
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
                      className:
                        "field"
                    },

                    React.createElement(
                      "span",
                      null,
                      "Doctor / User"
                    ),

                    React.createElement(
                      "select",
                      {
                        value:
                          teamForm.user_id,

                        onChange: (
                          event
                        ) =>
                          updateTeamField(
                            "user_id",
                            event.target
                              .value
                          ),

                        required:
                          true
                      },

                      React.createElement(
                        "option",
                        {
                          value:
                            ""
                        },
                        "Select doctor"
                      ),

                      clinicalProfiles.map(
                        (user) =>
                          React.createElement(
                            "option",
                            {
                              key:
                                user.id,
                              value:
                                user.id
                            },
                            user.display_name +
                              " — " +
                              labelForClinicalRole(
                                user.role
                              )
                          )
                      )
                    )
                  ),

                  React.createElement(
                    "label",
                    {
                      className:
                        "field"
                    },

                    React.createElement(
                      "span",
                      null,
                      "Unit Clinical Role"
                    ),

                    React.createElement(
                      "select",
                      {
                        value:
                          teamForm.role,

                        onChange: (
                          event
                        ) =>
                          updateTeamField(
                            "role",
                            event.target
                              .value
                          )
                      },

                      CLINICAL_UNIT_ROLES.map(
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
                  )
                ),

                React.createElement(
                  "div",
                  {
                    className:
                      "row",
                    style: {
                      marginTop:
                        "12px"
                    }
                  },

                  React.createElement(
                    "button",
                    {
                      className:
                        "btn btn-primary",
                      type:
                        "submit",
                      disabled:
                        savingTeam
                    },
                    savingTeam
                      ? "Saving..."
                      : "Add to Unit"
                  ),

                  React.createElement(
                    "button",
                    {
                      className:
                        "btn btn-secondary",
                      type:
                        "button",
                      onClick:
                        () =>
                          setShowTeamEditor(
                            false
                          )
                    },
                    "Cancel"
                  )
                )
              )
            : null,

          React.createElement(
            "div",
            {
              className:
                "table-wrap",
              style: {
                marginTop:
                  "12px"
              }
            },

            getUnitTeam(
              selectedUnit.id
            ).length === 0

              ? React.createElement(
                  "div",
                  {
                    className:
                      "empty"
                  },
                  "No doctors assigned to this unit."
                )

              : React.createElement(
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
                        "Doctor"
                      ),

                      React.createElement(
                        "th",
                        null,
                        "Role"
                      ),

                      React.createElement(
                        "th",
                        null,
                        "Permissions"
                      ),

                      React.createElement(
                        "th",
                        null,
                        "Action"
                      )
                    )
                  ),

                  React.createElement(
                    "tbody",
                    null,

                    getUnitTeam(
                      selectedUnit.id
                    ).map(
                      (member) => {
                        const defaults =
                          getDefaultPermissionsForRole(
                            selectedUnit,
                            member.assignment_type
                          );

                        const defaultCount =
                          Object.values(
                            defaults
                          ).filter(
                            Boolean
                          ).length;

                        const custom =
                          getUserCustomPermissions(
                            member.user_id,
                            selectedUnit.id
                          );

                        return React.createElement(
                          "tr",
                          {
                            key:
                              member.id
                          },

                          React.createElement(
                            "td",
                            null,
                            member.user
                              ?.display_name ||
                              "—"
                          ),

                          React.createElement(
                            "td",
                            null,
                            React.createElement(
                              "span",
                              {
                                className:
                                  "badge badge-stable"
                              },
                              labelForClinicalRole(
                                member.assignment_type
                              )
                            )
                          ),

                          React.createElement(
                            "td",
                            null,

                            React.createElement(
                              "div",
                              null,
                              defaultCount +
                                " default"
                            ),

                            React.createElement(
                              "div",
                              {
                                className:
                                  "muted"
                              },
                              custom.length +
                                " custom"
                            )
                          ),

                          React.createElement(
                            "td",
                            null,

                            React.createElement(
                              "button",
                              {
                                className:
                                  "btn btn-secondary",
                                type:
                                  "button",
                                onClick:
                                  () =>
                                    removeTeamMember(
                                      member
                                    )
                              },
                              "Remove"
                            )
                          )
                        );
                      }
                    )
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
            "Give these credentials to the user."
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
              "strong",
              null,
              createdCredentials.name
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
                onClick:
                  () =>
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
          "Configure users, departments, clinical units, teams and permissions."
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
              "btn btn-primary",
            type: "button",
            onClick:
              openCreateUnit
          },
          "+ Add Unit"
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

    createUnitForm,

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
                activeUnits.length
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
              "Departments & Units"
            ),

            React.createElement(
              "div",
              {
                className:
                  "page-subtitle"
              },
              "Each department contains its clinical units."
            ),

            activeDepartments.length === 0

              ? React.createElement(
                  "div",
                  {
                    className:
                      "empty"
                  },
                  "No departments found."
                )

              : activeDepartments.map(
                  (department) => {
                    const departmentUnits =
                      activeUnits.filter(
                        (unit) =>
                          unit.department_id ===
                          department.id
                      );

                    return React.createElement(
                      "div",
                      {
                        key:
                          department.id,
                        className:
                          "detail-box",
                        style: {
                          marginTop:
                            "12px"
                        }
                      },

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
                            "strong",
                            null,
                            department.name
                          ),

                          React.createElement(
                            "div",
                            {
                              className:
                                "muted"
                            },
                            departmentUnits.length +
                              " unit(s)"
                          )
                        )
                      ),

                      departmentUnits.length === 0

                        ? React.createElement(
                            "div",
                            {
                              className:
                                "empty",
                              style: {
                                marginTop:
                                  "10px"
                              }
                            },
                            "No units configured."
                          )

                        : React.createElement(
                            "div",
                            {
                              className:
                                "grid grid-3",
                              style: {
                                marginTop:
                                  "10px"
                              }
                            },

                            departmentUnits.map(
                              (unit) => {
                                const consultant =
                                  getUnitConsultant(
                                    unit.id
                                  );

                                const team =
                                  getUnitTeam(
                                    unit.id
                                  );

                                return React.createElement(
                                  "button",
                                  {
                                    key:
                                      unit.id,
                                    type:
                                      "button",
                                    className:
                                      "detail-box",
                                    style: {
                                      textAlign:
                                        "left",
                                      cursor:
                                        "pointer",
                                      border:
                                        "1px solid rgba(0,0,0,0.08)"
                                    },
                                    onClick:
                                      () =>
                                        openUnit(
                                          unit
                                        )
                                  },

                                  React.createElement(
                                    "div",
                                    {
                                      className:
                                        "row wrap"
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
                                          "badge badge-stable"
                                      },
                                      coverageLabel(
                                        unit.unit_type
                                      )
                                    )
                                  ),

                                  React.createElement(
                                    "div",
                                    {
                                      className:
                                        "muted",
                                      style: {
                                        marginTop:
                                          "8px"
                                      }
                                    },
                                    "Consultant: " +
                                      (
                                        consultant
                                          ?.display_name ||
                                        "Not assigned"
                                      )
                                  ),

                                  React.createElement(
                                    "div",
                                    {
                                      className:
                                        "muted"
                                    },
                                    "Team: " +
                                      team.length
                                  )
                                );
                              }
                            )
                          )
                    );
                  }
                )
          ),

          unitDetail,

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
              "Users & System Roles"
            ),

            React.createElement(
              "div",
              {
                className:
                  "page-subtitle"
              },
              "System role is separate from the clinical role assigned inside a unit."
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
                          "System Role"
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
              className:
                "card"
            },

            React.createElement(
              "div",
              {
                className:
                  "section-title"
              },
              "Permission Catalog"
            ),

            React.createElement(
              "div",
              {
                className:
                  "page-subtitle"
              },
              "Permissions are predefined by PRISM. Role defaults are applied at the unit level; custom permissions are additional user-specific permissions."
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
                      "grid grid-2",
                    style: {
                      marginTop:
                        "12px"
                    }
                  },

                  permissions.map(
                    (permission) =>
                      React.createElement(
                        "div",
                        {
                          key:
                            permission.code,
                          className:
                            "detail-box"
                        },

                        React.createElement(
                          "div",
                          {
                            className:
                              "row wrap"
                          },

                          React.createElement(
                            "strong",
                            null,
                            permission.name ||
                              permission.code
                          ),

                          permission.dangerous
                            ? React.createElement(
                                "span",
                                {
                                  className:
                                    "badge badge-unstable"
                                },
                                "Controlled"
                              )
                            : null
                        ),

                        React.createElement(
                          "div",
                          {
                            className:
                              "muted"
                          },
                          permission.code
                        ),

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
          )
        )
  );
  }
