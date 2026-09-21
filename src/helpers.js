export function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString();
}

export function roleLabel(role) {
  const labels = {
    medical_officer: "Medical Officer",
    specialist: "Specialist",
    admin: "Administrator",
  };

  return labels[role] || role || "—";
}

export function stabilityClass(value) {
  switch (value) {
    case "stable":
      return "status-stable";

    case "improving":
      return "status-improving";

    case "deteriorating":
      return "status-deteriorating";

    case "unstable":
      return "status-unstable";

    default:
      return "";
  }
}
