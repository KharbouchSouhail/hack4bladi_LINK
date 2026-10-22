import { afterEach, describe, expect, it, vi } from "vitest";
import { runStructuredAnalysis } from "./analyzer.js";

const SKILLS = [{ id: "python", name: "Python" }];
const TEXT = "Projects\nBuilt a churn model in Python.";

afterEach(() => vi.unstubAllGlobals());

function stubFetch(impl) {
  vi.stubGlobal("fetch", vi.fn(impl));
}

describe("runStructuredAnalysis", () => {
  it("uses the keyword analyser when no AI service is configured", async () => {
    const result = await runStructuredAnalysis(TEXT, SKILLS, { url: "" });
    expect(result.engine).toBe("keyword");
    expect(result.fallbackReason).toBeNull();
    expect(result.value.skills.map((s) => s.skillId)).toEqual(["python"]);
  });

  it("uses valid AI output", async () => {
    stubFetch(async () => ({
      ok: true,
      json: async () => ({ skills: [{ skillId: "python", strength: "demonstrated", level: 2, quote: "Built a churn model in Python." }] }),
    }));
    const result = await runStructuredAnalysis(TEXT, SKILLS, { url: "https://ai.example/analyse" });
    expect(result.engine).toBe("ai");
    expect(result.value.skills[0].strength).toBe("demonstrated");
  });

  it("falls back when the AI output fails the schema", async () => {
    stubFetch(async () => ({ ok: true, json: async () => ({ skills: "python" }) }));
    const result = await runStructuredAnalysis(TEXT, SKILLS, { url: "https://ai.example/analyse" });
    expect(result.engine).toBe("keyword");
    expect(result.fallbackReason).toMatch(/incomplete/);
  });

  it("falls back when the AI service is down", async () => {
    stubFetch(async () => ({ ok: false, status: 503 }));
    const result = await runStructuredAnalysis(TEXT, SKILLS, { url: "https://ai.example/analyse" });
    expect(result.engine).toBe("keyword");
    expect(result.fallbackReason).toMatch(/unavailable/);
  });

  it("falls back when the AI service is too slow", async () => {
    stubFetch(
      (_url, { signal }) =>
        new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })))),
    );
    const result = await runStructuredAnalysis(TEXT, SKILLS, { url: "https://ai.example/analyse", timeoutMs: 20 });
    expect(result.engine).toBe("keyword");
    expect(result.fallbackReason).toMatch(/too long/);
  });
});
