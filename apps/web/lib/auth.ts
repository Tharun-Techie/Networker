import bcrypt from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { getPool } from "./pg";

const COOKIE = "networker_session";
const ALG = "HS256";

function secret(): Uint8Array {
  return new TextEncoder().encode(process.env.JWT_SECRET ?? "dev-secret-change-me");
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(sub: string): Promise<string> {
  const minutes = Number(process.env.JWT_EXPIRES_MINUTES ?? 60);
  return new SignJWT({ sub })
    .setProtectedHeader({ alg: ALG })
    .setExpirationTime(`${minutes}m`)
    .sign(secret());
}

export async function verifyToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: Number(process.env.JWT_EXPIRES_MINUTES ?? 60) * 60,
  });
}

export async function clearSessionCookie(): Promise<void> {
  cookies().delete(COOKIE);
}

export async function currentUserId(): Promise<string | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export interface DbUser {
  id: string;
  email: string;
  role: string;
}

export async function findUserByEmail(email: string): Promise<(DbUser & { password_hash: string }) | null> {
  const { rows } = await getPool().query(
    "SELECT id, email, password_hash, role FROM users WHERE email = $1",
    [email],
  );
  return (rows[0] as (DbUser & { password_hash: string }) | undefined) ?? null;
}

export async function createUser(email: string, passwordHash: string, role: string): Promise<DbUser> {
  const { rows } = await getPool().query(
    "INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role",
    [email, passwordHash, role],
  );
  return rows[0] as DbUser;
}
