import React, { useEffect, useState } from "https://esm.sh/react@18.3.1";
import { db } from "../supabase.js";
import { roleLabel } from "../helpers.js";

export default function Administration({ profile }) {
  const [profiles, setProfiles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [wards, setWards] = useState([]);
  const [beds, setBeds] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAdministration() {
    setLoading(true);
    setError("");

    const [
      profilesResult,
      departmentsResult,
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
      wardsResult.error ||
      bedsResult.error;

    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    setProfiles(profilesResult.data || []);
    setDepartments(departmentsResult.data || []);
    setWards(wardsResult.data || []);
    setBeds(bedsResult.data || []);

    setLoading(false);
  }

  useEffect(() => {
    loadAdministration();
  }, []);

  if (profile?.role !== "admin") {
    return React.createElement(
      "div",
      { className: "card" },

      React.createElement(
        "div",
        { className: "empty" },
        "Access restricted to administrators."
      )
    );
  }

  return React.createElement(
    React.Fragment,
    null,

    React.createElement(
      "div",
      { className: "row wrap" },

      React.createElement(
        "div",
        null,

        React.createElement(
          "div",
          { className: "page-title" },
          "Administration"
        ),

        React.createElement(
          "div",
          { className: "page-subtitle" },
          "Users, departments, wards and beds"
        )
      ),

      React.createElement(
        "button",
        {
          className: "btn btn-secondary",
          onClick: loadAdministration,
          disabled: loading
        },
        loading ? "Refreshing..." : "Refresh"
      )
    ),

    error
      ? React.createElement(
          "div",
          { className: "error" },
          error
        )
      : null,

    loading

      ? React.createElement(
          "div",
          { className: "loading" },
          "Loading administration data..."
        )

      : React.createElement(
          React.Fragment,
          null,

          React.createElement(
            "div",
            { className: "grid grid-4" },

            React.createElement(
              "div",
              { className: "card" },

              React.createElement(
                "div",
                { className: "stat-label" },
                "Users"
              ),

              React.createElement(
                "div",
                { className: "stat-number" },
                profiles.length
              )
            ),

            React.createElement(
              "div",
              { className: "card" },

              React.createElement(
                "div",
                { className: "stat-label" },
                "Departments"
              ),

              React.createElement(
                "div",
                { className: "stat-number" },
                departments.length
              )
            ),

            React.createElement(
              "div",
              { className: "card" },

              React.createElement(
                "div",
                { className: "stat-label" },
                "Wards"
              ),

              React.createElement(
                "div",
                { className: "stat-number" },
                wards.length
              )
            ),

            React.createElement(
              "div",
              { className: "card" },

              React.createElement(
                "div",
                { className: "stat-label" },
                "Beds"
              ),

              React.createElement(
                "div",
                { className: "stat-number" },
                beds.length
              )
            )
          ),

          React.createElement(
            "div",
            { className: "card" },

            React.createElement(
              "div",
              { className: "section-title" },
              "Users"
            ),

            profiles.length === 0

              ? React.createElement(
                  "div",
                  { className: "empty" },
                  "No users found."
                )

              : React.createElement(
                  "div",
                  { className: "table-wrap" },

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
                          "Email"
                        ),

                        React.createElement(
                          "th",
                          null,
                          "Role"
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

                      profiles.map((user) =>
                        React.createElement(
                          "tr",
                          {
                            key: user.id
                          },

                          React.createElement(
                            "td",
                            null,
                            user.display_name || "—"
                          ),

                          React.createElement(
                            "td",
                            null,
                            user.email || "—"
                          ),

                          React.createElement(
                            "td",
                            null,
                            roleLabel(user.role)
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
                        )
                      )
                    )
                  )
                )
          ),

          React.createElement(
            "div",
            { className: "grid grid-2" },

            React.createElement(
              "div",
              { className: "card" },

              React.createElement(
                "div",
                { className: "section-title" },
                "Departments"
              ),

              departments.length === 0

                ? React.createElement(
                    "div",
                    { className: "empty" },
                    "No departments found."
                  )

                : departments.map((department) =>
                    React.createElement(
                      "div",
                      {
                        key: department.id,
                        className: "detail-box",
                        style: {
                          marginBottom: "8px"
                        }
                      },

                      React.createElement(
                        "div",
                        {
                          className: "row"
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
              { className: "card" },

              React.createElement(
                "div",
                { className: "section-title" },
                "Wards"
              ),

              wards.length === 0

                ? React.createElement(
                    "div",
                    { className: "empty" },
                    "No wards found."
                  )

                : wards.map((ward) =>
                    React.createElement(
                      "div",
                      {
                        key: ward.id,
                        className: "detail-box",
                        style: {
                          marginBottom: "8px"
                        }
                      },

                      React.createElement(
                        "div",
                        {
                          className: "row"
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
            { className: "card" },

            React.createElement(
              "div",
              { className: "section-title" },
              "Beds"
            ),

            beds.length === 0

              ? React.createElement(
                  "div",
                  { className: "empty" },
                  "No beds found."
                )

              : React.createElement(
                  "div",
                  { className: "table-wrap" },

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

                      beds.map((bed) =>
                        React.createElement(
                          "tr",
                          {
                            key: bed.id
                          },

                          React.createElement(
                            "td",
                            null,
                            bed.name || "—"
                          ),

                          React.createElement(
                            "td",
                            null,
                            bed.ward_id || "—"
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
