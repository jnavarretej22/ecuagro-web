import type { Role } from "@prisma/client";

export const MIN_USERNAME_LENGTH = 3;
export const MAX_USERNAME_LENGTH = 64;
export const MIN_PASSWORD_LENGTH = 8;

const USERNAME_RE = /^[a-zA-Z0-9._-]+$/;

export function validateUsername(raw: string): string | null {
  const u = raw.trim();
  if (u.length < MIN_USERNAME_LENGTH) {
    return `El usuario debe tener al menos ${MIN_USERNAME_LENGTH} caracteres.`;
  }
  if (u.length > MAX_USERNAME_LENGTH) {
    return `El usuario no puede superar ${MAX_USERNAME_LENGTH} caracteres.`;
  }
  if (!USERNAME_RE.test(u)) {
    return "El usuario solo puede usar letras, números, punto, guion y guion bajo.";
  }
  return null;
}

export function validateNewPassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  return null;
}

export function parseRole(value: unknown): Role | null {
  if (value === "ADMIN" || value === "FIELD" || value === "REVIEWER") {
    return value;
  }
  return null;
}
