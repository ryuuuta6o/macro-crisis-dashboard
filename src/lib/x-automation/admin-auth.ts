import crypto from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "x_automation_admin";

function signature(value: string) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return "";
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

export function createAdminToken() {
  const payload = `${Date.now() + 12 * 60 * 60 * 1000}`;
  return `${payload}.${signature(payload)}`;
}

export function verifyAdminToken(token?: string) {
  if (!token || !process.env.ADMIN_SECRET) return false;
  const [expires, received] = token.split(".");
  if (!expires || !received || Number(expires) < Date.now()) return false;
  const expected = signature(expires);
  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

export async function isAdminAuthenticated() {
  return verifyAdminToken((await cookies()).get(ADMIN_COOKIE)?.value);
}

export function verifyAdminPassword(password: string) {
  const expected = process.env.ADMIN_SECRET;
  if (!expected || password.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(password), Buffer.from(expected));
}

export function verifyCronRequest(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  return Boolean(secret && auth === `Bearer ${secret}`);
}

