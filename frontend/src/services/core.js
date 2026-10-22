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

// `ref` links the notification to its records, e.g. { applicationId, interviewId }; `type` drives the icon.
export function notify(draft, to, text, link, { type = "info", ref = {} } = {}) {
  draft.notifications.unshift({ id: newId("n"), to, type, text, link, ref, at: new Date().toISOString(), read: false });
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

function currentInbox() {
  const session = getSession();
  if (!session) throw new AccessError("Sign in to see notifications.");
  return inboxFor(session);
}

// Only ever returns the signed-in user's own inbox. `limit` null returns everything.
export function getNotifications({ limit = 20 } = {}) {
  return request(() => {
    const to = currentInbox();
    const mine = getDb().notifications.filter((n) => n.to === to);
    return { items: limit ? mine.slice(0, limit) : mine, unread: mine.filter((n) => !n.read).length, total: mine.length };
  });
}

export function markNotificationRead(id) {
  return request(() => {
    const to = currentInbox();
    const item = getDb().notifications.find((n) => n.id === id);
    // Someone else's notification is reported as missing, so ids can't be probed.
    if (!item || item.to !== to) throw new NotFoundError("Notification");
    if (!item.read) mutate((draft) => (draft.notifications.find((n) => n.id === id).read = true));
  });
}

export function markNotificationsRead() {
  return request(() => {
    const to = currentInbox();
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
