// Front-end only demo auth. Credentials ship in the JS bundle — never use this in production.

const USERS_KEY = "cb_registered_users";
const SESSION_KEY = "cb_session";

export const DEMO_ACCOUNTS = {
  candidate: { username: "yassine jahjah", password: "Yassine123", name: "Yassine Jahjah", role: "candidate" },
  admin: { username: "root", password: "R00t#CareerBridge!2026", name: "Administrator", role: "admin" },
  company: { username: "atlas", password: "Atlas@Hire2026", name: "Atlas Analytics", role: "company" },
};

export const HOME_BY_ROLE = {
  candidate: "/candidate/dashboard",
  company: "/company/dashboard",
  admin: "/admin/dashboard",
};

// Used when storage is blocked (private mode, disabled site data).
let memorySession = null;

// "local" survives restarts ("Remember me"); "session" lasts until the tab closes.
// Resolved inside try blocks because merely touching the storage globals can throw.
function storage(kind) {
  return kind === "session" ? sessionStorage : localStorage;
}

function readJSON(key, fallback, kind = "local") {
  try {
    const raw = storage(kind).getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value, kind = "local") {
  try {
    if (value === null) storage(kind).removeItem(key);
    else storage(kind).setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable: the session lives in memory only.
  }
}

function getRegisteredUsers() {
  return readJSON(USERS_KEY, []);
}

export function getSession() {
  return readJSON(SESSION_KEY, null) ?? readJSON(SESSION_KEY, memorySession, "session");
}

function saveSession(user, remember) {
  memorySession = { username: user.username, name: user.name, role: user.role };
  writeJSON(SESSION_KEY, memorySession, remember ? "local" : "session");
}

export function logout() {
  memorySession = null;
  writeJSON(SESSION_KEY, null);
  writeJSON(SESSION_KEY, null, "session");
}

// `identifier` is a username, or the email of a self-registered account.
export function login(identifier, password, remember = false) {
  const username = identifier.trim().toLowerCase();
  const { candidate, admin, company } = DEMO_ACCOUNTS;
  let user = null;

  if (username === candidate.username && password === candidate.password) {
    user = candidate;
  } else if (username === admin.username && password === admin.password) {
    user = admin;
  } else if (username === company.username && password === company.password) {
    user = company;
  } else {
    user =
      getRegisteredUsers().find(
        (u) => (u.username === username || u.email.toLowerCase() === username) && u.password === password,
      ) ?? null;
  }

  if (user) saveSession(user, remember);
  return user;
}

export function isUsernameTaken(username) {
  const name = username.trim().toLowerCase();
  const demoNames = Object.values(DEMO_ACCOUNTS).map((u) => u.username);
  return demoNames.includes(name) || getRegisteredUsers().some((u) => u.username === name);
}

// Only candidates and companies can self-register; the admin account is fixed.
export function register({ role, name, username, email, password }) {
  const user = { role, name: name.trim(), username: username.trim().toLowerCase(), email: email.trim(), password };
  writeJSON(USERS_KEY, [...getRegisteredUsers(), user]);
  return user;
}
