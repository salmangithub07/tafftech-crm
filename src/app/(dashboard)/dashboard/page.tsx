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

const statusVariant: Record<string, "default" | "secondary" | "success" | "warning" | "outline"> = {
  active: "success",
  lead: "warning",
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
    await queryOne<{ c: number }>("SELECT COUNT(*) as c FROM customers WHERE tenant_id = ?", [tenantId])
  )?.c ?? 0;
  const activeCustomers = (
    await queryOne<{ c: number }>(
      "SELECT COUNT(*) as c FROM customers WHERE tenant_id = ? AND status = 'active'",
      [tenantId]
    )
  )?.c ?? 0;
  const pendingAppointments = (
    await queryOne<{ c: number }>(
      "SELECT COUNT(*) as c FROM appointments WHERE tenant_id = ? AND status = 'pending'",
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
    "SELECT * FROM customers WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 5",
    [tenantId]
  );

  const upcoming = await query<Appointment>(
    `SELECT ap.*, c.name AS customer_name FROM appointments ap
     LEFT JOIN customers c ON c.id = ap.customer_id
     WHERE ap.tenant_id = ? AND ap.status = 'pending'
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

      <div className="grid grid-cols-2 gap-md-4 gap-2 sm:grid-cols-2 lg:grid-cols-4">
  {stats.map((s) => (
    <Card
      key={s.title}
      className="rounded-2xl rounded-xl border shadow-sm"
    >
      <CardContent className="flex items-center gap-5 p-md-6 p-3 mobileCards">
        {/* Icon */}
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
          <s.icon className="h-7 w-7 text-white" />
        </div>

        {/* Text */}
        <div>
          <h2 className="text-2xl font-bold leading-none">
            {s.value}
          </h2>

          <p className="mt-1 text-base text-slate-500">
            {s.title}
          </p>
        </div>
      </CardContent>
    </Card>
  ))}
</div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Customers</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/customers">
                View all <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {recentCustomers.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No customers yet. Add one from the &quot;Customers&quot; page.
              </p>
            )}
            {recentCustomers.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent">
                <Avatar>
                  <AvatarFallback>{initials(c.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.product || c.email || "—"}
                  </p>
                </div>
                <Badge variant={statusVariant[c.status] ?? "outline"} className="capitalize">
                  {c.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming Appointments</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/appointments">
                View all <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {upcoming.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No upcoming appointments.
              </p>
            )}
            {upcoming.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent">
                <div className="flex size-10 shrink-0 flex-col items-center justify-center rounded-md bg-primary/10 text-primary">
                  <span className="text-[10px] font-medium uppercase leading-none">
                    {format(new Date(a.appointment_date), "MMM")}
                  </span>
                  <span className="text-sm font-bold leading-none">
                    {format(new Date(a.appointment_date), "d")}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.title || a.customer_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {a.customer_name ?? "No customer"} {a.appointment_time ? `· ${a.appointment_time}` : ""}
                  </p>
                </div>
                <Badge variant={statusVariant[a.status] ?? "outline"} className="capitalize">
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
