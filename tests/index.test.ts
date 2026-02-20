import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AuthorityClient,
  AuthorityClientError,
  type AuthorizationRequest,
  type AuthorizationResponse,
} from "../src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function fixture<T>(name: string): T {
  const raw = readFileSync(join(__dirname, "fixtures", name), "utf-8");
  return JSON.parse(raw) as T;
}

describe("AuthorityClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls /v1/authorize and parses allow response fixture", async () => {
    const request = fixture<AuthorizationRequest>("authorize-request.json");
    const allowResponse = fixture<AuthorizationResponse>("authorize-response-allow.json");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(allowResponse), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
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
    const request = fixture<AuthorizationRequest>("authorize-request.json");
    const denyResponse = fixture<AuthorizationResponse>("authorize-response-deny.json");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(denyResponse), {
          status: 403,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const client = new AuthorityClient({ baseUrl: "http://127.0.0.1:8787" });
    const result = await client.authorize(request);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("missing_required_verification");
  });

  it("maps HTTP 400 to typed bad_request error", async () => {
    const request = fixture<AuthorizationRequest>("authorize-request.json");
    const badRequest = fixture<{ error: string }>("authorize-error-bad-request.json");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(badRequest), {
          status: 400,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const client = new AuthorityClient({ baseUrl: "http://127.0.0.1:8787" });
    await expect(client.authorize(request)).rejects.toMatchObject({
      code: "bad_request",
      status: 400,
      message: "principal is required",
    });
  });

  it("maps network failures to typed network_error", async () => {
    const request = fixture<AuthorizationRequest>("authorize-request.json");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED")));

    const client = new AuthorityClient({ baseUrl: "http://127.0.0.1:8787" });
    await expect(client.authorize(request)).rejects.toMatchObject({
      code: "network_error",
    });
  });

  it("maps abort errors to typed timeout", async () => {
    const request = fixture<AuthorizationRequest>("authorize-request.json");
    const abortError = Object.assign(new Error("aborted"), { name: "AbortError" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError));

    const client = new AuthorityClient({ baseUrl: "http://127.0.0.1:8787", timeoutMs: 1 });
    await expect(client.authorize(request)).rejects.toMatchObject({
      code: "timeout",
      message: "authorize request timed out",
    });
  });

  it("supports /authorize compatibility alias when configured", async () => {
    const request = fixture<AuthorizationRequest>("authorize-request.json");
    const allowResponse = fixture<AuthorizationResponse>("authorize-response-allow.json");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(allowResponse), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
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
});
