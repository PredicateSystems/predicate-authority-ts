import { type ActionExecutionResult, type ActionGuard, AuthorizationDeniedError } from "../guard/action-guard.js";
import type { ActionRequest, AuthorizationDecision } from "../types.js";

export interface GuardedShellOptions<T> {
  guard: ActionGuard;
  request: ActionRequest;
  command: string;
  execute: (command: string) => Promise<T> | T;
  delegationDepth?: number;
}

export interface GuardedFileReadOptions<T> {
  guard: ActionGuard;
  request: ActionRequest;
  path: string;
  read: (path: string) => Promise<T> | T;
  delegationDepth?: number;
}

export interface GuardedFileWriteOptions<T> {
  guard: ActionGuard;
  request: ActionRequest;
  path: string;
  contents: string;
  write: (path: string, contents: string) => Promise<T> | T;
  delegationDepth?: number;
}

export interface GuardedHttpOptions<T> {
  guard: ActionGuard;
  request: ActionRequest;
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  send: (request: {
    url: string;
    method: string;
    headers?: Record<string, string>;
    body?: string;
  }) => Promise<T> | T;
  delegationDepth?: number;
}

function requireAllow(decision: AuthorizationDecision): void {
  if (!decision.allowed) {
    throw new AuthorizationDeniedError(decision);
  }
}

export async function guardedShell<T>(options: GuardedShellOptions<T>): Promise<ActionExecutionResult<T>> {
  const decision = options.guard.authorize(options.request, options.delegationDepth ?? 0);
  requireAllow(decision);
  const value = await options.execute(options.command);
  return {
    value,
    decision,
    mandate: decision.mandate ?? null,
  };
}

export async function guardedFileRead<T>(
  options: GuardedFileReadOptions<T>,
): Promise<ActionExecutionResult<T>> {
  const decision = options.guard.authorize(options.request, options.delegationDepth ?? 0);
  requireAllow(decision);
  const value = await options.read(options.path);
  return {
    value,
    decision,
    mandate: decision.mandate ?? null,
  };
}

export async function guardedFileWrite<T>(
  options: GuardedFileWriteOptions<T>,
): Promise<ActionExecutionResult<T>> {
  const decision = options.guard.authorize(options.request, options.delegationDepth ?? 0);
  requireAllow(decision);
  const value = await options.write(options.path, options.contents);
  return {
    value,
    decision,
    mandate: decision.mandate ?? null,
  };
}

export async function guardedHttp<T>(options: GuardedHttpOptions<T>): Promise<ActionExecutionResult<T>> {
  const decision = options.guard.authorize(options.request, options.delegationDepth ?? 0);
  requireAllow(decision);
  const value = await options.send({
    url: options.url,
    method: options.method ?? "GET",
    headers: options.headers,
    body: options.body,
  });
  return {
    value,
    decision,
    mandate: decision.mandate ?? null,
  };
}
