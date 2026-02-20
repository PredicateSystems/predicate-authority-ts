import type { AuthorizationReason } from "./enums.js";

export interface ProofEvent {
  event_type: string;
  principal_id: string;
  action: string;
  resource: string;
  reason: AuthorizationReason | string;
  allowed: boolean;
  mandate_id: string | null;
  emitted_at_epoch_s: number;
}

export function isProofEvent(value: unknown): value is ProofEvent {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.event_type === "string" &&
    typeof obj.principal_id === "string" &&
    typeof obj.action === "string" &&
    typeof obj.resource === "string" &&
    typeof obj.reason === "string" &&
    typeof obj.allowed === "boolean" &&
    (obj.mandate_id === null || typeof obj.mandate_id === "string") &&
    typeof obj.emitted_at_epoch_s === "number"
  );
}
