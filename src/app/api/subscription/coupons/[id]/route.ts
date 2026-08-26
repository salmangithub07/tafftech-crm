import { NextRequest, NextResponse } from "next/server";
import { queryOne, execute } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const resolvedParams = await params;
  const couponId = Number(resolvedParams.id);
  if (!couponId) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const body = await req.json();
    const {
      title,
      code,
      discount_percent,
      banner_text,
      applicable_plan,
      valid_till,
      is_active,
      show_on_landing_page,
    } = body;

    const cleanCode = code ? code.trim().toUpperCase() : "";

    // Check code uniqueness excluding current ID
    if (cleanCode) {
      const existing = await queryOne(
        "SELECT id FROM subscription_coupons WHERE UPPER(code) = UPPER(?) AND id != ?",
        [cleanCode, couponId]
      );
      if (existing) {
        return NextResponse.json({ error: `Coupon code '${cleanCode}' is used by another offer.` }, { status: 400 });
      }
    }

    await execute(
      `UPDATE subscription_coupons
       SET title = COALESCE(?, title),
           code = COALESCE(?, code),
           discount_percent = COALESCE(?, discount_percent),
           banner_text = ?,
           applicable_plan = COALESCE(?, applicable_plan),
           valid_till = ?,
           is_active = COALESCE(?, is_active),
           show_on_landing_page = COALESCE(?, show_on_landing_page),
           updated_at = NOW()
       WHERE id = ?`,
      [
        title ? title.trim() : null,
        cleanCode || null,
        discount_percent !== undefined ? Number(discount_percent) : null,
        banner_text !== undefined ? (banner_text ? banner_text.trim() : null) : null,
        applicable_plan || null,
        valid_till !== undefined ? (valid_till || null) : null,
        is_active !== undefined ? is_active : null,
        show_on_landing_page !== undefined ? show_on_landing_page : null,
        couponId,
      ]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Could not update coupon" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const resolvedParams = await params;
  const couponId = Number(resolvedParams.id);
  if (!couponId) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    await execute("DELETE FROM subscription_coupons WHERE id = ?", [couponId]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Could not delete coupon" }, { status: 500 });
  }
}
