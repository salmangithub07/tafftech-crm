import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { execute, query } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  password: z.string().min(6).optional().or(z.literal("")),
});

/** Self-service profile update — any signed-in role can update their own name/password. */
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

  await execute("UPDATE admins SET name = ? WHERE id = ?", [d.name, session.id]);
  if (d.password) {
    const hash = bcrypt.hashSync(d.password, 10);
    await execute("UPDATE admins SET password = ? WHERE id = ?", [hash, session.id]);
  }

  const updated = await query(
    "SELECT id, name, email, role FROM admins WHERE id = ?",
    [session.id]
  );
  return NextResponse.json(updated[0]);
}
