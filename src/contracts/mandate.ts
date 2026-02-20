export interface MandateClaims {
  mandate_id: string;
  principal_id: string;
  action: string;
  resource: string;
  intent_hash: string;
  state_hash: string;
  issued_at_epoch_s: number;
  expires_at_epoch_s: number;
  delegated_by?: string | null;
  parent_mandate_id?: string | null;
  delegation_depth?: number;
  delegation_chain_hash?: string | null;
  iss?: string | null;
  aud?: string | null;
  sub?: string | null;
  iat?: number | null;
  exp?: number | null;
  nbf?: number | null;
  jti?: string | null;
}

export interface SignedMandate {
  token: string;
  claims: MandateClaims;
  signature: string;
}

export function isMandateClaims(value: unknown): value is MandateClaims {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.mandate_id === "string" &&
    typeof obj.principal_id === "string" &&
    typeof obj.action === "string" &&
    typeof obj.resource === "string" &&
    typeof obj.intent_hash === "string" &&
    typeof obj.state_hash === "string" &&
    typeof obj.issued_at_epoch_s === "number" &&
    typeof obj.expires_at_epoch_s === "number"
  );
}

export function isSignedMandate(value: unknown): value is SignedMandate {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.token === "string" &&
    typeof obj.signature === "string" &&
    isMandateClaims(obj.claims)
  );
}
