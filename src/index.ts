import { AuthorityClientError } from "./errors.js";
import {
  type AuthorizationRequest,
  type AuthorizationResponse,
  isAuthorizationResponse,
} from "./types.js";

export type {
  AuthorizationReason,
  AuthorizationRequest,
  AuthorizationResponse,
} from "./types.js";
export { AuthorityClientError, type AuthorityClientErrorCode } from "./errors.js";

export interface AuthorityClientOptions {
  baseUrl: string;
  timeoutMs?: number;
  endpointPath?: "/v1/authorize" | "/authorize";
}

export class AuthorityClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly endpointPath: "/v1/authorize" | "/authorize";

  constructor(options: AuthorityClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.timeoutMs = options.timeoutMs ?? 2000;
    this.endpointPath = options.endpointPath ?? "/v1/authorize";
  }

  async authorize(request: AuthorizationRequest): Promise<AuthorizationResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      let response: Response;
      try {
        response = await fetch(`${this.baseUrl}${this.endpointPath}`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(request),
          signal: controller.signal,
        });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw new AuthorityClientError("authorize request timed out", {
            code: "timeout",
            cause: error,
          });
        }
        throw new AuthorityClientError("authorize request failed before response", {
          code: "network_error",
          cause: error,
        });
      }

      const payload = await parseJsonSafely(response);

      // Sidecar deny decisions intentionally return HTTP 403 with decision body.
      if (response.status === 403 && isAuthorizationResponse(payload)) {
        return payload;
      }

      if (!response.ok) {
        throw mapHttpError(response.status, payload);
      }

      if (!isAuthorizationResponse(payload)) {
        throw new AuthorityClientError("invalid authorize response payload", {
          code: "protocol_error",
          status: response.status,
          details: payload,
        });
      }

      return payload;
    } finally {
      clearTimeout(timer);
    }
  }
}

async function parseJsonSafely(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.trim() === "") {
    return {};
  }
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new AuthorityClientError("non-JSON response from authority sidecar", {
      code: "protocol_error",
      status: response.status,
      details: text,
      cause: error,
    });
  }
}

function mapHttpError(status: number, payload: unknown): AuthorityClientError {
  const message = extractErrorMessage(payload) ?? `authorize_failed_${status}`;
  if (status === 400) {
    return new AuthorityClientError(message, { code: "bad_request", status, details: payload });
  }
  if (status === 401) {
    return new AuthorityClientError(message, { code: "unauthorized", status, details: payload });
  }
  if (status === 403) {
    return new AuthorityClientError(message, { code: "forbidden", status, details: payload });
  }
  if (status >= 500) {
    return new AuthorityClientError(message, { code: "server_error", status, details: payload });
  }
  return new AuthorityClientError(message, { code: "protocol_error", status, details: payload });
}

function extractErrorMessage(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }
  const obj = payload as Record<string, unknown>;
  if (typeof obj.error === "string" && obj.error.trim() !== "") {
    return obj.error;
  }
  if (typeof obj.detail === "string" && obj.detail.trim() !== "") {
    return obj.detail;
  }
  return null;
}
