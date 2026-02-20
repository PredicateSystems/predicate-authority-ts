import { describe, expect, it } from "vitest";
import type { AuthorizationDecision, MandateClaims } from "../src/index.js";
import { fixtureParsed, fixtureRaw, stableStringify } from "./utils/fixtures.js";

describe("contract fixture serialization", () => {
  it("keeps MandateClaims fixture serialization deterministic", () => {
    const raw = fixtureRaw("mandate-claims.json");
    const parsed = fixtureParsed<MandateClaims>("mandate-claims.json");
    expect(stableStringify(parsed)).toBe(stableStringify(JSON.parse(raw)));
  });

  it("keeps AuthorizationDecision fixture serialization deterministic", () => {
    const raw = fixtureRaw("authorization-decision.json");
    const parsed = fixtureParsed<AuthorizationDecision>("authorization-decision.json");
    expect(stableStringify(parsed)).toBe(stableStringify(JSON.parse(raw)));
  });
});
