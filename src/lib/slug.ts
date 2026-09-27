/** Turns a location name into its public address, e.g. "Megaton Water Plant" → "megaton-water-plant". */
export function slugify(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
}

/** Top-level routes that a terminal slug may not shadow. */
export const RESERVED_SLUGS = new Set([
  "api",
  "logon",
  "login",
  "logoff",
  "logout",
  "register",
  "new",
  "admin",
  "settings",
  "about",
  "help",
  "robco",
  "static",
  "fonts",
  "favicon-ico",
]);

export const USERNAME_RE = /^[a-z0-9_]{3,24}$/;

export function normalizeUsername(u: string) {
  return u.trim().toLowerCase();
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(s: string | undefined | null): s is string {
  return !!s && UUID_RE.test(s);
}
