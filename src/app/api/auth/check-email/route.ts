import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = (searchParams.get("email") || "").trim().toLowerCase();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { available: false, error: "Please enter a valid email address format." },
        { status: 400 }
      );
    }

    // Basic email regex test
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { available: false, error: "Invalid email format." },
        { status: 400 }
      );
    }

    // Check if email already exists in admins table
    const existing = await queryOne<{ id: number }>(
      "SELECT id FROM admins WHERE LOWER(email) = ? LIMIT 1",
      [email]
    );

    if (existing) {
      return NextResponse.json({
        available: false,
        message: "This email is already registered.",
      });
    }

    return NextResponse.json({
      available: true,
      message: "Username / Email is available.",
    });
  } catch (error) {
    console.error("Error checking email availability:", error);
    return NextResponse.json(
      { available: false, error: "Could not verify email availability at this moment." },
      { status: 500 }
    );
  }
}
