import { describe, expect, it } from "vitest";
import {
  DESKTOP_SCHEMA_VERSION,
  TERMINAL_SCHEMA_VERSION,
  buildFocusedPath,
  canonicalizeAccessibilityNode,
  canonicalizeDesktopSnapshot,
  canonicalizeTerminalSnapshot,
  computeDesktopStateHash,
  computeTerminalStateHash,
  hashEnvironment,
  isSecretKey,
  normalizeCommand,
  normalizePath,
  normalizeText,
  normalizeTimestamps,
  normalizeTranscript,
  sha256,
  stripAnsi,
} from "../src/index.js";

describe("canonicalization utilities", () => {
  describe("normalizeText", () => {
    it("trims and collapses whitespace", () => {
      expect(normalizeText("  Hello   World  ")).toBe("hello world");
    });

    it("lowercases text", () => {
      expect(normalizeText("HELLO")).toBe("hello");
    });

    it("caps length at maxLen", () => {
      const long = "a".repeat(100);
      expect(normalizeText(long, 80).length).toBe(80);
    });

    it("returns empty string for null/undefined", () => {
      expect(normalizeText(null)).toBe("");
      expect(normalizeText(undefined)).toBe("");
    });
  });

  describe("normalizeCommand", () => {
    it("trims and collapses whitespace but preserves case", () => {
      expect(normalizeCommand("  ls   -la  ")).toBe("ls -la");
      expect(normalizeCommand("  Git  Status  ")).toBe("Git Status");
    });

    it("returns empty string for null/undefined", () => {
      expect(normalizeCommand(null)).toBe("");
      expect(normalizeCommand(undefined)).toBe("");
    });
  });

  describe("stripAnsi", () => {
    it("removes color codes", () => {
      expect(stripAnsi("\x1b[31mRed\x1b[0m")).toBe("Red");
      expect(stripAnsi("\x1b[32mGreen\x1b[0m")).toBe("Green");
    });

    it("removes cursor movement codes", () => {
      expect(stripAnsi("\x1b[2JClear")).toBe("Clear");
    });

    it("leaves plain text unchanged", () => {
      expect(stripAnsi("Hello World")).toBe("Hello World");
    });
  });

  describe("normalizeTimestamps", () => {
    it("replaces ISO 8601 timestamps", () => {
      expect(normalizeTimestamps("2024-01-15T10:30:45.123Z")).toBe("[TIMESTAMP]");
      expect(normalizeTimestamps("2024-01-15 10:30:45")).toBe("[TIMESTAMP]");
    });

    it("replaces HH:MM:SS timestamps", () => {
      expect(normalizeTimestamps("Started at 10:30:45")).toBe("Started at [TIMESTAMP]");
    });

    it("replaces duration markers", () => {
      expect(normalizeTimestamps("Completed [1.23s]")).toBe("Completed [TIMESTAMP]");
    });
  });

  describe("normalizeTranscript", () => {
    it("strips ANSI and normalizes whitespace", () => {
      const raw = "\x1b[32mPASS\x1b[0m  test   suite";
      expect(normalizeTranscript(raw)).toBe("PASS test suite");
    });

    it("normalizes timestamps", () => {
      const raw = "Completed at 10:30:45";
      expect(normalizeTranscript(raw)).toBe("Completed at [TIMESTAMP]");
    });

    it("removes empty trailing lines", () => {
      const raw = "Line 1\nLine 2\n\n\n";
      expect(normalizeTranscript(raw)).toBe("Line 1\nLine 2");
    });

    it("returns empty string for null/undefined", () => {
      expect(normalizeTranscript(null)).toBe("");
      expect(normalizeTranscript(undefined)).toBe("");
    });

    it("caps length at 10KB", () => {
      const huge = "x".repeat(20 * 1024);
      expect(normalizeTranscript(huge).length).toBeLessThanOrEqual(10 * 1024);
    });
  });

  describe("normalizePath", () => {
    it("resolves . and .. components", () => {
      // Note: actual result depends on platform, but should be normalized
      const result = normalizePath("/foo/./bar/../baz");
      expect(result).not.toContain("/./");
      expect(result).not.toContain("/../");
    });

    it("returns empty string for null/undefined", () => {
      expect(normalizePath(null)).toBe("");
      expect(normalizePath(undefined)).toBe("");
    });
  });

  describe("isSecretKey", () => {
    it("detects cloud provider prefixes", () => {
      expect(isSecretKey("AWS_ACCESS_KEY_ID")).toBe(true);
      expect(isSecretKey("AZURE_CLIENT_SECRET")).toBe(true);
      expect(isSecretKey("GCP_SERVICE_ACCOUNT")).toBe(true);
      expect(isSecretKey("GOOGLE_APPLICATION_CREDENTIALS")).toBe(true);
    });

    it("detects common secret suffixes", () => {
      expect(isSecretKey("DATABASE_PASSWORD")).toBe(true);
      expect(isSecretKey("MY_SECRET")).toBe(true);
      expect(isSecretKey("AUTH_TOKEN")).toBe(true);
      expect(isSecretKey("PRIVATE_KEY")).toBe(true);
    });

    it("allows non-secret keys", () => {
      expect(isSecretKey("HOME")).toBe(false);
      expect(isSecretKey("PATH")).toBe(false);
      expect(isSecretKey("NODE_ENV")).toBe(false);
    });
  });

  describe("hashEnvironment", () => {
    it("returns consistent hash for same env", () => {
      const env = { HOME: "/home/user", PATH: "/usr/bin" };
      const hash1 = hashEnvironment(env);
      const hash2 = hashEnvironment(env);
      expect(hash1).toBe(hash2);
    });

    it("sorts keys for determinism", () => {
      const env1 = { B: "2", A: "1" };
      const env2 = { A: "1", B: "2" };
      expect(hashEnvironment(env1)).toBe(hashEnvironment(env2));
    });

    it("redacts secret values", () => {
      const withSecret = { AWS_ACCESS_KEY_ID: "secret123", HOME: "/home" };
      const withRedacted = { AWS_ACCESS_KEY_ID: "[REDACTED]", HOME: "/home" };
      expect(hashEnvironment(withSecret)).toBe(hashEnvironment(withRedacted));
    });

    it("returns hash for null/undefined", () => {
      expect(hashEnvironment(null)).toBe(sha256(""));
      expect(hashEnvironment(undefined)).toBe(sha256(""));
    });
  });

  describe("sha256", () => {
    it("produces consistent 64-char hex hash", () => {
      const hash = sha256("hello");
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("different inputs produce different hashes", () => {
      expect(sha256("hello")).not.toBe(sha256("world"));
    });
  });
});

describe("terminal canonicalization", () => {
  describe("canonicalizeTerminalSnapshot", () => {
    it("normalizes all fields", () => {
      const raw = {
        session_id: "sess-1",
        cwd: "/tmp/./foo/../bar",
        command: "  npm   test  ",
        transcript: "\x1b[32mOK\x1b[0m  All tests passed at 10:30:45",
      };

      const canonical = canonicalizeTerminalSnapshot(raw);

      expect(canonical.session_id).toBe("sess-1");
      expect(canonical.command_normalized).toBe("npm test");
      expect(canonical.transcript_normalized).toContain("OK");
      expect(canonical.transcript_normalized).toContain("[TIMESTAMP]");
      expect(canonical.transcript_normalized).not.toContain("\x1b");
    });
  });

  describe("computeTerminalStateHash", () => {
    it("produces sha256-prefixed hash", () => {
      const hash = computeTerminalStateHash({
        session_id: "sess-1",
        command: "npm test",
      });
      expect(hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    });

    it("equivalent inputs produce identical hashes", () => {
      const snap1 = {
        session_id: "sess-1",
        command: "  npm   test  ",
        transcript: "\x1b[32mOK\x1b[0m",
      };
      const snap2 = {
        session_id: "sess-1",
        command: "npm test",
        transcript: "OK",
      };
      expect(computeTerminalStateHash(snap1)).toBe(computeTerminalStateHash(snap2));
    });

    it("different inputs produce different hashes", () => {
      const snap1 = { session_id: "sess-1", command: "npm test" };
      const snap2 = { session_id: "sess-1", command: "npm build" };
      expect(computeTerminalStateHash(snap1)).not.toBe(computeTerminalStateHash(snap2));
    });
  });

  it("exports TERMINAL_SCHEMA_VERSION", () => {
    expect(TERMINAL_SCHEMA_VERSION).toBe("terminal:v1.0");
  });
});

describe("desktop canonicalization", () => {
  describe("canonicalizeAccessibilityNode", () => {
    it("normalizes role and name", () => {
      const node = canonicalizeAccessibilityNode({
        role: "BUTTON",
        name: "  Click Me  ",
        children: [],
      });
      expect(node.role).toBe("button");
      expect(node.name_norm).toBe("click me");
    });

    it("sorts children by role and name", () => {
      const node = canonicalizeAccessibilityNode({
        role: "group",
        children: [
          { role: "button", name: "B" },
          { role: "button", name: "A" },
          { role: "link", name: "C" },
        ],
      });
      expect(node.children[0].name_norm).toBe("a");
      expect(node.children[1].name_norm).toBe("b");
      expect(node.children[2].name_norm).toBe("c");
    });

    it("truncates at max depth (10)", () => {
      // Build a deeply nested tree using a recursive type for test
      interface TestNode {
        role: string;
        children: TestNode[];
      }
      const deepNode: TestNode = { role: "root", children: [] };
      let current: TestNode = deepNode;
      for (let i = 0; i < 15; i++) {
        const child: TestNode = { role: `level-${i}`, children: [] };
        current.children = [child];
        current = child;
      }
      current.children = [{ role: "leaf", children: [] }];

      // Use type assertion since TestNode is compatible with AccessibilityNode
      const canonical = canonicalizeAccessibilityNode(
        deepNode as unknown as Parameters<typeof canonicalizeAccessibilityNode>[0],
      );

      // Find the deepest non-empty level
      let depth = 0;
      let node = canonical;
      while (node.children.length > 0) {
        depth++;
        node = node.children[0];
      }
      expect(depth).toBeLessThanOrEqual(10);
    });
  });

  describe("buildFocusedPath", () => {
    it("builds path from role and name", () => {
      expect(buildFocusedPath("button", "Save")).toBe("button[save]");
    });

    it("handles missing name", () => {
      expect(buildFocusedPath("button")).toBe("button");
    });

    it("handles missing both", () => {
      expect(buildFocusedPath()).toBe("");
    });
  });

  describe("canonicalizeDesktopSnapshot", () => {
    it("normalizes all fields", () => {
      const raw = {
        app_name: "  Firefox  ",
        window_title: "  GitHub - Home  ",
        focused_role: "BUTTON",
        focused_name: "  Sign In  ",
      };

      const canonical = canonicalizeDesktopSnapshot(raw);

      expect(canonical.app_name_norm).toBe("firefox");
      expect(canonical.window_title_norm).toBe("github - home");
      expect(canonical.focused_path).toBe("button[sign in]");
    });
  });

  describe("computeDesktopStateHash", () => {
    it("produces sha256-prefixed hash", () => {
      const hash = computeDesktopStateHash({
        app_name: "Firefox",
        window_title: "GitHub",
      });
      expect(hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    });

    it("equivalent inputs produce identical hashes", () => {
      const snap1 = {
        app_name: "  Firefox  ",
        window_title: "  GitHub  ",
      };
      const snap2 = {
        app_name: "Firefox",
        window_title: "GitHub",
      };
      expect(computeDesktopStateHash(snap1)).toBe(computeDesktopStateHash(snap2));
    });
  });

  it("exports DESKTOP_SCHEMA_VERSION", () => {
    expect(DESKTOP_SCHEMA_VERSION).toBe("desktop:v1.0");
  });
});
