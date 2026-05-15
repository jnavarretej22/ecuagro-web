import type { Role } from "@prisma/client";
import { SignJWT, jwtVerify } from "jose";
import {
  getSessionSecretBytesOrNull,
  SESSION_SECRET_MIN_LENGTH,
} from "./session-env";

export async function createSessionToken(
  userId: string,
  role: Role,
): Promise<string> {
  const key = getSessionSecretBytesOrNull();
  if (!key) {
    throw new Error(
      `SESSION_SECRET debe estar definida y tener al menos ${SESSION_SECRET_MIN_LENGTH} caracteres.`,
    );
  }
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

export type VerifiedSession = { userId: string; role: Role };

export async function verifySessionToken(
  token: string,
): Promise<VerifiedSession | null> {
  const key = getSessionSecretBytesOrNull();
  if (!key) return null;
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });
    const userId = payload.sub;
    const role = payload.role as Role | undefined;
    if (!userId || !role) return null;
    if (role !== "ADMIN" && role !== "FIELD" && role !== "REVIEWER") {
      return null;
    }
    return { userId, role };
  } catch {
    return null;
  }
}
