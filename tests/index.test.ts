import { describe, expect, it } from "vitest";
import { AuthorityClient } from "../src/index.js";

describe("AuthorityClient scaffold", () => {
  it("builds with default v1 authorize endpoint", () => {
    const client = new AuthorityClient({ baseUrl: "http://127.0.0.1:8130" });
    expect(client).toBeDefined();
  });
});
