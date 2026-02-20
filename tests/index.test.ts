import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AUTHORIZATION_REASONS,
  AuthorityClient,
  type AuthorizationDecision,
  type AuthorizationResponse,
  type AuthorizeRequest,
  type MandateClaims,
  POLICY_EFFECTS,
  type SignedMandate,
  VERIFICATION_STATUSES,
  isAuthorizationDecision,
  isLabelPassed,
  isMandateClaims,
  isPolicyRule,
  isProofEvent,
  isSignedMandate,
  passedLabels,
  toSidecarAuthorizeRequest,
} from "../src/index.js";
import { fixtureParsed, jsonResponse } from "./utils/fixtures.js";

describe("AuthorityClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls /v1/authorize and parses allow response fixture", async () => {
    const request = fixtureParsed<AuthorizeRequest>("authorize-request.json");
    const allowResponse = fixtureParsed<AuthorizationResponse>("authorize-response-allow.json");
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(allowResponse, 200),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new AuthorityClient({ baseUrl: "http://127.0.0.1:8787/" });
    const result = await client.authorize(request);

    expect(result).toEqual(allowResponse);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8787/v1/authorize",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("returns deny payload on HTTP 403 decision response", async () => {
    const request = fixtureParsed<AuthorizeRequest>("authorize-request.json");
    const denyResponse = fixtureParsed<AuthorizationResponse>("authorize-response-deny.json");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(denyResponse, 403)),
    );

    const client = new AuthorityClient({ baseUrl: "http://127.0.0.1:8787" });
    const result = await client.authorize(request);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("missing_required_verification");
  });

  it("maps HTTP 400 to typed bad_request error", async () => {
    const request = fixtureParsed<AuthorizeRequest>("authorize-request.json");
    const badRequest = fixtureParsed<{ error: string }>("authorize-error-bad-request.json");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(badRequest, 400)),
    );

    const client = new AuthorityClient({ baseUrl: "http://127.0.0.1:8787" });
    await expect(client.authorize(request)).rejects.toMatchObject({
      code: "bad_request",
      status: 400,
      message: "principal is required",
    });
  });

  it("maps network failures to typed network_error", async () => {
    const request = fixtureParsed<AuthorizeRequest>("authorize-request.json");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED")));

    const client = new AuthorityClient({ baseUrl: "http://127.0.0.1:8787" });
    await expect(client.authorize(request)).rejects.toMatchObject({
      code: "network_error",
    });
  });

  it("maps abort errors to typed timeout", async () => {
    const request = fixtureParsed<AuthorizeRequest>("authorize-request.json");
    const abortError = Object.assign(new Error("aborted"), { name: "AbortError" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError));

    const client = new AuthorityClient({ baseUrl: "http://127.0.0.1:8787", timeoutMs: 1 });
    await expect(client.authorize(request)).rejects.toMatchObject({
      code: "timeout",
      message: "authorize request timed out",
    });
  });

  it("retries network errors and succeeds within retry budget", async () => {
    const request = fixtureParsed<AuthorizeRequest>("authorize-request.json");
    const allowResponse = fixtureParsed<AuthorizationResponse>("authorize-response-allow.json");
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("connect ECONNREFUSED"))
      .mockResolvedValueOnce(jsonResponse(allowResponse, 200));
    vi.stubGlobal("fetch", fetchMock);

    const client = new AuthorityClient({
      baseUrl: "http://127.0.0.1:8787",
      maxRetries: 1,
      backoffInitialMs: 0,
    });
    const result = await client.authorize(request);
    expect(result.allowed).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries on 5xx response and eventually succeeds", async () => {
    const request = fixtureParsed<AuthorizeRequest>("authorize-request.json");
    const allowResponse = fixtureParsed<AuthorizationResponse>("authorize-response-allow.json");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: "temporary" }, 503))
      .mockResolvedValueOnce(jsonResponse(allowResponse, 200));
    vi.stubGlobal("fetch", fetchMock);

    const client = new AuthorityClient({
      baseUrl: "http://127.0.0.1:8787",
      maxRetries: 1,
      backoffInitialMs: 0,
    });
    const result = await client.authorize(request);
    expect(result.allowed).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("supports /authorize compatibility alias when configured", async () => {
    const request = fixtureParsed<AuthorizeRequest>("authorize-request.json");
    const allowResponse = fixtureParsed<AuthorizationResponse>("authorize-response-allow.json");
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(allowResponse, 200),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new AuthorityClient({
      baseUrl: "http://127.0.0.1:8787",
      endpointPath: "/authorize",
    });
    await client.authorize(request);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8787/authorize",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("maps canonical ActionRequest to sidecar wire request", () => {
    const canonical: AuthorizeRequest = {
      principal: {
        principal_id: "agent:orders",
        tenant_id: "tenant-1",
      },
      action_spec: {
        action: "http.post",
        resource: "https://example.com/orders",
        intent: "create order",
      },
      state_evidence: {
        source: "browser",
        state_hash: "state_123",
      },
      verification_evidence: {
        signals: [
          { label: "verified:user_presence", status: "passed" },
          { label: "verified:captcha", status: "failed" },
        ],
      },
    };

    const wire = toSidecarAuthorizeRequest(canonical);
    expect(wire.principal).toBe("agent:orders");
    expect(wire.action).toBe("http.post");
    expect(wire.resource).toBe("https://example.com/orders");
    expect(wire.intent_hash).toBe("ih_create_order");
    expect(wire.labels).toEqual(["verified:user_presence"]);
    expect(wire.context).toMatchObject({
      state_source: "browser",
      state_hash: "state_123",
      tenant_id: "tenant-1",
    });
  });

  it("exposes enum constants aligned with python contract values", () => {
    expect(AUTHORIZATION_REASONS).toContain("allowed");
    expect(AUTHORIZATION_REASONS).toContain("missing_required_verification");
    expect(POLICY_EFFECTS).toEqual(["allow", "deny"]);
    expect(VERIFICATION_STATUSES).toEqual(["passed", "failed", "skipped"]);
  });

  it("validates PolicyRule and ProofEvent contract guards", () => {
    const rule = {
      name: "allow-orders",
      effect: "allow",
      principals: ["agent:orders"],
      actions: ["http.post"],
      resources: ["https://example.com/orders"],
      required_labels: ["verified:user_presence"],
      max_delegation_depth: 1,
    };
    const event = {
      event_type: "authorization_decision",
      principal_id: "agent:orders",
      action: "http.post",
      resource: "https://example.com/orders",
      reason: "allowed",
      allowed: true,
      mandate_id: "mdt_123",
      emitted_at_epoch_s: 1730072390,
    };

    expect(isPolicyRule(rule)).toBe(true);
    expect(isProofEvent(event)).toBe(true);
    expect(isPolicyRule({ ...rule, effect: "invalid" })).toBe(false);
    expect(isProofEvent({ ...event, emitted_at_epoch_s: "bad" })).toBe(false);
  });

  it("validates MandateClaims and SignedMandate fixtures", () => {
    const claims = fixtureParsed<MandateClaims>("mandate-claims.json");
    const signed = fixtureParsed<SignedMandate>("signed-mandate.json");
    expect(isMandateClaims(claims)).toBe(true);
    expect(isSignedMandate(signed)).toBe(true);
    expect(isMandateClaims({ ...claims, issued_at_epoch_s: "bad" })).toBe(false);
    expect(isSignedMandate({ ...signed, signature: null })).toBe(false);
  });

  it("validates full AuthorizationDecision fixture", () => {
    const decision = fixtureParsed<AuthorizationDecision>("authorization-decision.json");
    expect(isAuthorizationDecision(decision)).toBe(true);
    expect(isAuthorizationDecision({ ...decision, reason: 123 })).toBe(false);
    expect(isAuthorizationDecision({ ...decision, missing_labels: [1, 2] })).toBe(false);
  });

  it("mirrors python verification evidence label-pass semantics", () => {
    const evidence = {
      signals: [
        { label: "verified:user_presence", status: "passed" as const },
        { label: "verified:captcha", status: "failed" as const },
      ],
    };
    expect(isLabelPassed(evidence, "verified:user_presence")).toBe(true);
    expect(isLabelPassed(evidence, "verified:captcha")).toBe(false);
    expect(isLabelPassed(evidence, "unknown:label")).toBe(false);
    expect(isLabelPassed(undefined, "verified:user_presence")).toBe(false);
    expect(passedLabels(evidence)).toEqual(["verified:user_presence"]);
  });
});
