import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, execute } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ensureActivityTables } from "@/lib/activity";

export async function GET(req: NextRequest) {
  await ensureActivityTables();

  const url = req.nextUrl;
  const validateCode = url.searchParams.get("validate")?.trim();
  const planType = url.searchParams.get("plan")?.trim() || "all";
  const isLanding = url.searchParams.get("landing") === "true";
  const activeOnly = url.searchParams.get("active_only") === "true";

  // Case 1: Coupon Code Validation for Upgrade Modal
  if (validateCode) {
    const coupon = await queryOne<{
      id: number;
      title: string;
      code: string;
      discount_percent: number;
      banner_text: string;
      applicable_plan: string;
      valid_till: string | null;
      is_active: boolean;
    }>(
      `SELECT * FROM subscription_coupons
       WHERE UPPER(code) = UPPER(?) AND is_active = true`,
      [validateCode]
    );

    if (!coupon) {
      return NextResponse.json({ valid: false, error: "Invalid or inactive coupon code." }, { status: 404 });
    }

    // Check expiry date
    if (coupon.valid_till) {
      const today = new Date().toISOString().split("T")[0];
      if (coupon.valid_till < today) {
        return NextResponse.json({ valid: false, error: "This coupon code has expired." }, { status: 400 });
      }
    }

    // Check plan restriction
    if (coupon.applicable_plan !== "all" && coupon.applicable_plan !== planType) {
      const planLabel = coupon.applicable_plan === "3_year" ? "3-Year Plan" : "1-Year Plan";
      return NextResponse.json({ valid: false, error: `This coupon is only applicable for ${planLabel}.` }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        title: coupon.title,
        code: coupon.code,
        discount_percent: Number(coupon.discount_percent),
        banner_text: coupon.banner_text,
        applicable_plan: coupon.applicable_plan,
      },
    });
  }

  // Case 2: Public Landing Page Active Offers
  if (isLanding) {
    const today = new Date().toISOString().split("T")[0];
    const offers = await query(
      `SELECT * FROM subscription_coupons
       WHERE is_active = true AND show_on_landing_page = true
         AND (valid_till IS NULL OR valid_till >= ?::date)
       ORDER BY discount_percent DESC, id DESC`,
      [today]
    );
    return NextResponse.json({ offers });
  }

  // Case 3: Super Admin List / Tenant List
  const session = await getSession();
  const isSuperAdmin = session?.role === "super_admin";

  let sql = "SELECT * FROM subscription_coupons";
  const params: unknown[] = [];

  if (!isSuperAdmin || activeOnly) {
    const today = new Date().toISOString().split("T")[0];
    sql += " WHERE is_active = true AND (valid_till IS NULL OR valid_till >= ?::date)";
    params.push(today);
  }

  sql += " ORDER BY id DESC";

  const coupons = await query(sql, params);
  return NextResponse.json({ coupons });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await ensureActivityTables();

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

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Offer title is required." }, { status: 400 });
    }

    const cleanCode = code ? code.trim().toUpperCase() : "";
    if (!cleanCode) {
      return NextResponse.json({ error: "Coupon code is required." }, { status: 400 });
    }

    const percent = Number(discount_percent);
    if (isNaN(percent) || percent < 1 || percent > 99) {
      return NextResponse.json({ error: "Discount percentage must be between 1% and 99%." }, { status: 400 });
    }

    // Check code uniqueness
    const existing = await queryOne(
      "SELECT id FROM subscription_coupons WHERE UPPER(code) = UPPER(?)",
      [cleanCode]
    );
    if (existing) {
      return NextResponse.json({ error: `Coupon code '${cleanCode}' already exists.` }, { status: 400 });
    }

    const res = await execute(
      `INSERT INTO subscription_coupons
        (title, code, discount_percent, banner_text, applicable_plan, valid_till, is_active, show_on_landing_page)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title.trim(),
        cleanCode,
        percent,
        banner_text ? banner_text.trim() : null,
        applicable_plan || "all",
        valid_till || null,
        is_active !== false,
        show_on_landing_page !== false,
      ]
    );

    return NextResponse.json({ success: true, id: res.insertId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Could not create coupon." }, { status: 500 });
  }
}
