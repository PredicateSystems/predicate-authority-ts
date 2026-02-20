import { describe, expect, it } from "vitest";
import { AuthorityClient, type AuthorizationRequest } from "../src/index.js";

const sidecarBaseUrl = process.env.SIDECAR_BASE_URL;
const shouldRun = process.env.RUN_SIDECAR_INTEGRATION_TESTS === "true" && !!sidecarBaseUrl;

const maybeIt = shouldRun ? it : it.skip;

describe("AuthorityClient sidecar integration", () => {
  maybeIt("returns structured decision from running sidecar", async () => {
    const client = new AuthorityClient({ baseUrl: sidecarBaseUrl as string, timeoutMs: 4000 });
    const request: AuthorizationRequest = {
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
});
