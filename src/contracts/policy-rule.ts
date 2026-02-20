import type { PolicyEffect } from "./enums.js";

export interface PolicyRule {
  name: string;
  effect: PolicyEffect;
  principals: string[];
  actions: string[];
  resources: string[];
  required_labels?: string[];
  max_delegation_depth?: number;
}

export function isPolicyRule(value: unknown): value is PolicyRule {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.name === "string" &&
    (obj.effect === "allow" || obj.effect === "deny") &&
    isStringArray(obj.principals) &&
    isStringArray(obj.actions) &&
    isStringArray(obj.resources) &&
    (obj.required_labels === undefined || isStringArray(obj.required_labels)) &&
    (obj.max_delegation_depth === undefined || typeof obj.max_delegation_depth === "number")
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}
