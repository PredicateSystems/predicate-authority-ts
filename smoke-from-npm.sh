#!/usr/bin/env bash
set -euo pipefail

PKG_NAME="${PKG_NAME:-@predicatesystems/authority}"
PKG_VERSION="${1:-latest}"
SIDECAR_BASE_URL="${SIDECAR_BASE_URL:-}"

WORKDIR="$(mktemp -d)"
cleanup() {
  rm -rf "$WORKDIR"
}
trap cleanup EXIT

echo "[smoke] working dir: $WORKDIR"
echo "[smoke] installing ${PKG_NAME}@${PKG_VERSION}"

cd "$WORKDIR"
npm init -y >/dev/null 2>&1
npm install "${PKG_NAME}@${PKG_VERSION}" >/dev/null

echo "[smoke] import + basic API shape check"
node --input-type=module <<'EOF'
import process from "node:process";

const mod = await import(process.env.PKG_NAME || "@predicatesystems/authority");
if (typeof mod.AuthorityClient !== "function") {
  throw new Error("AuthorityClient export missing");
}
if (typeof mod.toSidecarAuthorizeRequest !== "function") {
  throw new Error("toSidecarAuthorizeRequest export missing");
}
console.log("[smoke] package import check passed");
EOF

if [ -n "$SIDECAR_BASE_URL" ]; then
  echo "[smoke] running authorize check against $SIDECAR_BASE_URL"
  node --input-type=module <<'EOF'
import process from "node:process";

const mod = await import(process.env.PKG_NAME || "@predicatesystems/authority");
const client = new mod.AuthorityClient({
  baseUrl: process.env.SIDECAR_BASE_URL,
  timeoutMs: 5000,
});

const request = process.env.SIDECAR_SMOKE_REQUEST_JSON
  ? JSON.parse(process.env.SIDECAR_SMOKE_REQUEST_JSON)
  : {
      principal: "agent:smoke",
      action: "http.get",
      resource: "https://example.com",
      intent_hash: "ih_smoke",
      labels: [],
    };

const decision = await client.authorize(request);
if (typeof decision?.allowed !== "boolean" || typeof decision?.reason !== "string") {
  throw new Error("authorize response shape check failed");
}
console.log("[smoke] authorize check passed", decision);
EOF
else
  echo "[smoke] SIDECAR_BASE_URL not set, skipping live authorize check"
fi

echo "[smoke] done"
