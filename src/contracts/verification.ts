import type { VerificationEvidence } from "./action-request.js";

export function isLabelPassed(
  evidence: VerificationEvidence | undefined,
  label: string,
): boolean {
  if (!evidence?.signals || label.trim() === "") {
    return false;
  }
  return evidence.signals.some(
    (signal) => signal.label === label && signal.status === "passed",
  );
}

export function passedLabels(evidence: VerificationEvidence | undefined): string[] {
  if (!evidence?.signals) {
    return [];
  }
  return evidence.signals
    .filter((signal) => signal.status === "passed")
    .map((signal) => signal.label);
}
