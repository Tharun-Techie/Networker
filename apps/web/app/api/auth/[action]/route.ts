import { ApiError, toResponse } from "@/lib/api-error";
import { createToken, createUser, findUserByEmail, hashPassword, setSessionCookie, verifyPassword } from "@/lib/auth";
import { loginSchema, registerSchema, parseOr400 } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: { action: string } }) {
  try {
    if (params.action === "register") {
      const body = parseOr400(registerSchema, await req.json());
      const existing = await findUserByEmail(body.email);
      if (existing) throw new ApiError(409, "Email already registered");
      const user = await createUser(body.email, await hashPassword(body.password), body.role);
      return Response.json(user, { status: 201 });
    }
    if (params.action === "login") {
      const body = parseOr400(loginSchema, await req.json());
      const user = await findUserByEmail(body.email);
      if (!user || !(await verifyPassword(body.password, user.password_hash))) {
        throw new ApiError(401, "Invalid credentials");
      }
      await setSessionCookie(await createToken(user.id));
      return Response.json({ id: user.id, email: user.email, role: user.role });
    }
    throw new ApiError(404, "Unknown auth action");
  } catch (err) {
    return toResponse(err);
  }
}
