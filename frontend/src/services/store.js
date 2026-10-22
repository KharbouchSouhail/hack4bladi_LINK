// Demo persistence: the whole dataset lives in localStorage and syncs across tabs,
// so a candidate and a company can be demoed side by side. Replace with real API calls later.
import { createSeed } from "../data/seed.js";
import { DEFAULT_COMMISSION } from "../domain/recruitment.js";

const KEY = "link_demo_db_v1";
const listeners = new Set();
let db = null;
let version = 0;

// Brings a dataset saved by an older build up to the current shape, without touching existing records.
export function migrate(data) {
  data.analyses ??= [];
  // Recruitment workflow (interviews, offers, placements). The old single "interview" stage is now
  // "interview_scheduled"; applications and their history keep everything else as recorded.
  data.interviews ??= [];
  data.placements ??= [];
  data.settings ??= {};
  data.settings.commission ??= { ...DEFAULT_COMMISSION };
  for (const app of data.applications ?? []) {
    if (app.status === "interview") app.status = "interview_scheduled";
    for (const h of app.history ?? []) if (h.status === "interview") h.status = "interview_scheduled";
    app.offer ??= null;
  }
  return data;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch {
    // Unreadable or blocked storage: fall back to a fresh seed in memory.
  }
  return migrate(createSeed());
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    // Storage unavailable: changes last for this page view only.
  }
}

function emit() {
  version += 1;
  listeners.forEach((listener) => listener());
}

export function getDb() {
  if (!db) {
    db = load();
    persist();
  }
  return db;
}

// All writes go through here so every subscriber re-renders.
export function mutate(fn) {
  const draft = structuredClone(getDb());
  const result = fn(draft);
  db = draft;
  persist();
  emit();
  return result;
}

export function resetDb() {
  db = migrate(createSeed());
  persist();
  emit();
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getVersion() {
  return version;
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === KEY) {
      db = null;
      emit();
    }
  });
}

export function newId(prefix) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
