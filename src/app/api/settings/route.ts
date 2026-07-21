import { NextRequest, NextResponse } from "next/server";
import { getSession, tenantOf } from "@/lib/auth";
import { getSettings, setSetting } from "@/lib/settings";
import { z } from "zod";

const settingsSchema = z.object({
  site_name: z.string().min(1).optional(),
  accent_color: z
    .string()
    .regex(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/, "Invalid hex color")
    .optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const tenantId = tenantOf(session) ?? 0;
  return NextResponse.json(await getSettings(tenantId));
}

/**
 * Super Admin edits the global/default branding (tenant_id = 0).
 * Admin edits only their own tenant's override — completely isolated from
 * every other Admin, and from the global default.
 * Executives cannot change appearance.
 */
export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "executive") {
    return NextResponse.json(
      { error: "You do not have permission to change this setting." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid data" },
      { status: 400 }
    );
  }

  const tenantId = session.role === "super_admin" ? 0 : session.id;
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) await setSetting(key, value, tenantId);
  }
  return NextResponse.json(await getSettings(tenantId));
}
