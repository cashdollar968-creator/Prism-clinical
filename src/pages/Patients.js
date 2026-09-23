import React, { useEffect, useMemo, useState } from "react";
import { db } from "../supabase";
import React, { useEffect, useMemo, useState } from "react";
import { db } from "../supabase";

console.log("PRISM PATIENTS PAGE LOADED");
function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${
        props.className || ""
      }`}
    />
  );
}

function Select({ children, ...props }) {
  return (
    <select
      {...props}
      className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-400 ${
        props.className || ""
      }`}
    >
      {children}
    </select>
  );
}

function Textarea(props) {
  return (
    <textarea
      {...props}
      className={`min-h-[90px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${
        props.className || ""
      }`}
    />
  );
}

function NewPatientModal({ onClose, onCreated }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [departments, setDepartments] = useState([]);
  const [units, setUnits] = useState([]);
  const [wards, setWards] = useState([]);
  const [beds, setBeds] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [accessibleUnitIds, setAccessibleUnitIds] = useState([]);

  const [currentUserId, setCurrentUserId] = useState(null);

  const [form, setForm] = useState({
    patient_code: "",
    full_name: "",
    age: "",
    sex: "",
    department_id: "",
    unit_id: "",
    ward_id: "",
    bed_id: "",
    responsible_mo_id: "",
    specialist_id: "",
    admission_datetime: new Date()
      .toISOString()
      .slice(0, 16),
    reason_for_admission: "",
    brief_summary: "",
    working_diagnosis: "",
    relevant_background: "",
    baseline_clinical_status: "",
    baseline_investigations: "",
    initial_plan: "",
    goals_targets: "",
    demo: false,
  });

  useEffect(() => {
    loadOptions();
  }, []);

  async function loadOptions() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await db.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        throw new Error("No authenticated user found.");
      }

      setCurrentUserId(user.id);

      /*
       * Current user's active clinical assignments.
       */
      const { data: myRoles, error: rolesError } =
        await db
          .from("user_department_roles")
          .select(
            `
            id,
            user_id,
            department_role_id,
            unit_id,
            active,
            start_at,
            end_at,
            department_roles (
              id,
              department_id,
              code,
              name,
              active
            )
          `
          )
          .eq("user_id", user.id)
          .eq("active", true);

      if (rolesError) throw rolesError;

      const now = new Date();

      const validRoles = (myRoles || []).filter(
        (role) => {
          if (!role.active) return false;

          if (
            role.start_at &&
            new Date(role.start_at) > now
          ) {
            return false;
          }

          if (
            role.end_at &&
            new Date(role.end_at) < now
          ) {
            return false;
          }

          if (
            role.department_roles &&
            !role.department_roles.active
          ) {
            return false;
          }

          return true;
        }
      );

      const unitIds = [
        ...new Set(
          validRoles
            .map((role) => role.unit_id)
            .filter(Boolean)
        ),
      ];

      setAccessibleUnitIds(unitIds);

      /*
       * Departments.
       */
      const {
        data: departmentData,
        error: departmentError,
      } = await db
        .from("departments")
        .select(
          "id,name,hospital_id,active"
        )
        .eq("active", true)
        .order("name");

      if (departmentError) {
        throw departmentError;
      }

      /*
       * Units.
       */
      const {
        data: unitData,
        error: unitError,
      } = await db
        .from("units")
        .select(
          "id,name,code,department_id,unit_type,coverage,active"
        )
        .eq("active", true)
        .order("name");

      if (unitError) throw unitError;

      /*
       * Wards.
       */
      const {
        data: wardData,
        error: wardError,
      } = await db
        .from("wards")
        .select(
          "id,name,department_id,unit_id,active"
        )
        .eq("active", true)
        .order("name");

      if (wardError) throw wardError;

      /*
       * Beds.
       */
      const {
        data: bedData,
        error: bedError,
      } = await db
        .from("beds")
        .select(
          "id,name,ward_id,active"
        )
        .eq("active", true)
        .order("name");

      if (bedError) throw bedError;

      /*
       * Determine occupied beds from active admissions.
       */
      const {
        data: activeAdmissions,
        error: admissionsError,
      } = await db
        .from("admissions")
        .select(
          "id,bed_id,status"
        )
        .in("status", [
          "active",
          "inpatient",
        ]);

      if (admissionsError) {
        throw admissionsError;
      }

      const occupiedBedIds = new Set(
        (activeAdmissions || [])
          .map((admission) => admission.bed_id)
          .filter(Boolean)
      );

      const bedsWithAvailability =
        (bedData || []).map((bed) => ({
          ...bed,
          available:
            !occupiedBedIds.has(bed.id),
        }));

      /*
       * Active profiles.
       */
      const {
        data: profileData,
        error: profileError,
      } = await db
        .from("profiles")
        .select(
          "id,display_name,email,role,department_id,active"
        )
        .eq("active", true)
        .order("display_name");

      if (profileError) throw profileError;

      /*
       * Active role assignments for all users.
       */
      const {
        data: allUserRoles,
        error: allRolesError,
      } = await db
        .from("user_department_roles")
        .select(
          `
          id,
          user_id,
          department_role_id,
          unit_id,
          active,
          start_at,
          end_at,
          department_roles (
            id,
            department_id,
            code,
            name,
            active
          )
        `
        )
        .eq("active", true);

      if (allRolesError) {
        throw allRolesError;
      }

      const validUserRoles =
        (allUserRoles || []).filter(
          (role) => {
            if (!role.active) return false;

            if (
              role.start_at &&
              new Date(role.start_at) > now
            ) {
              return false;
            }

            if (
              role.end_at &&
              new Date(role.end_at) < now
            ) {
              return false;
            }

            if (
              role.department_roles &&
              !role.department_roles.active
            ) {
              return false;
            }

            return true;
          }
        );

      const profileAssignments = {};

      for (const role of validUserRoles) {
        if (!profileAssignments[role.user_id]) {
          profileAssignments[role.user_id] =
            [];
        }

        profileAssignments[
          role.user_id
        ].push(role);
      }

      const enrichedProfiles =
        (profileData || []).map(
          (profile) => ({
            ...profile,
            assignments:
              profileAssignments[
                profile.id
              ] || [],
          })
        );

      setDepartments(
        departmentData || []
      );
      setUnits(unitData || []);
      setWards(wardData || []);
      setBeds(bedsWithAvailability);
      setProfiles(enrichedProfiles);

      /*
       * If only one Unit is accessible,
       * select it automatically.
       */
      if (unitIds.length === 1) {
        const selectedUnit =
          (unitData || []).find(
            (unit) =>
              unit.id === unitIds[0]
          );

        if (selectedUnit) {
          setForm((previous) => ({
            ...previous,
            department_id:
              selectedUnit.department_id,
            unit_id: selectedUnit.id,
          }));
        }
      }
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Failed to load admission options."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * Only Units assigned to current user.
   */
  const availableUnits = useMemo(() => {
    if (
      accessibleUnitIds.length === 0
    ) {
      return [];
    }

    return units.filter((unit) =>
      accessibleUnitIds.includes(
        unit.id
      )
    );
  }, [
    units,
    accessibleUnitIds,
  ]);

  /*
   * Departments are derived from accessible Units.
   */
  const availableDepartments =
    useMemo(() => {
      const departmentIds =
        new Set(
          availableUnits.map(
            (unit) =>
              unit.department_id
          )
        );

      return departments.filter(
        (department) =>
          departmentIds.has(
            department.id
          )
      );
    }, [
      departments,
      availableUnits,
    ]);

  /*
   * Unit → Ward.
   */
  const availableWards = useMemo(() => {
    if (!form.unit_id) return [];

    return wards.filter(
      (ward) =>
        ward.active &&
        ward.unit_id ===
          form.unit_id
    );
  }, [
    wards,
    form.unit_id,
  ]);

  /*
   * Ward → available Bed.
   */
  const availableBeds = useMemo(() => {
    if (!form.ward_id) return [];

    return beds.filter(
      (bed) =>
        bed.active &&
        bed.ward_id ===
          form.ward_id &&
        bed.available
    );
  }, [
    beds,
    form.ward_id,
  ]);

  /*
   * Users assigned to selected Unit.
   */
  const unitProfiles = useMemo(() => {
    if (!form.unit_id) return [];

    return profiles.filter(
      (profile) =>
        profile.assignments.some(
          (assignment) =>
            assignment.unit_id ===
            form.unit_id
        )
    );
  }, [
    profiles,
    form.unit_id,
  ]);

  /*
   * Medical Officers.
   */
  const medicalOfficers =
    useMemo(() => {
      return unitProfiles.filter(
        (profile) =>
          profile.assignments.some(
            (assignment) => {
              const code =
                (
                  assignment
                    .department_roles
                    ?.code || ""
                ).toLowerCase();

              const name =
                (
                  assignment
                    .department_roles
                    ?.name || ""
                ).toLowerCase();

              return (
                code.includes(
                  "medical_officer"
                ) ||
                code.includes(
                  "medical officer"
                ) ||
                code === "mo" ||
                name.includes(
                  "medical officer"
                )
              );
            }
          )
      );
    }, [unitProfiles]);

  /*
   * Consultants / Specialists / Fellows.
   */
  const specialists =
    useMemo(() => {
      return unitProfiles.filter(
        (profile) =>
          profile.assignments.some(
            (assignment) => {
              const code =
                (
                  assignment
                    .department_roles
                    ?.code || ""
                ).toLowerCase();

              const name =
                (
                  assignment
                    .department_roles
                    ?.name || ""
                ).toLowerCase();

              return (
                code.includes(
                  "consultant"
                ) ||
                code.includes(
                  "specialist"
                ) ||
                code.includes(
                  "fellow"
                ) ||
                name.includes(
                  "consultant"
                ) ||
                name.includes(
                  "specialist"
                ) ||
                name.includes(
                  "fellow"
                )
              );
            }
          )
      );
    }, [unitProfiles]);

  /*
   * Automatically select current user
   * if they are a Medical Officer.
   */
  useEffect(() => {
    if (
      !currentUserId ||
      !form.unit_id ||
      form.responsible_mo_id
    ) {
      return;
    }

    const currentUser =
      medicalOfficers.find(
        (profile) =>
          profile.id ===
          currentUserId
      );

    if (currentUser) {
      setForm((previous) => ({
        ...previous,
        responsible_mo_id:
          currentUser.id,
      }));
    }
  }, [
    currentUserId,
    form.unit_id,
    form.responsible_mo_id,
    medicalOfficers,
  ]);

  function updateField(
    field,
    value
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function handleDepartmentChange(
    departmentId
  ) {
    setForm((previous) => ({
      ...previous,
      department_id:
        departmentId,
      unit_id: "",
      ward_id: "",
      bed_id: "",
      responsible_mo_id: "",
      specialist_id: "",
    }));
  }

  function handleUnitChange(
    unitId
  ) {
    const unit =
      availableUnits.find(
        (item) =>
          item.id === unitId
      );

    setForm((previous) => ({
      ...previous,
      department_id:
        unit?.department_id ||
        previous.department_id,
      unit_id: unitId,
      ward_id: "",
      bed_id: "",
      responsible_mo_id: "",
      specialist_id: "",
    }));
  }

  function handleWardChange(
    wardId
  ) {
    setForm((previous) => ({
      ...previous,
      ward_id: wardId,
      bed_id: "",
    }));
  }

  async function submit(event) {
    event.preventDefault();

    setError("");

    if (!form.patient_code.trim()) {
      setError(
        "Patient code is required."
      );
      return;
    }

    if (!form.full_name.trim()) {
      setError(
        "Patient name is required."
      );
      return;
    }

    if (
      !form.age ||
      Number(form.age) < 0
    ) {
      setError(
        "Valid patient age is required."
      );
      return;
    }

    if (!form.sex) {
      setError("Sex is required.");
      return;
    }

    if (!form.department_id) {
      setError(
        "Department is required."
      );
      return;
    }

    if (!form.unit_id) {
      setError("Unit is required.");
      return;
    }

    if (!form.ward_id) {
      setError("Ward is required.");
      return;
    }

    if (
      !form.reason_for_admission.trim()
    ) {
      setError(
        "Reason for admission is required."
      );
      return;
    }

    if (!form.responsible_mo_id) {
      setError(
        "Responsible Medical Officer is required."
      );
      return;
    }

    const selectedUnit =
      availableUnits.find(
        (unit) =>
          unit.id === form.unit_id
      );

    const selectedWard =
      availableWards.find(
        (ward) =>
          ward.id === form.ward_id
      );

    if (!selectedUnit) {
      setError(
        "Selected Unit is not accessible."
      );
      return;
    }

    if (!selectedWard) {
      setError(
        "Selected Ward does not belong to this Unit."
      );
      return;
    }

    if (form.bed_id) {
      const selectedBed =
        availableBeds.find(
          (bed) =>
            bed.id === form.bed_id
        );

      if (!selectedBed) {
        setError(
          "The selected bed is no longer available. Please select another bed."
        );
        return;
      }
    }

    try {
      setSaving(true);

      /*
       * Create Patient + Admission.
       */
      const {
        data,
        error: rpcError,
      } = await db.rpc(
        "prism_create_patient_admission",
        {
          p_patient_code:
            form.patient_code.trim(),

          p_full_name:
            form.full_name.trim(),

          p_age: Number(form.age),

          p_sex: form.sex,

          p_admission_datetime:
            form.admission_datetime
              ? new Date(
                  form.admission_datetime
                ).toISOString()
              : new Date().toISOString(),

          p_reason_for_admission:
            form.reason_for_admission.trim(),

          p_working_diagnosis:
            form.working_diagnosis.trim() ||
            null,

          p_department_id:
            form.department_id,

          p_unit_id:
            form.unit_id,

          p_ward_id:
            form.ward_id,

          p_bed_id:
            form.bed_id || null,

          p_responsible_mo_id:
            form.responsible_mo_id,

          p_specialist_id:
            form.specialist_id || null,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      if (
        !data?.patient_id ||
        !data?.admission_id
      ) {
        throw new Error(
          "Admission was not created correctly."
        );
      }

      /*
       * Save additional clinical admission data.
       */
      const hasClinicalData =
        form.brief_summary.trim() ||
        form.working_diagnosis.trim() ||
        form.relevant_background.trim() ||
        form.baseline_clinical_status.trim() ||
        form.baseline_investigations.trim() ||
        form.initial_plan.trim() ||
        form.goals_targets.trim();

      if (hasClinicalData) {
        const {
          error: clinicalError,
        } = await db.rpc(
          "prism_update_admission_clinical",
          {
            p_admission_id:
              data.admission_id,

            p_brief_summary:
              form.brief_summary.trim() ||
              null,

            p_working_diagnosis:
              form.working_diagnosis.trim() ||
              null,

            p_relevant_background:
              form.relevant_background.trim() ||
              null,

            p_baseline_clinical_status:
              form.baseline_clinical_status.trim() ||
              null,

            p_baseline_investigations:
              form.baseline_investigations.trim() ||
              null,

            p_initial_plan:
              form.initial_plan.trim() ||
              null,

            p_goals_targets:
              form.goals_targets.trim() ||
              null,
          }
        );

        if (clinicalError) {
          console.error(
            "Admission created but clinical data update failed:",
            clinicalError
          );

          setError(
            `Admission ${
              data.admission_number || ""
            } was created, but the additional clinical data could not be saved.`
          );

          setTimeout(() => {
            onCreated?.(data);
            onClose?.();
          }, 1200);

          return;
        }
      }

      onCreated?.(data);
      onClose?.();
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Failed to create the patient admission."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
          <div className="text-sm text-slate-600">
            Loading admission options...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4">
      <div className="mx-auto my-4 w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              New Patient Admission
            </h2>

            <p className="text-xs text-slate-500">
              Department → Unit → Ward → Bed
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <form
          onSubmit={submit}
          className="p-5"
        >
          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-7">
            {/* PATIENT */}

            <section>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Patient
              </h3>

              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Patient Code"
                  required
                >
                  <Input
                    value={
                      form.patient_code
                    }
                    onChange={(event) =>
                      updateField(
                        "patient_code",
                        event.target.value
                      )
                    }
                    placeholder="Patient code"
                  />
                </Field>

                <Field
                  label="Full Name"
                  required
                >
                  <Input
                    value={
                      form.full_name
                    }
                    onChange={(event) =>
                      updateField(
                        "full_name",
                        event.target.value
                      )
                    }
                    placeholder="Full name"
                  />
                </Field>

                <Field
                  label="Age"
                  required
                >
                  <Input
                    type="number"
                    min="0"
                    value={form.age}
                    onChange={(event) =>
                      updateField(
                        "age",
                        event.target.value
                      )
                    }
                  />
                </Field>

                <Field
                  label="Sex"
                  required
                >
                  <Select
                    value={form.sex}
                    onChange={(event) =>
                      updateField(
                        "sex",
                        event.target.value
                      )
                    }
                  >
                    <option value="">
                      Select sex
                    </option>

                    <option value="male">
                      Male
                    </option>

                    <option value="female">
                      Female
                    </option>
                  </Select>
                </Field>

                <Field label="Admission Date & Time">
                  <Input
                    type="datetime-local"
                    value={
                      form.admission_datetime
                    }
                    onChange={(event) =>
                      updateField(
                        "admission_datetime",
                        event.target.value
                      )
                    }
                  />
                </Field>

                <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={form.demo}
                    onChange={(event) =>
                      updateField(
                        "demo",
                        event.target.checked
                      )
                    }
                    className="h-4 w-4"
                  />

                  <span>
                    <span className="block text-sm font-medium text-slate-700">
                      Demo / Training Patient
                    </span>

                    <span className="block text-xs text-slate-500">
                      Mark this patient as a non-real training record.
                    </span>
                  </span>
                </label>
              </div>
            </section>

            {/* LOCATION */}

            <section>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Clinical Location & Responsibility
              </h3>

              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Department"
                  required
                >
                  <Select
                    value={
                      form.department_id
                    }
                    onChange={(event) =>
                      handleDepartmentChange(
                        event.target.value
                      )
                    }
                  >
                    <option value="">
                      Select Department
                    </option>

                    {availableDepartments.map(
                      (department) => (
                        <option
                          key={department.id}
                          value={department.id}
                        >
                          {department.name}
                        </option>
                      )
                    )}
                  </Select>
                </Field>

                <Field
                  label="Unit"
                  required
                >
                  <Select
                    value={form.unit_id}
                    onChange={(event) =>
                      handleUnitChange(
                        event.target.value
                      )
                    }
                    disabled={
                      !form.department_id
                    }
                  >
                    <option value="">
                      {form.department_id
                        ? "Select Unit"
                        : "Select Department first"}
                    </option>

                    {availableUnits
                      .filter(
                        (unit) =>
                          !form.department_id ||
                          unit.department_id ===
                            form.department_id
                      )
                      .map((unit) => (
                        <option
                          key={unit.id}
                          value={unit.id}
                        >
                          {unit.name}
                        </option>
                      ))}
                  </Select>
                </Field>

                <Field
                  label="Ward"
                  required
                >
                  <Select
                    value={form.ward_id}
                    onChange={(event) =>
                      handleWardChange(
                        event.target.value
                      )
                    }
                    disabled={
                      !form.unit_id
                    }
                  >
                    <option value="">
                      {form.unit_id
                        ? "Select Ward"
                        : "Select Unit first"}
                    </option>

                    {availableWards.map(
                      (ward) => (
                        <option
                          key={ward.id}
                          value={ward.id}
                        >
                          {ward.name}
                        </option>
                      )
                    )}
                  </Select>
                </Field>

                <Field label="Bed">
                  <Select
                    value={form.bed_id}
                    onChange={(event) =>
                      updateField(
                        "bed_id",
                        event.target.value
                      )
                    }
                    disabled={
                      !form.ward_id
                    }
                  >
                    <option value="">
                      {form.ward_id
                        ? "No bed / assign later"
                        : "Select Ward first"}
                    </option>

                    {availableBeds.map(
                      (bed) => (
                        <option
                          key={bed.id}
                          value={bed.id}
                        >
                          {bed.name} — Available
                        </option>
                      )
                    )}
                  </Select>

                  {form.ward_id &&
                    availableBeds.length ===
                      0 && (
                      <p className="mt-1 text-xs text-amber-600">
                        No available beds in this Ward.
                      </p>
                    )}
                </Field>

                <Field
                  label="Responsible Medical Officer"
                  required
                >
                  <Select
                    value={
                      form.responsible_mo_id
                    }
                    onChange={(event) =>
                      updateField(
                        "responsible_mo_id",
                        event.target.value
                      )
                    }
                    disabled={
                      !form.unit_id
                    }
                  >
                    <option value="">
                      {form.unit_id
                        ? "Select Medical Officer"
                        : "Select Unit first"}
                    </option>

                    {medicalOfficers.map(
                      (profile) => (
                        <option
                          key={profile.id}
                          value={profile.id}
                        >
                          {profile.display_name ||
                            profile.email}
                        </option>
                      )
                    )}
                  </Select>

                  {form.unit_id &&
                    medicalOfficers.length ===
                      0 && (
                      <p className="mt-1 text-xs text-amber-600">
                        No Medical Officer is assigned to this Unit.
                      </p>
                    )}
                </Field>

                <Field label="Consultant / Specialist">
                  <Select
                    value={
                      form.specialist_id
                    }
                    onChange={(event) =>
                      updateField(
                        "specialist_id",
                        event.target.value
                      )
                    }
                    disabled={
                      !form.unit_id
                    }
                  >
                    <option value="">
                      {form.unit_id
                        ? "Select Consultant / Specialist"
                        : "Select Unit first"}
                    </option>

                    {specialists.map(
                      (profile) => (
                        <option
                          key={profile.id}
                          value={profile.id}
                        >
                          {profile.display_name ||
                            profile.email}
                        </option>
                      )
                    )}
                  </Select>

                  {form.unit_id &&
                    specialists.length ===
                      0 && (
                      <p className="mt-1 text-xs text-amber-600">
                        No Consultant/Specialist is assigned to this Unit.
                      </p>
                    )}
                </Field>
              </div>
            </section>

            {/* ADMISSION */}

            <section>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Admission
              </h3>

              <div className="grid gap-4">
                <Field
                  label="Reason for Admission"
                  required
                >
                  <Textarea
                    value={
                      form.reason_for_admission
                    }
                    onChange={(event) =>
                      updateField(
                        "reason_for_admission",
                        event.target.value
                      )
                    }
                    placeholder="Why is the patient being admitted?"
                  />
                </Field>

                <Field label="Brief Summary">
                  <Textarea
                    value={
                      form.brief_summary
                    }
                    onChange={(event) =>
                      updateField(
                        "brief_summary",
                        event.target.value
                      )
                    }
                    placeholder="Brief admission summary"
                  />
                </Field>

                <Field label="Working Diagnosis">
                  <Textarea
                    value={
                      form.working_diagnosis
                    }
                    onChange={(event) =>
                      updateField(
                        "working_diagnosis",
                        event.target.value
                      )
                    }
                    placeholder="Primary / working diagnosis"
                  />
                </Field>

                <Field label="Relevant Background">
                  <Textarea
                    value={
                      form.relevant_background
                    }
                    onChange={(event) =>
                      updateField(
                        "relevant_background",
                        event.target.value
                      )
                    }
                    placeholder="Relevant history and comorbidities"
                  />
                </Field>

                <Field label="Baseline Clinical Status">
                  <Textarea
                    value={
                      form.baseline_clinical_status
                    }
                    onChange={(event) =>
                      updateField(
                        "baseline_clinical_status",
                        event.target.value
                      )
                    }
                    placeholder="Baseline clinical status"
                  />
                </Field>

                <Field label="Baseline Investigations">
                  <Textarea
                    value={
                      form.baseline_investigations
                    }
                    onChange={(event) =>
                      updateField(
                        "baseline_investigations",
                        event.target.value
                      )
                    }
                    placeholder="Important baseline investigations"
                  />
                </Field>

                <Field label="Initial Plan">
                  <Textarea
                    value={form.initial_plan}
                    onChange={(event) =>
                      updateField(
                        "initial_plan",
                        event.target.value
                      )
                    }
                    placeholder="Initial management plan"
                  />
                </Field>

                <Field label="Goals / Targets">
                  <Textarea
                    value={
                      form.goals_targets
                    }
                    onChange={(event) =>
                      updateField(
                        "goals_targets",
                        event.target.value
                      )
                    }
                    placeholder="Clinical goals and targets"
                  />
                </Field>
              </div>
            </section>
          </div>

          <div className="mt-7 flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Creating Admission..."
                : "Create Admission"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Patients() {
  const [patients, setPatients] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [showNewPatient, setShowNewPatient] =
    useState(false);

  const [error, setError] =
    useState("");

  async function loadPatients() {
    setLoading(true);
    setError("");

    try {
      const {
        data,
        error: queryError,
      } = await db
        .from("admissions")
        .select(
          `
          id,
          admission_number,
          admission_datetime,
          status,
          ward_id,
          bed_id,
          unit_id,
          working_diagnosis,
          patients (
            id,
            patient_code,
            full_name,
            age,
            sex
          )
        `
        )
        .in("status", [
          "active",
          "inpatient",
        ])
        .order(
          "admission_datetime",
          {
            ascending: false,
          }
        );

      if (queryError) {
        throw queryError;
      }

      setPatients(data || []);
    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
          "Failed to load patients."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPatients();
  }, []);

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Patients
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Active inpatient admissions
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowNewPatient(true)
            }
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            + New Patient
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">
              Loading patients...
            </div>
          ) : patients.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-sm font-medium text-slate-700">
                No patients found
              </div>

              <div className="mt-1 text-xs text-slate-500">
                Create a new admission to see patients here.
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">
                      Admission
                    </th>

                    <th className="px-4 py-3">
                      Patient
                    </th>

                    <th className="px-4 py-3">
                      Age / Sex
                    </th>

                    <th className="px-4 py-3">
                      Diagnosis
                    </th>

                    <th className="px-4 py-3">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {patients.map(
                    (admission) => {
                      const patient =
                        admission.patients;

                      return (
                        <tr
                          key={admission.id}
                          className="hover:bg-slate-50"
                        >
                          <td className="px-4 py-4">
                            <div className="font-medium text-slate-900">
                              {admission.admission_number ||
                                "—"}
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              {admission.admission_datetime
                                ? new Date(
                                    admission.admission_datetime
                                  ).toLocaleString()
                                : "—"}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <div className="font-medium text-slate-900">
                              {patient?.full_name ||
                                "—"}
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              {patient?.patient_code ||
                                "—"}
                            </div>
                          </td>

                          <td className="px-4 py-4 text-slate-700">
                            {patient?.age ??
                              "—"}{" "}
                            /{" "}
                            {patient?.sex ||
                              "—"}
                          </td>

                          <td className="max-w-xs px-4 py-4 text-slate-700">
                            {admission.working_diagnosis ||
                              "—"}
                          </td>

                          <td className="px-4 py-4">
                            <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                              {admission.status ||
                                "active"}
                            </span>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showNewPatient && (
        <NewPatientModal
          onClose={() =>
            setShowNewPatient(false)
          }
          onCreated={() => {
            setShowNewPatient(false);
            loadPatients();
          }}
        />
      )}
    </div>
  );
}
