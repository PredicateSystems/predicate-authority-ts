import { describe, expect, it } from "vitest";
import { runLocalWrapperDemo } from "../examples/local-wrapper-demo.js";

describe("local wrapper demo", () => {
  it("runs shell/file/http wrappers in local guard mode", async () => {
    const result = await runLocalWrapperDemo();
    expect(result).toEqual({
      shell: "shell:ok",
      fileRead: "file:read",
      fileWrite: "file:write",
      http: { ok: true },
    });
  });
});
