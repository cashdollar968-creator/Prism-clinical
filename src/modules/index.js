import cardiology from "./cardiology/index.js";
import privateIcu from "./private-icu/index.js";
import future from "./future/index.js";

export const MODULES = Object.freeze({
  cardiology,
  privateIcu,
  future,
});

export function getModule(moduleKey) {
  return MODULES[moduleKey] || null;
}

export function getAllModules() {
  return Object.values(MODULES);
}
