import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query, execute } from "@/lib/db";
import { getSession, PERMISSION_MODULES } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  password: z.string().min(6).optional().or(z.literal("")),
  permissions: z.array(z.enum(PERMISSION_MODULES)).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const existing = await query<{ id: number }>(
    "SELECT id FROM admins WHERE id = ? AND tenant_id = ? AND role = 'executive'",
    [id, session.id]
  );
  if (!existing.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  const d = parsed.data;

  if (d.name) await execute("UPDATE admins SET name = ? WHERE id = ?", [d.name, id]);
  if (d.status) await execute("UPDATE admins SET status = ? WHERE id = ?", [d.status, id]);
  if (d.permissions) {
    await execute("UPDATE admins SET permissions = ? WHERE id = ?", [JSON.stringify(d.permissions), id]);
  }
  if (d.password) {
    const hash = bcrypt.hashSync(d.password, 10);
    await execute("UPDATE admins SET password = ? WHERE id = ?", [hash, id]);
  }

  const member = await query(
    "SELECT id, name, email, role, status, permissions, created_at FROM admins WHERE id = ?",
    [id]
  );
  return NextResponse.json(member[0]);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const existing = await query<{ id: number }>(
    "SELECT id FROM admins WHERE id = ? AND tenant_id = ? AND role = 'executive'",
    [id, session.id]
  );
  if (!existing.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await execute("DELETE FROM admins WHERE id = ?", [id]);
  return NextResponse.json({ ok: true });
}
