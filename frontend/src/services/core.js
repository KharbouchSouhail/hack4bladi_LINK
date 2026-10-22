// Helpers shared by the role APIs: simulated latency, session checks and common lookups.
import { getSession } from "../auth/auth.js";
import { AccessError, NotFoundError, ValidationError } from "./errors.js";
import { getDb, mutate, newId, resetDb } from "./store.js";

const LATENCY_MS = 150;

// Every API call is async so swapping in fetch() later doesn't change the callers.
export function request(fn) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(fn());
      } catch (error) {
        reject(error);
      }
    }, LATENCY_MS);
  });
}

export function requireRole(role) {
  const session = getSession();
  if (!session || session.role !== role) throw new AccessError("You don't have access to this area.");
  return session;
}

export function findOr404(list, id, what) {
  const item = list.find((x) => x.id === id);
  if (!item) throw new NotFoundError(what);
  return item;
}

export function validate(errors) {
  const found = Object.fromEntries(Object.entries(errors).filter(([, message]) => message));
  if (Object.keys(found).length) throw new ValidationError(found);
}

export function logActivity(draft, text) {
  draft.activity.unshift({ id: newId("act"), at: new Date().toISOString(), text });
  draft.activity.length = Math.min(draft.activity.length, 50);
}

export function notify(draft, to, text, link) {
  draft.notifications.unshift({ id: newId("n"), to, text, link, at: new Date().toISOString(), read: false });
}

export function lookups(db = getDb()) {
  const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x]));
  return {
    skills: byId(db.skills),
    companies: byId(db.companies),
    profiles: byId(db.profiles),
    jobs: byId(db.jobs),
    candidates: byId(db.candidates),
    tests: byId(db.tests),
  };
}

// Notifications are addressed to "role:recordId"; admins share one inbox.
export function inboxFor(session, db = getDb()) {
  if (session.role === "candidate") return `candidate:${db.candidates.find((c) => c.username === session.username)?.id}`;
  if (session.role === "company") return `company:${db.companies.find((c) => c.ownerUsername === session.username)?.id}`;
  return "admin";
}

export function getNotifications() {
  return request(() => {
    const session = getSession();
    if (!session) throw new AccessError("Sign in to see notifications.");
    const to = inboxFor(session);
    return getDb().notifications.filter((n) => n.to === to).slice(0, 20);
  });
}

export function markNotificationsRead() {
  return request(() => {
    const session = getSession();
    if (!session) throw new AccessError("Sign in to see notifications.");
    const to = inboxFor(session);
    mutate((draft) => draft.notifications.forEach((n) => n.to === to && (n.read = true)));
  });
}

// Demo control: restores the seeded dataset for every role.
export function resetDemoData() {
  return request(() => {
    if (!getSession()) throw new AccessError("Sign in to reset the demo.");
    resetDb();
  });
}

export { getDb, mutate, newId };
