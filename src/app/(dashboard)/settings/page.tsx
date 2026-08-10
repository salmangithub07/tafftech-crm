import { getSession, tenantOf } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { SettingsClient } from "@/components/settings/settings-client";
import { queryOne } from "@/lib/db";
import { getSubscriptionInfo } from "@/lib/subscription";
import type { Admin } from "@/lib/types";

export default async function SettingsPage() {
  const session = await getSession();
  const tenantId = session?.role === "super_admin" ? 0 : (session ? tenantOf(session) ?? 0 : 0);
  const settings = await getSettings(tenantId);

  let subInfo = null;
  if (session && session.role !== "super_admin" && tenantId) {
    try {
      const adminRow = await queryOne<Admin>(
        "SELECT id, name, plan_type, plan_start_date, plan_expiry_date FROM admins WHERE id = ?",
        [tenantId]
      );
      if (adminRow) {
        subInfo = getSubscriptionInfo(adminRow);
      }
    } catch {
      subInfo = null;
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your profile and, if you have permission, your dashboard&apos;s appearance.
        </p>
      </div>

      <SettingsClient session={session!} initialSettings={settings} subscriptionInfo={subInfo} />
    </div>
  );
}
