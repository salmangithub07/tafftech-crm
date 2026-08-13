import Link from "next/link";
import { Users, CalendarClock, UserCheck, ArrowRight, FileText } from "lucide-react";
import { query, queryOne } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getSession, tenantOf } from "@/lib/auth";
import { format } from "date-fns";
import type { Customer, Appointment } from "@/lib/types";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

const statusVariant: Record<string, "default" | "secondary" | "success" | "warning" | "info" | "outline"> = {
  active: "success",
  lead: "warning",
  progress: "info",
  inactive: "secondary",
  pending: "default",
  completed: "success",
  cancelled: "secondary",
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;
  const tenantId = tenantOf(session);
  if (!tenantId) return null;

  const totalCustomers = (
    await queryOne<{ c: number }>(
      "SELECT COUNT(*) as c FROM customers WHERE tenant_id = ? AND COALESCE(is_trashed, 0) = 0",
      [tenantId]
    )
  )?.c ?? 0;
  const activeCustomers = (
    await queryOne<{ c: number }>(
      "SELECT COUNT(*) as c FROM customers WHERE tenant_id = ? AND status = 'active' AND COALESCE(is_trashed, 0) = 0",
      [tenantId]
    )
  )?.c ?? 0;
  const pendingAppointments = (
    await queryOne<{ c: number }>(
      "SELECT COUNT(*) as c FROM appointments WHERE tenant_id = ? AND status = 'pending' AND COALESCE(is_trashed, 0) = 0",
      [tenantId]
    )
  )?.c ?? 0;
  const pendingQuotations = (
    await queryOne<{ c: number }>(
      "SELECT COUNT(*) as c FROM quotations WHERE tenant_id = ? AND quotation_status = 'pending'",
      [tenantId]
    )
  )?.c ?? 0;

  const recentCustomers = await query<Customer>(
    "SELECT * FROM customers WHERE tenant_id = ? AND COALESCE(is_trashed, 0) = 0 ORDER BY created_at DESC LIMIT 5",
    [tenantId]
  );

  const upcoming = await query<Appointment>(
    `SELECT ap.*, c.name AS customer_name FROM appointments ap
     LEFT JOIN customers c ON c.id = ap.customer_id
     WHERE ap.tenant_id = ? AND ap.status = 'pending' AND COALESCE(ap.is_trashed, 0) = 0
     ORDER BY ap.appointment_date ASC LIMIT 5`,
    [tenantId]
  );

  const stats = [
    { title: "Total Customers", value: totalCustomers, icon: Users, hint: `${activeCustomers} active` },
    { title: "Active Customers", value: activeCustomers, icon: UserCheck, hint: "Currently engaged" },
    { title: "Pending Appointments", value: pendingAppointments, icon: CalendarClock, hint: "Follow-ups due" },
    { title: "Pending Quotations", value: pendingQuotations, icon: FileText, hint: "Awaiting response" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {session.name.split(" ")[0]}
        </h1>
        <p className="text-sm text-muted-foreground">
          Here is your CRM overview for today.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card
            key={s.title}
            className="group relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/5 p-4 shadow-2xs hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-300"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                  {s.title}
                </p>
                <p className="font-mono text-2xl font-extrabold tracking-tight text-foreground">
                  {s.value}
                </p>
                <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 truncate">
                  {s.hint}
                </p>
              </div>
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shadow-xs">
                <s.icon className="size-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-bold">Recent Customers</CardTitle>
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-primary hover:text-primary" asChild>
              <Link href="/customers">
                View all <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {recentCustomers.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No customers yet. Add one from the &quot;Customers&quot; page.
              </p>
            )}
            {recentCustomers.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5 hover:bg-muted/60 hover:border-border/80 transition-all duration-200 shadow-2xs"
              >
                <Avatar className="size-9 border border-primary/20">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                    {initials(c.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{c.name}</p>
                  <p className="truncate text-xs text-muted-foreground mt-0.5">
                    {c.product || c.email || "—"}
                  </p>
                </div>
                <Badge variant={statusVariant[c.status] ?? "outline"} className="capitalize text-xs font-semibold">
                  {c.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-bold">Upcoming Appointments</CardTitle>
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-primary hover:text-primary" asChild>
              <Link href="/appointments">
                View all <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {upcoming.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No upcoming appointments.
              </p>
            )}
            {upcoming.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5 hover:bg-muted/60 hover:border-border/80 transition-all duration-200 shadow-2xs"
              >
                <div className="flex size-10 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/20 shadow-2xs">
                  <span className="text-[10px] font-bold uppercase leading-none">
                    {format(new Date(a.appointment_date), "MMM")}
                  </span>
                  <span className="text-sm font-extrabold leading-none mt-0.5">
                    {format(new Date(a.appointment_date), "d")}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{a.title || a.customer_name}</p>
                  <p className="truncate text-xs text-muted-foreground mt-0.5">
                    {a.customer_name ?? "No customer"} {a.appointment_time ? `· ${a.appointment_time}` : ""}
                  </p>
                </div>
                <Badge variant={statusVariant[a.status] ?? "outline"} className="capitalize text-xs font-semibold">
                  {a.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
