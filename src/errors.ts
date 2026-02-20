export type AuthorityClientErrorCode =
  | "timeout"
  | "network_error"
  | "protocol_error"
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "server_error";

export class AuthorityClientError extends Error {
  readonly code: AuthorityClientErrorCode;
  readonly status?: number;
  readonly details?: unknown;

  constructor(
    message: string,
    options: {
      code: AuthorityClientErrorCode;
      status?: number;
      details?: unknown;
      cause?: unknown;
    },
  ) {
    super(message);
    this.name = "AuthorityClientError";
    this.code = options.code;
    this.status = options.status;
    this.details = options.details;
    if (options.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}
