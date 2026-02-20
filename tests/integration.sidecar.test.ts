import { describe, expect, it } from "vitest";
import { AuthorityClient, type SidecarAuthorizeRequest } from "../src/index.js";

const sidecarBaseUrl = process.env.SIDECAR_BASE_URL;
const shouldRun = process.env.RUN_SIDECAR_INTEGRATION_TESTS === "true" && !!sidecarBaseUrl;
const allowRequestJson = process.env.SIDECAR_ALLOW_REQUEST_JSON;
const denyRequestJson = process.env.SIDECAR_DENY_REQUEST_JSON;
const expectedDenyReason = process.env.SIDECAR_EXPECTED_DENY_REASON;
const requireMandateOnAllow = process.env.SIDECAR_REQUIRE_MANDATE_ON_ALLOW === "true";

const maybeIt = shouldRun ? it : it.skip;

describe("AuthorityClient sidecar integration", () => {
  maybeIt("returns structured decision from running sidecar", async () => {
    const client = new AuthorityClient({ baseUrl: sidecarBaseUrl as string, timeoutMs: 4000 });
    const request: SidecarAuthorizeRequest = {
      principal: "agent:test",
      action: "http.get",
      resource: "https://example.com",
      intent_hash: "integration-intent-hash",
      labels: [],
    };

    const result = await client.authorize(request);
    expect(typeof result.allowed).toBe("boolean");
    expect(typeof result.reason).toBe("string");
    expect(Array.isArray(result.missing_labels)).toBe(true);
  });

  maybeIt("supports explicit allow path when request fixture is provided", async () => {
    if (!allowRequestJson) {
      return;
    }
    const client = new AuthorityClient({ baseUrl: sidecarBaseUrl as string, timeoutMs: 4000 });
    const request = JSON.parse(allowRequestJson) as SidecarAuthorizeRequest;
    const result = await client.authorize(request);
    expect(result.allowed).toBe(true);
    if (requireMandateOnAllow) {
      expect(typeof result.mandate_id).toBe("string");
      expect(result.mandate_id?.length).toBeGreaterThan(0);
    }
  });

  maybeIt("supports explicit deny path with reason checks when fixture is provided", async () => {
    if (!denyRequestJson) {
      return;
    }
    const client = new AuthorityClient({ baseUrl: sidecarBaseUrl as string, timeoutMs: 4000 });
    const request = JSON.parse(denyRequestJson) as SidecarAuthorizeRequest;
    const result = await client.authorize(request);
    expect(result.allowed).toBe(false);
    expect(typeof result.reason).toBe("string");
    if (expectedDenyReason) {
      expect(result.reason).toBe(expectedDenyReason);
    }
  });
});
