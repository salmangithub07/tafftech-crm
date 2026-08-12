import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { execute, query, queryOne } from "@/lib/db";
import { getSession, signSession, SESSION_COOKIE } from "@/lib/auth";
import { z } from "zod";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
});

/** Self-service profile update — any signed-in role can update their own name, email & password. */
export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid data" },
      { status: 400 }
    );
  }
  const d = parsed.data;
  const targetEmail = d.email.trim().toLowerCase();

  // Check if new email is already in use by another admin/user
  const existing = await queryOne<{ id: number }>(
    "SELECT id FROM admins WHERE LOWER(email) = ? AND id != ?",
    [targetEmail, session.id]
  );
  if (existing) {
    return NextResponse.json(
      { error: "This email address is already in use by another account." },
      { status: 400 }
    );
  }

  await execute("UPDATE admins SET name = ?, email = ? WHERE id = ?", [d.name, targetEmail, session.id]);

  if (d.password) {
    const hash = bcrypt.hashSync(d.password, 10);
    await execute("UPDATE admins SET password = ? WHERE id = ?", [hash, session.id]);
  }

  const updatedAdmin = await queryOne<{ id: number; name: string; email: string; role: string }>(
    "SELECT id, name, email, role FROM admins WHERE id = ?",
    [session.id]
  );

  // Update session JWT payload and cookie
  const updatedSession = {
    ...session,
    name: d.name,
    email: targetEmail,
  };
  const token = await signSession(updatedSession);

  const res = NextResponse.json(updatedAdmin);
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}
