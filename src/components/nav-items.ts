import {
  LayoutDashboard,
  Users,
  CalendarClock,
  Settings,
  ShieldCheck,
  UserCog,
  Package,
  BarChart3,
  FileText,
  Wallet,
  Receipt,
  HeartPulse,
  IndianRupee,
  Clock,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import { canAccess, type SessionPayload, type PermissionModule } from "@/lib/types";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
} & (
  | { kind: "fixed"; roles: SessionPayload["role"][] }
  | { kind: "module"; module: PermissionModule }
);

export const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, kind: "fixed", roles: ["admin", "executive"] },
  { title: "SaaS Revenue Dashboard", href: "/admins?tab=dashboard", icon: BarChart3, kind: "fixed", roles: ["super_admin"] },
  { title: "Tenants & Admins", href: "/admins?tab=admins", icon: ShieldCheck, kind: "fixed", roles: ["super_admin"] },
  { title: "Tenant Health & Usage", href: "/admins?tab=health", icon: HeartPulse, kind: "fixed", roles: ["super_admin"] },
  { title: "Payment History", href: "/admins?tab=payments", icon: IndianRupee, kind: "fixed", roles: ["super_admin"] },
  { title: "Upcoming Expiries", href: "/admins?tab=expiring", icon: Clock, kind: "fixed", roles: ["super_admin"] },
  { title: "Customers", href: "/customers", icon: Users, kind: "module", module: "customers" },
  { title: "Appointments", href: "/appointments", icon: CalendarClock, kind: "module", module: "appointments" },
  { title: "Quotations", href: "/quotations", icon: FileText, kind: "module", module: "quotations" },
  { title: "Bills & Invoices", href: "/bills", icon: Receipt, kind: "module", module: "bills" },
  { title: "Products & Stock", href: "/products", icon: Package, kind: "module", module: "products" },
  { title: "SM Analytics", href: "/analytics", icon: BarChart3, kind: "module", module: "analytics" },
  { title: "Balance Sheet", href: "/balance-sheet", icon: Wallet, kind: "fixed", roles: ["admin"] },
  { title: "Team(Users)", href: "/team", icon: UserCog, kind: "fixed", roles: ["admin"] },
  { title: "Settings", href: "/settings", icon: Settings, kind: "fixed", roles: ["super_admin", "admin", "executive"] },
  { title: "Documentation", href: "/docs", icon: BookOpen, kind: "fixed", roles: ["super_admin", "admin", "executive"] },
];


/** Filters the nav for what this session can actually open — module items respect per-executive permission grants. */
export function navForSession(session: SessionPayload): NavItem[] {
  return navItems.filter((item) => {
    if (item.kind === "fixed") return item.roles.includes(session.role);
    return canAccess(session, item.module);
  });
}
