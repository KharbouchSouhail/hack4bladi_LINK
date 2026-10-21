// Front-end only demo auth. Credentials ship in the JS bundle — never use this in production.

const USERS_KEY = "cb_registered_users";
const SESSION_KEY = "cb_session";

export const DEMO_ACCOUNTS = {
  candidate: { username: "yassine jahjah", password: "Yassine123", name: "Yassine Jahjah", role: "candidate" },
  admin: { username: "root", password: "R00t#CareerBridge!2026", name: "Administrator", role: "admin" },
  company: { username: "atlas", password: "Atlas@Hire2026", name: "Atlas Analytics", role: "company" },
};

export const HOME_BY_ROLE = {
  candidate: "/candidate",
  company: "/company",
  admin: "/admin",
};

// Used when storage is blocked (private mode, disabled site data).
let memorySession = null;

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable: the session lives in memory only.
  }
}

function getRegisteredUsers() {
  return readJSON(USERS_KEY, []);
}

export function getSession() {
  return readJSON(SESSION_KEY, memorySession);
}

function saveSession(user) {
  memorySession = { username: user.username, name: user.name, role: user.role };
  writeJSON(SESSION_KEY, memorySession);
}

export function logout() {
  memorySession = null;
  writeJSON(SESSION_KEY, null);
}

export function login(username, password) {
  const name = username.trim().toLowerCase();
  const { candidate, admin, company } = DEMO_ACCOUNTS;
  let user = null;

  if (name === candidate.username && password === candidate.password) {
    user = candidate;
  } else if (name === admin.username && password === admin.password) {
    user = admin;
  } else if (name === company.username && password === company.password) {
    user = company;
  } else {
    user = getRegisteredUsers().find((u) => u.username === name && u.password === password) ?? null;
  }

  if (user) saveSession(user);
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
