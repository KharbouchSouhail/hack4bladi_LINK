// Turns résumé text into a structured analysis. If VITE_CV_ANALYSIS_URL points at an AI analysis
// service (a server that holds the model API key and prompt), its output is used after schema validation.
// Otherwise, or when that service is slow, down or returns invalid data, the keyword analyser is used.
// No API key or prompt is ever shipped to the browser.
import { analyzeLocally, ANALYSIS_SCHEMA_VERSION, parseAnalysis } from "../domain/analysis.js";

export const AI_TIMEOUT_MS = 20000;

async function callService(url, text, skills, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schemaVersion: ANALYSIS_SCHEMA_VERSION, text, skills: skills.map((s) => ({ id: s.id, name: s.name })) }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Analysis service responded ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function runStructuredAnalysis(text, skills, { url = import.meta.env?.VITE_CV_ANALYSIS_URL, timeoutMs = AI_TIMEOUT_MS } = {}) {
  let fallbackReason = null;
  if (url) {
    try {
      const parsed = parseAnalysis(await callService(url, text, skills, timeoutMs), { skills, sourceText: text });
      if (parsed.ok) return { engine: "ai", value: parsed.value, fallbackReason };
      fallbackReason = "The AI service returned incomplete data.";
    } catch (error) {
      fallbackReason = error.name === "AbortError" ? "The AI service took too long to respond." : "The AI service is unavailable.";
    }
  }
  const parsed = parseAnalysis(analyzeLocally(text), { skills, sourceText: text });
  // The local analyser is ours; failing its own schema is a bug, not a user error.
  if (!parsed.ok) throw new Error(`Keyword analysis produced invalid output: ${parsed.errors.join(" ")}`);
  return { engine: "keyword", value: parsed.value, fallbackReason };
}
