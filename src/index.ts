import type { AuthorizationRequest, AuthorizationResponse } from "./types.js";

export type {
  AuthorizationReason,
  AuthorizationRequest,
  AuthorizationResponse,
} from "./types.js";

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
      const response = await fetch(`${this.baseUrl}${this.endpointPath}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      const payload = (await response.json()) as AuthorizationResponse | { error?: string };
      if (!response.ok) {
        const message = "error" in payload && payload.error ? payload.error : `authorize_failed_${response.status}`;
        throw new Error(message);
      }
      return payload as AuthorizationResponse;
    } finally {
      clearTimeout(timer);
    }
  }
}
