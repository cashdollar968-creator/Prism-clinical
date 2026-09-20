import React from "https://esm.sh/react@18.3.1";

export default function DetailBox({
  label,
  value
}) {
  return React.createElement(
    "div",
    { className: "detail-box" },

    React.createElement(
      "div",
      { className: "detail-label" },
      label
    ),

    React.createElement(
      "div",
      { className: "detail-value" },
      value || "—"
    )
  );
}
