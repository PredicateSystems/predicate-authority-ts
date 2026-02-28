import { describe, expect, it } from "vitest";
import {
  type MandateDetails,
  Verifier,
  type VerifyRequest,
  actionsMatch,
  isMandateDetails,
  normalizeResource,
  resourcesMatch,
} from "../src/index.js";

describe("verification comparators", () => {
  describe("normalizeResource", () => {
    it("normalizes filesystem paths", () => {
      // Multiple slashes
      expect(normalizeResource("/src//index.ts")).toBe("/src/index.ts");

      // Trailing slash
      expect(normalizeResource("/src/")).toBe("/src");

      // Dot segments
      expect(normalizeResource("/src/./index.ts")).toBe("/src/index.ts");
    });

    it("normalizes URL-like resources", () => {
      expect(normalizeResource("https://api.example.com//users")).toBe(
        "https://api.example.com/users",
      );
      expect(normalizeResource("https://api.example.com/users/")).toBe(
        "https://api.example.com/users",
      );
    });

    it("preserves URL protocol", () => {
      expect(normalizeResource("https://api.example.com/path")).toBe(
        "https://api.example.com/path",
      );
    });
  });

  describe("resourcesMatch", () => {
    it("matches identical resources", () => {
      expect(resourcesMatch("/src/index.ts", "/src/index.ts")).toBe(true);
    });

    it("matches after normalization", () => {
      expect(resourcesMatch("/src//index.ts", "/src/index.ts")).toBe(true);
      expect(resourcesMatch("/src/index.ts", "/src//index.ts")).toBe(true);
    });

    it("supports glob patterns in authorized resource", () => {
      expect(resourcesMatch("/src/*.ts", "/src/index.ts")).toBe(true);
      expect(resourcesMatch("/src/**/*.ts", "/src/utils/helpers.ts")).toBe(true);
      expect(resourcesMatch("/src/*.ts", "/src/index.js")).toBe(false);
    });

    it("rejects mismatched resources", () => {
      expect(resourcesMatch("/src/index.ts", "/src/main.ts")).toBe(false);
      expect(resourcesMatch("/src/index.ts", "/lib/index.ts")).toBe(false);
    });

    it("can disable glob matching", () => {
      expect(resourcesMatch("/src/*.ts", "/src/index.ts", { allowGlob: false })).toBe(false);
    });
  });

  describe("actionsMatch", () => {
    it("matches identical actions", () => {
      expect(actionsMatch("fs.read", "fs.read")).toBe(true);
    });

    it("handles whitespace", () => {
      expect(actionsMatch("fs.read", " fs.read ")).toBe(true);
      expect(actionsMatch(" fs.read ", "fs.read")).toBe(true);
    });

    it("supports glob patterns", () => {
      expect(actionsMatch("fs.*", "fs.read")).toBe(true);
      expect(actionsMatch("fs.*", "fs.write")).toBe(true);
      expect(actionsMatch("http.*", "fs.read")).toBe(false);
    });

    it("is case-sensitive", () => {
      expect(actionsMatch("fs.read", "fs.READ")).toBe(false);
    });
  });
});

describe("isMandateDetails type guard", () => {
  it("accepts valid mandate details", () => {
    const mandate: MandateDetails = {
      mandate_id: "m_123",
      principal: "agent:claude",
      action: "fs.read",
      resource: "/src/index.ts",
      intent_hash: "ih_test",
      issued_at: "2024-02-28T12:00:00Z",
      expires_at: "2024-02-28T12:15:00Z",
    };
    expect(isMandateDetails(mandate)).toBe(true);
  });

  it("rejects invalid objects", () => {
    expect(isMandateDetails(null)).toBe(false);
    expect(isMandateDetails(undefined)).toBe(false);
    expect(isMandateDetails({})).toBe(false);
    expect(isMandateDetails({ mandate_id: "m_123" })).toBe(false);
  });
});

