// Server-only. Superadmin accounts live in MongoDB (`admins`, bcrypt passwords),
// created with `npm run admin:seed` / `npm run admin:password`.
// Cookies: ak_access (all pages), ak_refresh (only /api/admin/*).
// ADMIN_TOKEN_SECRET (env) signs access tokens. It is a server secret, not a credential.
import { createSessionAuth, requestMeta, BCRYPT_ROUNDS } from "./sessionAuth";

const auth = createSessionAuth({
  realm: "admin",
  accounts: "admins",
  sessions: "admin_sessions",
  ownerField: "adminId",
  accessCookie: "ak_access",
  refreshCookie: "ak_refresh",
  refreshPath: "/api/admin",
  secretEnv: "ADMIN_TOKEN_SECRET",
});

export const ACCESS_COOKIE = "ak_access";
export const REFRESH_COOKIE = auth.refreshCookie;
export { requestMeta, BCRYPT_ROUNDS };
export const { login, refresh, logout, sessionCookies, clearedCookies } = auth;
export const getAdminSession = auth.getSession;
