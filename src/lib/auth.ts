import "server-only";

import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "seafood_session";
const SESSION_DAYS = 7;

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return "development-only-change-me";
  }
  return secret;
}

function sign(value: string) {
  return crypto.createHmac("sha256", getAuthSecret()).update(value).digest("hex");
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [scheme, salt, originalHash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !originalHash) {
    return false;
  }
  const hash = crypto.scryptSync(password, salt, 64);
  const original = Buffer.from(originalHash, "hex");
  return original.length === hash.length && crypto.timingSafeEqual(original, hash);
}

export async function createSession(userId: string) {
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${userId}.${expiresAt}`;
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt)
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function readSessionUserId() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) {
    return null;
  }
  const [userId, expiresAt, signature] = raw.split(".");
  if (!userId || !expiresAt || !signature) {
    return null;
  }
  const payload = `${userId}.${expiresAt}`;
  if (sign(payload) !== signature || Number(expiresAt) < Date.now()) {
    return null;
  }
  return userId;
}

export async function getCurrentUser() {
  const userId = await readSessionUserId();
  if (!userId) {
    return null;
  }
  return prisma.user.findFirst({
    where: { id: userId, status: "ACTIVE" },
    select: { id: true, name: true, email: true }
  });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
