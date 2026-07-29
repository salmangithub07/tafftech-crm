import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSession, tenantOf, canAccess } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { logActivity } from "@/lib/activity";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccess(session, "appointments"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tenantId = tenantOf(session)!;
  const settings = await getSettings(tenantId);

  const todayStr = new Date().toISOString().split("T")[0];

  // Fetch today's pending appointments for this tenant
  const appointments = await query<any>(
    `SELECT ap.*, c.name AS customer_name, c.phone AS customer_phone, c.product AS customer_product
     FROM appointments ap
     LEFT JOIN customers c ON c.id = ap.customer_id
     WHERE ap.tenant_id = ? AND ap.appointment_date = ? AND ap.status = 'pending'
     ORDER BY ap.appointment_time ASC, ap.id ASC`,
    [tenantId, todayStr]
  );

  const reminders = appointments.map((ap) => {
    let msg = settings.whatsapp_reminder_template ||
      "Namaste {customer_name}! 🔔\nRemind karne ke liye text hai ki aapka appointment aaj {appointment_date} ko {appointment_time} baje scheduled hai.\nThank you! — {company_name}";

    msg = msg
      .replace(/\{customer_name\}/g, ap.customer_name || "Customer")
      .replace(/\{appointment_date\}/g, ap.appointment_date)
      .replace(/\{appointment_time\}/g, ap.appointment_time ? ap.appointment_time.slice(0, 5) : "Today")
      .replace(/\{product_name\}/g, ap.title || ap.customer_product || "Appointment")
      .replace(/\{company_name\}/g, settings.site_name || "Tafftech CRM");

    const cleanPhone = ap.customer_phone ? ap.customer_phone.replace(/[^0-9]/g, "") : "";
    const formattedPhone = cleanPhone
      ? cleanPhone.startsWith("91")
        ? cleanPhone
        : `91${cleanPhone}`
      : "";

    const waUrl = formattedPhone
      ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`
      : "";

    return {
      appointment_id: ap.id,
      customer_id: ap.customer_id,
      customer_name: ap.customer_name,
      customer_phone: ap.customer_phone,
      title: ap.title,
      appointment_date: ap.appointment_date,
      appointment_time: ap.appointment_time,
      message: msg,
      whatsapp_url: waUrl,
    };
  });

  let apiSuccessCount = 0;

  // Background Gateway integration if configured
  if (settings.whatsapp_api_provider === "ultramsg" && settings.whatsapp_instance_id && settings.whatsapp_api_key) {
    for (const item of reminders) {
      if (!item.customer_phone) continue;
      try {
        const cleanP = item.customer_phone.replace(/[^0-9]/g, "");
        const toPhone = cleanP.startsWith("91") ? cleanP : `91${cleanP}`;
        
        await fetch(`https://api.ultramsg.com/${settings.whatsapp_instance_id}/messages/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            token: settings.whatsapp_api_key,
            to: toPhone,
            body: item.message,
          }),
        });
        apiSuccessCount++;
      } catch (e) {
        console.error("UltraMsg WhatsApp dispatch error:", e);
      }
    }
  }

  if (reminders.length > 0) {
    logActivity({
      tenantId,
      actorId: session.id,
      actorName: session.name,
      action: `Triggered WhatsApp Reminders for ${reminders.length} appointments`,
      entityType: "appointment",
    });
  }

  return NextResponse.json({
    success: true,
    count: reminders.length,
    apiSentCount: apiSuccessCount,
    provider: settings.whatsapp_api_provider,
    reminders,
  });
}
