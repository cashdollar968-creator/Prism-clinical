import React, { useEffect, useMemo, useState } from "https://esm.sh/react@18.3.1";
import { db } from "../supabase.js";

const CLINICAL_ROLES = [
  { code: "medical_officer", label: "Medical Officer" },
  { code: "fellow", label: "Fellow" },
  { code: "consultant", label: "Consultant" }
];

const COVERAGE_OPTIONS = [
  { value: "ward", label: "Ward" },
  { value: "ccu", label: "CCU" },
  { value: "private_icu", label: "Private ICU" }
];

const EMPTY_UNIT = {
  name: "",
  code: "",
  coverage: ["ward"],
  department_id: ""
};

const EMPTY_DOCTOR = {
  user_id: "",
  role_code: "medical_officer"
};

function titleCase(value) {
  if (!value) return "";
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function roleLabel(code) {
  const found = CLINICAL_ROLES.find((item) => item.code === code);
  return found?.label || titleCase(code);
}

function normalizePermissions(value) {
  if (!value) return {};

  if (Array.isArray(value)) {
    return value.reduce((result, item) => {
      if (typeof item === "string") {
        result[item] = true;
      }
      return result;
    }, {});
  }

  if (typeof value === "object") {
    return value;
  }

  return {};
}

export default function Administration({ profile }) {
  const [departments, setDepartments] = useState([]);
  const [units, setUnits] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [unitRoles, setUnitRoles] = useState([]);
  const [userPermissions, setUserPermissions] = useState([]);

  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState("");

  const [showUnitForm, setShowUnitForm] = useState(false);
  const [showDoctorForm, setShowDoctorForm] = useState(false);

  const [unitForm, setUnitForm] = useState(EMPTY_UNIT);
  const [doctorForm, setDoctorForm] = useState(EMPTY_DOCTOR);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [expandedDoctorId, setExpandedDoctorId] = useState(null);

  const isAdmin = profile?.role === "admin";

  const activeDepartments = useMemo(
    () => departments.filter((item) => item.active !== false),
    [departments]
  );

  const activeUnits = useMemo(
    () =>
      units.filter(
        (unit) =>
          unit.active !== false &&
          (!selectedDepartmentId ||
            unit.department_id === selectedDepartmentId)
      ),
    [units, selectedDepartmentId]
  );

  const selectedUnit = useMemo(
    () => units.find((unit) => unit.id === selectedUnitId) || null,
    [units, selectedUnitId]
  );

  const selectedDepartment = useMemo(
    () =>
      departments.find(
        (department) => department.id === selectedDepartmentId
      ) || null,
    [departments, selectedDepartmentId]
  );

  const unitTeam = useMemo(() => {
    if (!selectedUnitId) return [];

    return unitRoles
      .filter(
        (assignment) =>
          assignment.unit_id === selectedUnitId &&
          assignment.active !== false
      )
      .map((assignment) => {
        const user = profiles.find(
          (item) => item.id === assignment.user_id
        );

        const role = roles.find(
          (item) => item.id === assignment.department_role_id
        );

        const customPermissions = userPermissions.filter(
          (permission) =>
            permission.user_id === assignment.user_id &&
            permission.unit_id === selectedUnitId
        );

        return {
          ...assignment,
          user,
          role,
          customPermissions
        };
      })
      .filter((item) => item.user);
  }, [
    selectedUnitId,
    unitRoles,
    profiles,
    roles,
    userPermissions
  ]);

  const availableDoctors = useMemo(
    () =>
      profiles.filter(
        (user) =>
          user.active !== false &&
          user.role !== "admin" &&
          !unitTeam.some(
            (member) => member.user_id === user.id
          )
      ),
    [profiles, unitTeam]
  );

  const selectedDoctor = useMemo(
    () =>
      unitTeam.find(
        (member) => member.user_id === expandedDoctorId
      ) || null,
    [unitTeam, expandedDoctorId]
  );

  async function loadAdministration() {
    setLoading(true);
    setError("");

    try {
      const [
        departmentsResult,
        unitsResult,
        profilesResult,
        rolesResult,
        permissionsResult,
        unitRolesResult,
        userPermissionsResult
      ] = await Promise.all([
        db
          .from("departments")
          .select("*")
          .order("name", { ascending: true }),

        db
          .from("units")
          .select("*")
          .order("name", { ascending: true }),

        db
          .from("profiles")
          .select("*")
          .order("display_name", { ascending: true }),

        db
          .from("department_roles")
          .select("*")
          .eq("active", true)
          .order("name", { ascending: true }),

        db
          .from("permissions")
          .select("*")
          .eq("active", true)
          .order("code", { ascending: true }),

        db
          .from("user_department_roles")
          .select("*")
          .eq("active", true),

        db
          .from("user_unit_permissions")
          .select("*")
      ]);

      const firstError =
        departmentsResult.error ||
        unitsResult.error ||
        profilesResult.error ||
        rolesResult.error ||
        permissionsResult.error ||
        unitRolesResult.error ||
        userPermissionsResult.error;

      if (firstError) {
        throw firstError;
      }

      setDepartments(departmentsResult.data || []);
      setUnits(unitsResult.data || []);
      setProfiles(profilesResult.data || []);
      setRoles(rolesResult.data || []);
      setPermissions(permissionsResult.data || []);
      setUnitRoles(unitRolesResult.data || []);
      setUserPermissions(userPermissionsResult.data || []);

      if (!selectedDepartmentId) {
        const firstDepartment =
          (departmentsResult.data || []).find(
            (item) => item.active !== false
          );

        if (firstDepartment) {
          setSelectedDepartmentId(firstDepartment.id);
        }
      }

      if (
        selectedUnitId &&
        !(unitsResult.data || []).some(
          (unit) => unit.id === selectedUnitId
        )
      ) {
        setSelectedUnitId("");
      }
    } catch (errorObject) {
      setError(
        errorObject?.message ||
          "Unable to load administration data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAdmin) return;
    loadAdministration();
  }, [isAdmin]);

  useEffect(() => {
    if (!selectedDepartmentId) return;

    const departmentUnits = units.filter(
      (unit) =>
        unit.department_id === selectedDepartmentId &&
        unit.active !== false
    );

    if (
      selectedUnitId &&
      departmentUnits.some(
        (unit) => unit.id === selectedUnitId
      )
    ) {
      return;
    }

    setSelectedUnitId(
      departmentUnits.length > 0
        ? departmentUnits[0].id
        : ""
    );
  }, [
    selectedDepartmentId,
    units
  ]);

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  function openAddUnit() {
    clearMessages();

    setUnitForm({
      ...EMPTY_UNIT,
      department_id:
        selectedDepartmentId ||
        activeDepartments[0]?.id ||
        ""
    });

    setShowUnitForm(true);
  }

  function closeAddUnit() {
    if (saving) return;
    setShowUnitForm(false);
    setUnitForm(EMPTY_UNIT);
  }

  function toggleCoverage(value) {
    setUnitForm((previous) => {
      const exists =
        previous.coverage.includes(value);

      const next = exists
        ? previous.coverage.filter(
            (item) => item !== value
          )
        : [...previous.coverage, value];

      return {
        ...previous,
        coverage: next
      };
    });
  }

  function makeUnitCode(name) {
    return String(name)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 60);
  }

  async function createUnit(event) {
    event.preventDefault();

    clearMessages();

    const name = unitForm.name.trim();
    const departmentId =
      unitForm.department_id;

    if (!name) {
      setError("Unit name is required.");
      return;
    }

    if (!departmentId) {
      setError("Department is required.");
      return;
    }

    if (!unitForm.coverage.length) {
      setError(
        "Select at least one coverage area."
      );
      return;
    }

    setSaving(true);

    try {
      const code =
        unitForm.code.trim() ||
        makeUnitCode(name);

      const existingCode = units.some(
        (unit) =>
          unit.department_id === departmentId &&
          String(unit.code || "").toLowerCase() ===
            code.toLowerCase()
      );

      if (existingCode) {
        throw new Error(
          "A unit with this code already exists in the selected department."
        );
      }

      const { data, error: insertError } =
        await db
          .from("units")
          .insert({
            department_id: departmentId,
            name,
            code,
            unit_type:
              unitForm.coverage[0] || "ward",
            active: true,
            config: {
              coverage: unitForm.coverage
            }
          })
          .select("*")
          .single();

      if (insertError) {
        throw insertError;
      }

      setUnits((previous) => [
        ...previous,
        data
      ]);

      setSelectedDepartmentId(
        departmentId
      );

      setSelectedUnitId(data.id);

      setSuccess(
        `${name} was created successfully.`
      );

      setShowUnitForm(false);
      setUnitForm(EMPTY_UNIT);
    } catch (errorObject) {
      setError(
        errorObject?.message ||
          "Unable to create unit."
      );
    } finally {
      setSaving(false);
    }
  }

  function openAddDoctor() {
    if (!selectedUnitId) {
      setError("Select a unit first.");
      return;
    }

    clearMessages();

    setDoctorForm({
      ...EMPTY_DOCTOR
    });

    setShowDoctorForm(true);
  }

  function closeAddDoctor() {
    if (saving) return;
    setShowDoctorForm(false);
    setDoctorForm(EMPTY_DOCTOR);
  }

  function findRoleByCode(code) {
    return roles.find(
      (role) => role.code === code
    );
  }

  async function addDoctorToUnit(event) {
    event.preventDefault();

    clearMessages();

    if (!doctorForm.user_id) {
      setError("Select a doctor.");
      return;
    }

    if (!selectedUnitId) {
      setError("Select a unit.");
      return;
    }

    const role = findRoleByCode(
      doctorForm.role_code
    );

    if (!role) {
      setError(
        `The ${roleLabel(
          doctorForm.role_code
        )} role is not configured in the database.`
      );
      return;
    }

    const alreadyAssigned =
      unitRoles.some(
        (assignment) =>
          assignment.user_id ===
            doctorForm.user_id &&
          assignment.unit_id ===
            selectedUnitId &&
          assignment.active !== false
      );

    if (alreadyAssigned) {
      setError(
        "This doctor is already assigned to this unit."
      );
      return;
    }

    setSaving(true);

    try {
      const { data, error: insertError } =
        await db
          .from("user_department_roles")
          .insert({
            user_id:
              doctorForm.user_id,
            department_role_id:
              role.id,
            unit_id:
              selectedUnitId,
            active: true,
            start_at:
              new Date().toISOString(),
            created_by:
              profile?.id || null
          })
          .select("*")
          .single();

      if (insertError) {
        throw insertError;
      }

      setUnitRoles((previous) => [
        ...previous,
        data
      ]);

      setSuccess(
        "Doctor added to the unit."
      );

      setShowDoctorForm(false);
      setDoctorForm(EMPTY_DOCTOR);
    } catch (errorObject) {
      setError(
        errorObject?.message ||
          "Unable to assign doctor to this unit."
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeDoctorRole(
    assignment,
    newRoleCode
  ) {
    clearMessages();

    const role = findRoleByCode(
      newRoleCode
    );

    if (!role) {
      setError(
        `The ${roleLabel(
          newRoleCode
        )} role is not configured.`
      );
      return;
    }

    try {
      const { data, error: updateError } =
        await db
          .from("user_department_roles")
          .update({
            department_role_id:
              role.id,
            updated_at:
              new Date().toISOString()
          })
          .eq("id", assignment.id)
          .select("*")
          .single();

      if (updateError) {
        throw updateError;
      }

      setUnitRoles((previous) =>
        previous.map((item) =>
          item.id === assignment.id
            ? data
            : item
        )
      );

      setSuccess(
        "Clinical role updated."
      );
    } catch (errorObject) {
      setError(
        errorObject?.message ||
          "Unable to update clinical role."
      );
    }
  }

  async function removeDoctorFromUnit(
    assignment
  ) {
    clearMessages();

    const confirmed = window.confirm(
      "Remove this doctor from the unit team?"
    );

    if (!confirmed) return;

    try {
      const { error: updateError } =
        await db
          .from("user_department_roles")
          .update({
            active: false,
            end_at:
              new Date().toISOString(),
            updated_at:
              new Date().toISOString()
          })
          .eq("id", assignment.id);

      if (updateError) {
        throw updateError;
      }

      setUnitRoles((previous) =>
        previous.map((item) =>
          item.id === assignment.id
            ? {
                ...item,
                active: false
              }
            : item
        )
      );

      setExpandedDoctorId(null);

      setSuccess(
        "Doctor removed from the unit team."
      );
    } catch (errorObject) {
      setError(
        errorObject?.message ||
          "Unable to remove doctor."
      );
    }
  }

  function getDefaultPermissions(
    role,
    unit
  ) {
    if (!role) return {};

    const configured =
      unitRoles.length &&
      null;

    const unitRole =
      unit &&
      null;

    /*
      Unit-role defaults are stored in
      unit_role_permissions. They are loaded
      separately below when available.

      The role record itself remains the
      source of the clinical role identity.
    */

    return normalizePermissions(
      role.permissions
    );
  }

  function getCoverage(unit) {
    if (!unit) return [];

    const configured =
      unit.config?.coverage;

    if (
      Array.isArray(configured) &&
      configured.length
    ) {
      return configured;
    }

    return unit.unit_type
      ? [unit.unit_type]
      : [];
  }

  function permissionName(code) {
    const permission =
      permissions.find(
        (item) =>
          item.code === code
      );

    return (
      permission?.name ||
      titleCase(code)
    );
  }

  async function setCustomPermission(
    userId,
    unitId,
    permissionCode,
    allowed
  ) {
    clearMessages();

    try {
      const existing =
        userPermissions.find(
          (item) =>
            item.user_id === userId &&
            item.unit_id === unitId &&
            item.permission_code ===
              permissionCode
        );

      if (existing) {
        const { data, error: updateError } =
          await db
            .from("user_unit_permissions")
            .update({
              allowed,
              source: "custom",
              updated_at:
                new Date().toISOString()
            })
            .eq("id", existing.id)
            .select("*")
            .single();

        if (updateError) {
          throw updateError;
        }

        setUserPermissions((previous) =>
          previous.map((item) =>
            item.id === existing.id
              ? data
              : item
          )
        );
      } else {
        const { data, error: insertError } =
          await db
            .from("user_unit_permissions")
            .insert({
              user_id: userId,
              unit_id: unitId,
              permission_code:
                permissionCode,
              allowed,
              source: "custom",
              start_at:
                new Date().toISOString(),
              created_by:
                profile?.id || null
            })
            .select("*")
            .single();

        if (insertError) {
          throw insertError;
        }

        setUserPermissions((previous) => [
          ...previous,
          data
        ]);
      }

      setSuccess(
        "Custom permission updated."
      );
    } catch (errorObject) {
      setError(
        errorObject?.message ||
          "Unable to update permission."
      );
    }
  }

  function renderUnitCard(unit) {
    const selected =
      unit.id === selectedUnitId;

    const coverage =
      getCoverage(unit);

    const teamCount =
      unitRoles.filter(
        (assignment) =>
          assignment.unit_id === unit.id &&
          assignment.active !== false
      ).length;

    return React.createElement(
      "button",
      {
        key: unit.id,
        type: "button",
        onClick: () =>
          setSelectedUnitId(unit.id),
        style: {
          width: "100%",
          textAlign: "left",
          border: selected
            ? "2px solid var(--primary, #2563eb)"
            : "1px solid var(--border, #d9dee7)",
          background: selected
            ? "rgba(37,99,235,0.05)"
            : "#fff",
          borderRadius: "12px",
          padding: "14px",
          cursor: "pointer",
          marginBottom: "8px"
        }
      },

      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            justifyContent:
              "space-between",
            gap: "12px",
            alignItems: "center"
          }
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
          teamCount +
            " doctor" +
            (teamCount === 1
              ? ""
              : "s")
        )
      ),

      React.createElement(
        "div",
        {
          className: "muted",
          style: {
            marginTop: "7px",
            fontSize: "12px"
          }
        },
        coverage
          .map(
            (item) =>
              COVERAGE_OPTIONS.find(
                (option) =>
                  option.value === item
              )?.label ||
              titleCase(item)
          )
          .join(" • ")
      )
    );
  }

  function renderDoctorPermissions(
    member
  ) {
    const role =
      member.role;

    const defaultPermissions =
      getDefaultPermissions(
        role,
        selectedUnit
      );

    const customMap =
      member.customPermissions.reduce(
        (result, item) => {
          result[item.permission_code] =
            item.allowed;
          return result;
        },
        {}
      );

    const relevantPermissions =
      permissions.filter(
        (permission) =>
          !permission.code.startsWith(
            "admin."
          ) &&
          ![
            "admin.users",
            "admin.permissions",
            "admin.structure",
            "admin.audit"
          ].includes(
            permission.code
          )
      );

    return React.createElement(
      "div",
      {
        style: {
          marginTop: "12px",
          paddingTop: "12px",
          borderTop:
            "1px solid var(--border, #e5e7eb)"
        }
      },

      React.createElement(
        "div",
        {
          style: {
            fontWeight: 700,
            marginBottom: "10px"
          }
        },
        "Permissions"
      ),

      React.createElement(
        "div",
        {
          className: "muted",
          style: {
            marginBottom: "10px",
            fontSize: "12px"
          }
        },
        "Default access comes from the clinical role. Custom permissions override the individual doctor only when explicitly configured."
      ),

      relevantPermissions.length === 0
        ? React.createElement(
            "div",
            {
              className: "empty"
            },
            "No permissions configured."
          )
        : relevantPermissions.map(
            (permission) => {
              const hasCustom =
                Object.prototype.hasOwnProperty.call(
                  customMap,
                  permission.code
                );

              const effective =
                hasCustom
                  ? customMap[
                      permission.code
                    ]
                  : !!defaultPermissions[
                      permission.code
                    ];

              return React.createElement(
                "div",
                {
                  key: permission.id,
                  style: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent:
                      "space-between",
                    gap: "12px",
                    padding:
                      "8px 0",
                    borderBottom:
                      "1px solid rgba(0,0,0,0.05)"
                  }
                },

                React.createElement(
                  "div",
                  null,

                  React.createElement(
                    "div",
                    {
                      style: {
                        fontSize: "13px",
                        fontWeight: 600
                      }
                    },
                    permissionName(
                      permission.code
                    )
                  ),

                  React.createElement(
                    "div",
                    {
                      className: "muted",
                      style: {
                        fontSize: "11px"
                      }
                    },
                    hasCustom
                      ? "Custom"
                      : "Role default"
                  )
                ),

                React.createElement(
                  "button",
                  {
                    type: "button",
                    className:
                      effective
                        ? "btn btn-secondary"
                        : "btn",
                    style: {
                      minWidth: "76px",
                      fontSize: "12px"
                    },
                    onClick: () =>
                      setCustomPermission(
                        member.user_id,
                        selectedUnitId,
                        permission.code,
                        !effective
                      )
                  },
                  effective
                    ? "Allowed"
                    : "Denied"
                )
              );
            }
          )
    );
  }

  if (!isAdmin) {
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

  return React.createElement(
    React.Fragment,
    null,

    React.createElement(
      "div",
      {
        className: "row wrap",
        style: {
          alignItems: "center",
          marginBottom: "16px"
        }
      },

      React.createElement(
        "div",
        null,

        React.createElement(
          "div",
          {
            className: "page-title"
          },
          "Administration"
        ),

        React.createElement(
          "div",
          {
            className: "page-subtitle"
          },
          "Hospital structure and clinical team configuration"
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
              "btn btn-secondary",
            type: "button",
            onClick:
              loadAdministration,
            disabled: loading
          },
          loading
            ? "Refreshing..."
            : "Refresh"
        ),

        React.createElement(
          "button",
          {
            className:
              "btn btn-primary",
            type: "button",
            onClick:
              openAddUnit
          },
          "+ Add Unit"
        )
      )
    ),

    error
      ? React.createElement(
          "div",
          {
            className: "error",
            style: {
              marginBottom: "12px"
            }
          },
          error
        )
      : null,

    success
      ? React.createElement(
          "div",
          {
            className: "success",
            style: {
              marginBottom: "12px"
            }
          },
          success
        )
      : null,

    loading
      ? React.createElement(
          "div",
          {
            className: "loading"
          },
          "Loading administration..."
        )

      : React.createElement(
          React.Fragment,
          null,

          /* Hospital / Department context */
          React.createElement(
            "div",
            {
              className: "card",
              style: {
                marginBottom: "12px"
              }
            },

            React.createElement(
              "div",
              {
                className: "row wrap",
                style: {
                  alignItems:
                    "flex-end"
                }
              },

              React.createElement(
                "label",
                {
                  className: "field",
                  style: {
                    flex: "1 1 260px"
                  }
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
                      selectedDepartmentId,
                    onChange:
                      (event) =>
                        setSelectedDepartmentId(
                          event.target
                            .value
                        )
                  },

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
                "div",
                {
                  style: {
                    flex: "1 1 260px"
                  }
                },

                React.createElement(
                  "div",
                  {
                    className:
                      "muted",
                    style: {
                      fontSize: "11px",
                      marginBottom:
                        "5px"
                    }
                  },
                  "Active department"
                ),

                React.createElement(
                  "div",
                  {
                    style: {
                      fontWeight: 700,
                      fontSize: "16px"
                    }
                  },
                  selectedDepartment
                    ?.name ||
                    "—"
                )
              )
            )
          ),

          /* Main administration workspace */
          React.createElement(
            "div",
            {
              style: {
                display: "grid",
                gridTemplateColumns:
                  "minmax(220px, 0.8fr) minmax(0, 1.7fr)",
                gap: "12px",
                alignItems: "start"
              }
            },

            /* Units */
            React.createElement(
              "div",
              {
                className: "card"
              },

              React.createElement(
                "div",
                {
                  className: "row",
                  style: {
                    marginBottom:
                      "12px"
                  }
                },

                React.createElement(
                  "div",
                  {
                    className:
                      "section-title"
                  },
                  "Units"
                ),

                React.createElement(
                  "span",
                  {
                    className:
                      "muted"
                  },
                  activeUnits.length
                )
              ),

              activeUnits.length === 0

                ? React.createElement(
                    "div",
                    {
                      className:
                        "empty"
                    },
                    "No units configured for this department."
                  )

                : activeUnits.map(
                    renderUnitCard
                  )
            ),

            /* Selected unit */
            React.createElement(
              "div",
              {
                className: "card"
              },

              !selectedUnit

                ? React.createElement(
                    "div",
                    {
                      className:
                        "empty"
                    },
                    "Select a unit."
                  )

                : React.createElement(
                    React.Fragment,
                    null,

                    React.createElement(
                      "div",
                      {
                        className:
                          "row wrap",
                        style: {
                          alignItems:
                            "center",
                          marginBottom:
                            "10px"
                        }
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
                              "muted",
                            style: {
                              marginTop:
                                "4px"
                            }
                          },
                          getCoverage(
                            selectedUnit
                          )
                            .map(
                              (item) =>
                                COVERAGE_OPTIONS.find(
                                  (
                                    option
                                  ) =>
                                    option.value ===
                                    item
                                )
                                  ?.label ||
                                titleCase(
                                  item
                                )
                            )
                            .join(
                              " • "
                            )
                        )
                      ),

                      React.createElement(
                        "button",
                        {
                          className:
                            "btn btn-primary",
                          type: "button",
                          onClick:
                            openAddDoctor
                        },
                        "+ Add Doctor"
                      )
                    ),

                    React.createElement(
                      "div",
                      {
                        style: {
                          fontSize:
                            "12px",
                          color:
                            "var(--muted, #667085)",
                          marginBottom:
                            "10px"
                        }
                      },
                      "Clinical team"
                    ),

                    unitTeam.length === 0

                      ? React.createElement(
                          "div",
                          {
                            className:
                              "empty",
                            style: {
                              padding:
                                "24px"
                            }
                          },
                          "No doctors assigned to this unit."
                        )

                      : unitTeam.map(
                          (member) =>
                            React.createElement(
                              "div",
                              {
                                key:
                                  member.id,
                                style: {
                                  border:
                                    "1px solid var(--border, #e5e7eb)",
                                  borderRadius:
                                    "10px",
                                  padding:
                                    "12px",
                                  marginBottom:
                                    "8px"
                                }
                              },

                              React.createElement(
                                "div",
                                {
                                  style: {
                                    display:
                                      "grid",
                                    gridTemplateColumns:
                                      "minmax(0, 1fr) 170px auto",
                                    gap:
                                      "10px",
                                    alignItems:
                                      "center"
                                  }
                                },

                                React.createElement(
                                  "div",
                                  null,

                                  React.createElement(
                                    "div",
                                    {
                                      style: {
                                        fontWeight:
                                          700
                                      }
                                    },
                                    member
                                      .user
                                      ?.display_name ||
                                      "Unnamed doctor"
                                  ),

                                  React.createElement(
                                    "div",
                                    {
                                      className:
                                        "muted",
                                      style: {
                                        fontSize:
                                          "11px",
                                        marginTop:
                                          "3px"
                                      }
                                    },
                                    member
                                      .user
                                      ?.login_id ||
                                      member
                                        .user
                                        ?.email ||
                                      ""
                                  )
                                ),

                                React.createElement(
                                  "select",
                                  {
                                    value:
                                      member
                                        .role
                                        ?.code ||
                                      "",
                                    onChange:
                                      (
                                        event
                                      ) =>
                                        changeDoctorRole(
                                          member,
                                          event
                                            .target
                                            .value
                                        )
                                  },

                                  CLINICAL_ROLES.map(
                                    (
                                      role
                                    ) =>
                                      React.createElement(
                                        "option",
                                        {
                                          key:
                                            role.code,
                                          value:
                                            role.code
                                        },
                                        role.label
                                      )
                                  )
                                ),

                                React.createElement(
                                  "button",
                                  {
                                    className:
                                      "btn btn-secondary",
                                    type: "button",
                                    onClick:
                                      () =>
                                        setExpandedDoctorId(
                                          expandedDoctorId ===
                                            member.user_id
                                            ? null
                                            : member.user_id
                                        )
                                  },
                                  expandedDoctorId ===
                                    member.user_id
                                    ? "Close"
                                    : "Permissions"
                                )
                              ),

                              expandedDoctorId ===
                                member.user_id
                                ? renderDoctorPermissions(
                                    member
                                  )
                                : null,

                              React.createElement(
                                "div",
                                {
                                  style: {
                                    display:
                                      "flex",
                                    justifyContent:
                                      "flex-end",
                                    marginTop:
                                      "8px"
                                  }
                                },

                                React.createElement(
                                  "button",
                                  {
                                    type:
                                      "button",
                                    className:
                                      "btn",
                                    style: {
                                      fontSize:
                                        "11px"
                                    },
                                    onClick:
                                      () =>
                                        removeDoctorFromUnit(
                                          member
                                        )
                                  },
                                  "Remove from unit"
                                )
                              )
                            )
                        )
                  )
            )
          )
        ),

    /* Add Unit modal */
    showUnitForm
      ? React.createElement(
          "div",
          {
            style: {
              position: "fixed",
              inset: 0,
              background:
                "rgba(15,23,42,0.42)",
              display: "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              padding: "16px",
              zIndex: 1000
            }
          },

          React.createElement(
            "div",
            {
              className: "card",
              style: {
                width: "min(560px, 100%)",
                maxHeight:
                  "90vh",
                overflowY:
                  "auto"
              }
            },

            React.createElement(
              "div",
              {
                className: "row",
                style: {
                  marginBottom:
                    "16px"
                }
              },

              React.createElement(
                "div",
                {
                  className:
                    "section-title"
                },
                "Add Unit"
              ),

              React.createElement(
                "button",
                {
                  type: "button",
                  className:
                    "btn btn-secondary",
                  onClick:
                    closeAddUnit
                },
                "Close"
              )
            ),

            React.createElement(
              "form",
              {
                onSubmit:
                  createUnit
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
                  "Department"
                ),

                React.createElement(
                  "select",
                  {
                    value:
                      unitForm.department_id,
                    onChange:
                      (event) =>
                        setUnitForm(
                          (
                            previous
                          ) => ({
                            ...previous,
                            department_id:
                              event
                                .target
                                .value
                          })
                        ),
                    required: true
                  },

                  activeDepartments.map(
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
                "label",
                {
                  className:
                    "field"
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
                    onChange:
                      (event) =>
                        setUnitForm(
                          (
                            previous
                          ) => ({
                            ...previous,
                            name:
                              event
                                .target
                                .value
                          })
                        ),
                    placeholder:
                      "e.g. Cardiology Ward",
                    required: true
                  }
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
                  "Unit Code"
                ),

                React.createElement(
                  "input",
                  {
                    value:
                      unitForm.code,
                    onChange:
                      (event) =>
                        setUnitForm(
                          (
                            previous
                          ) => ({
                            ...previous,
                            code:
                              event
                                .target
                                .value
                                .toLowerCase()
                                .replace(
                                  /\s+/g,
                                  "_"
                                )
                          })
                        ),
                    placeholder:
                      "Optional — generated automatically"
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
                  "span",
                  null,
                  "Coverage"
                ),

                React.createElement(
                  "div",
                  {
                    style: {
                      display:
                        "grid",
                      gap:
                        "8px",
                      marginTop:
                        "8px"
                    }
                  },

                  COVERAGE_OPTIONS.map(
                    (
                      option
                    ) =>
                      React.createElement(
                        "label",
                        {
                          key:
                            option.value,
                          style: {
                            display:
                              "flex",
                            gap:
                              "9px",
                            alignItems:
                              "center",
                            padding:
                              "9px 10px",
                            border:
                              "1px solid var(--border, #e5e7eb)",
                            borderRadius:
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
                          "span",
                          null,
                          option.label
                        )
                      )
                  )
                )
              ),

              React.createElement(
                "div",
                {
                  className: "row",
                  style: {
                    justifyContent:
                      "flex-end",
                    marginTop:
                      "16px"
                  }
                },

                React.createElement(
                  "button",
                  {
                    type: "button",
                    className:
                      "btn btn-secondary",
                    onClick:
                      closeAddUnit
                  },
                  "Cancel"
                ),

                React.createElement(
                  "button",
                  {
                    type: "submit",
                    className:
                      "btn btn-primary",
                    disabled:
                      saving
                  },
                  saving
                    ? "Creating..."
                    : "Create Unit"
                )
              )
            )
          )
        )
      : null,

    /* Add Doctor modal */
    showDoctorForm
      ? React.createElement(
          "div",
          {
            style: {
              position: "fixed",
              inset: 0,
              background:
                "rgba(15,23,42,0.42)",
              display: "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              padding: "16px",
              zIndex: 1000
            }
          },

          React.createElement(
            "div",
            {
              className: "card",
              style: {
                width:
                  "min(500px, 100%)"
              }
            },

            React.createElement(
              "div",
              {
                className: "row",
                style: {
                  marginBottom:
                    "16px"
                }
              },

              React.createElement(
                "div",
                {
                  className:
                    "section-title"
                },
                "Add Doctor"
              ),

              React.createElement(
                "button",
                {
                  type: "button",
                  className:
                    "btn btn-secondary",
                  onClick:
                    closeAddDoctor
                },
                "Close"
              )
            ),

            React.createElement(
              "form",
              {
                onSubmit:
                  addDoctorToUnit
              },

              React.createElement(
                "div",
                {
                  className:
                    "muted",
                  style: {
                    marginBottom:
                      "12px"
                  }
                },
                selectedUnit?.name
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
                  "Doctor"
                ),

                React.createElement(
                  "select",
                  {
                    value:
                      doctorForm.user_id,
                    onChange:
                      (event) =>
                        setDoctorForm(
                          (
                            previous
                          ) => ({
                            ...previous,
                            user_id:
                              event
                                .target
                                .value
                          })
                        ),
                    required: true
                  },

                  React.createElement(
                    "option",
                    {
                      value: ""
                    },
                    "Select doctor"
                  ),

                  availableDoctors.map(
                    (doctor) =>
                      React.createElement(
                        "option",
                        {
                          key:
                            doctor.id,
                          value:
                            doctor.id
                        },
                        doctor.display_name ||
                          doctor.login_id ||
                          doctor.email
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
                  "Clinical Role"
                ),

                React.createElement(
                  "select",
                  {
                    value:
                      doctorForm.role_code,
                    onChange:
                      (event) =>
                        setDoctorForm(
                          (
                            previous
                          ) => ({
                            ...previous,
                            role_code:
                              event
                                .target
                                .value
                          })
                        )
                  },

                  CLINICAL_ROLES.map(
                    (role) =>
                      React.createElement(
                        "option",
                        {
                          key:
                            role.code,
                          value:
                            role.code
                        },
                        role.label
                      )
                  )
                )
              ),

              React.createElement(
                "div",
                {
                  className: "row",
                  style: {
                    justifyContent:
                      "flex-end",
                    marginTop:
                      "16px"
                  }
                },

                React.createElement(
                  "button",
                  {
                    type: "button",
                    className:
                      "btn btn-secondary",
                    onClick:
                      closeAddDoctor
                  },
                  "Cancel"
                ),

                React.createElement(
                  "button",
                  {
                    type: "submit",
                    className:
                      "btn btn-primary",
                    disabled:
                      saving
                  },
                  saving
                    ? "Adding..."
                    : "Add Doctor"
                )
              )
            )
          )
        )
      : null
  );
            }
