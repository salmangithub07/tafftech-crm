import { redirect } from "next/navigation";
import { getSession, tenantOf } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { DashboardShell } from "@/components/dashboard-shell";
import { queryOne } from "@/lib/db";
import { ensureActivityTables } from "@/lib/activity";
import { getSubscriptionInfo } from "@/lib/subscription";
import { SubscriptionLockedScreen } from "@/components/subscription-locked-screen";
import { SubscriptionGraceBanner } from "@/components/subscription-grace-banner";
import type { Admin } from "@/lib/types";

import { ImpersonationBanner } from "@/components/impersonation-banner";
import { BroadcastAnnouncementBanner } from "@/components/broadcast-announcement-banner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const tenantId = tenantOf(session) ?? 0;
  const settings = await getSettings(tenantId);
  const superAdminSettings = await getSettings(0);
  const superAdminPhone = superAdminSettings.whatsapp_phone || superAdminSettings.company_phone || "+91 9876543210";

  let subInfo = null;
  let adminRow: Admin | null = null;

  if (session.role !== "super_admin" && tenantId) {
    await ensureActivityTables();
    try {
      adminRow = await queryOne<Admin>(
        "SELECT id, name, plan_type, plan_start_date, plan_expiry_date FROM admins WHERE id = ?",
        [tenantId]
      );
    } catch (err) {
      console.error("Failed to query admin subscription in layout:", err);
    }
    if (adminRow) {
      subInfo = getSubscriptionInfo(adminRow);
    }
  }

  if (subInfo?.status === "locked") {
    return (
      <SubscriptionLockedScreen
        planType={subInfo.planType}
        expiryDate={subInfo.formattedExpiry}
        adminName={adminRow?.name}
        companyPhone={superAdminPhone}
        yearlyPrice={superAdminSettings.yearly_plan_price}
        threeYearPrice={superAdminSettings.three_year_plan_price}
        bankUpiId={superAdminSettings.bank_upi_id}
        paymentQrCode={superAdminSettings.payment_qr_code}
      />
    );
  }

  const showWarningBanner =
    !!subInfo &&
    (subInfo.status === "grace" ||
      (subInfo.daysRemaining !== null && subInfo.daysRemaining <= 3));

  return (
    <div className="flex flex-col min-h-svh">
      {session.is_impersonating && (
        <ImpersonationBanner
          tenantName={session.name}
          tenantEmail={session.email}
          superAdminName={session.original_super_admin_name}
        />
      )}
      <DashboardShell session={session} siteName={settings.site_name}>
        <BroadcastAnnouncementBanner
          enabled={superAdminSettings.broadcast_announcement_enabled}
          message={superAdminSettings.broadcast_announcement_message}
          type={superAdminSettings.broadcast_announcement_type}
          targetPlan={superAdminSettings.broadcast_announcement_target_plan}
          currentPlanType={adminRow?.plan_type || "trial"}
        />
        {showWarningBanner && subInfo && (
          <SubscriptionGraceBanner
            expiryDate={subInfo.formattedExpiry}
            daysRemaining={subInfo.daysRemaining}
            graceDaysLeft={subInfo.graceDaysRemaining ?? 0}
            planType={subInfo.planType}
            companyPhone={superAdminPhone}
            yearlyPrice={superAdminSettings.yearly_plan_price}
            threeYearPrice={superAdminSettings.three_year_plan_price}
            bankUpiId={superAdminSettings.bank_upi_id}
            paymentQrCode={superAdminSettings.payment_qr_code}
          />
        )}
        {children}
      </DashboardShell>
    </div>
  );
}

