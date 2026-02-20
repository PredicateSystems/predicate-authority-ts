import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthorityClient, type AuthorizeRequest } from "../src/index.js";
import { fixtureParsed } from "./utils/fixtures.js";

describe("Sidecar compatibility drift behavior", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fails closed with protocol_error when 200 payload shape drifts", async () => {
    const request = fixtureParsed<AuthorizeRequest>("authorize-request.json");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ verdict: "allow" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const client = new AuthorityClient({ baseUrl: "http://127.0.0.1:8787" });
    await expect(client.authorize(request)).rejects.toMatchObject({
      code: "protocol_error",
      message: "invalid authorize response payload",
    });
  });

  it("fails closed with protocol_error when sidecar returns non-JSON payload", async () => {
    const request = fixtureParsed<AuthorizeRequest>("authorize-request.json");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("html gateway error page", {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
      ),
    );

    const client = new AuthorityClient({ baseUrl: "http://127.0.0.1:8787" });
    await expect(client.authorize(request)).rejects.toMatchObject({
      code: "protocol_error",
      message: "non-JSON response from authority sidecar",
    });
  });

  it("maps malformed 403 deny payload to typed forbidden error", async () => {
    const request = fixtureParsed<AuthorizeRequest>("authorize-request.json");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "legacy deny payload" }), {
          status: 403,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const client = new AuthorityClient({ baseUrl: "http://127.0.0.1:8787" });
    await expect(client.authorize(request)).rejects.toMatchObject({
      code: "forbidden",
      status: 403,
      message: "legacy deny payload",
    });
  });

  it("maps unknown non-success status to protocol_error", async () => {
    const request = fixtureParsed<AuthorizeRequest>("authorize-request.json");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "teapot" }), {
          status: 418,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const client = new AuthorityClient({ baseUrl: "http://127.0.0.1:8787" });
    await expect(client.authorize(request)).rejects.toMatchObject({
      code: "protocol_error",
      status: 418,
      message: "teapot",
    });
  });
});
