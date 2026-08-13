import { NextRequest, NextResponse } from "next/server";
import { verifySession, SESSION_COOKIE, type Role, type PermissionModule } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/register"];

/** Route prefix -> roles allowed to view it, no matter what. */
const ROLE_ONLY_RULES: { prefix: string; roles: Role[] }[] = [
  { prefix: "/admins", roles: ["super_admin"] },
  { prefix: "/team", roles: ["admin"] },
  { prefix: "/balance-sheet", roles: ["admin"] },
];

/** Route prefix -> tenant-scoped module. Admins always pass; Executives need the matching permission. */
const MODULE_RULES: { prefix: string; module: PermissionModule }[] = [
  { prefix: "/customers", module: "customers" },
  { prefix: "/appointments", module: "appointments" },
  { prefix: "/quotations", module: "quotations" },
  { prefix: "/products", module: "products" },
  { prefix: "/analytics", module: "analytics" },
];

function homeFor(role: Role) {
  return role === "super_admin" ? "/admins" : "/dashboard";
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!session && !isPublic && pathname !== "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  if (session && (pathname === "/login" || pathname === "/register")) {
    const url = req.nextUrl.clone();
    url.pathname = homeFor(session.role);
    return NextResponse.redirect(url);
  }

  if (session) {
    if (pathname.startsWith("/dashboard") && session.role === "super_admin") {
      const url = req.nextUrl.clone();
      url.pathname = "/admins";
      return NextResponse.redirect(url);
    }

    const roleRule = ROLE_ONLY_RULES.find((r) => pathname.startsWith(r.prefix));
    if (roleRule && !roleRule.roles.includes(session.role)) {
      const url = req.nextUrl.clone();
      url.pathname = homeFor(session.role);
      return NextResponse.redirect(url);
    }

    const moduleRule = MODULE_RULES.find((r) => pathname.startsWith(r.prefix));
    if (moduleRule) {
      if (session.role === "super_admin") {
        const url = req.nextUrl.clone();
        url.pathname = "/admins";
        return NextResponse.redirect(url);
      }
      if (session.role === "executive" && !session.permissions?.includes(moduleRule.module)) {
        const url = req.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