describe("Verifier.verifyLocal", () => {
  const verifier = new Verifier({ baseUrl: "http://127.0.0.1:8787" });

  const baseMandate: MandateDetails = {
    mandate_id: "m_123",
    principal: "agent:claude",
    action: "fs.read",
    resource: "/src/index.ts",
    intent_hash: "ih_test",
    issued_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes from now
  };

  it("verifies matching operation", () => {
    const request: VerifyRequest = {
      mandateId: "m_123",
      actual: {
        action: "fs.read",
        resource: "/src/index.ts",
      },
    };

    const result = verifier.verifyLocal(baseMandate, request);
    expect(result.verified).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("detects action mismatch", () => {
    const request: VerifyRequest = {
      mandateId: "m_123",
      actual: {
        action: "fs.write", // Different action
        resource: "/src/index.ts",
      },
    };

    const result = verifier.verifyLocal(baseMandate, request);
    expect(result.verified).toBe(false);
    expect(result.reason).toBe("action_mismatch");
    expect(result.details?.authorized.action).toBe("fs.read");
    expect(result.details?.actual.action).toBe("fs.write");
  });

  it("detects resource mismatch", () => {
    const request: VerifyRequest = {
      mandateId: "m_123",
      actual: {
        action: "fs.read",
        resource: "/src/default.ts", // Different resource
      },
    };

    const result = verifier.verifyLocal(baseMandate, request);
    expect(result.verified).toBe(false);
    expect(result.reason).toBe("resource_mismatch");
    expect(result.details?.authorized.resource).toBe("/src/index.ts");
    expect(result.details?.actual.resource).toBe("/src/default.ts");
  });

  it("detects expired mandate", () => {
    const expiredMandate: MandateDetails = {
      ...baseMandate,
      expires_at: new Date(Date.now() - 1000).toISOString(), // 1 second ago
    };

    const request: VerifyRequest = {
      mandateId: "m_123",
      actual: {
        action: "fs.read",
        resource: "/src/index.ts",
      },
    };

    const result = verifier.verifyLocal(expiredMandate, request);
    expect(result.verified).toBe(false);
    expect(result.reason).toBe("mandate_expired");
  });

  it("supports glob patterns in mandate resource", () => {
    const globMandate: MandateDetails = {
      ...baseMandate,
      resource: "/src/*.ts",
    };

    const request: VerifyRequest = {
      mandateId: "m_123",
      actual: {
        action: "fs.read",
        resource: "/src/index.ts",
      },
    };

    const result = verifier.verifyLocal(globMandate, request);
    expect(result.verified).toBe(true);
  });

  it("supports glob patterns in mandate action", () => {
    const globMandate: MandateDetails = {
      ...baseMandate,
      action: "fs.*",
    };

    const request: VerifyRequest = {
      mandateId: "m_123",
      actual: {
        action: "fs.read",
        resource: "/src/index.ts",
      },
    };

    const result = verifier.verifyLocal(globMandate, request);
    expect(result.verified).toBe(true);
  });
});

describe("verification edge cases", () => {
  const verifier = new Verifier({ baseUrl: "http://127.0.0.1:8787" });

  it("handles path traversal attempts", () => {
    const mandate: MandateDetails = {
      mandate_id: "m_123",
      principal: "agent:claude",
      action: "fs.read",
      resource: "/src/index.ts",
      intent_hash: "ih_test",
      issued_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };

    // Attempt to read a different file via path traversal
    const request: VerifyRequest = {
      mandateId: "m_123",
      actual: {
        action: "fs.read",
        resource: "/src/../etc/passwd",
      },
    };

    const result = verifier.verifyLocal(mandate, request);
    expect(result.verified).toBe(false);
    expect(result.reason).toBe("resource_mismatch");
  });

  it("handles content hash in actual operation", () => {
    const mandate: MandateDetails = {
      mandate_id: "m_123",
      principal: "agent:claude",
      action: "fs.read",
      resource: "/src/index.ts",
      intent_hash: "ih_test",
      issued_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };

    const request: VerifyRequest = {
      mandateId: "m_123",
      actual: {
        action: "fs.read",
        resource: "/src/index.ts",
        contentHash: "sha256:abc123...",
        executedAt: new Date().toISOString(),
      },
    };

    const result = verifier.verifyLocal(mandate, request);
    expect(result.verified).toBe(true);
  });
});
