import { query, execute } from "@/lib/db";

export type AppSettings = {
  site_name: string;
  accent_color: string;
  radius: string;
};

const DEFAULTS: AppSettings = {
  site_name: "Nova CRM",
  accent_color: "#2563eb",
  radius: "0.65",
};

/**
 * Reads settings for a tenant, falling back to the global (tenant_id = 0,
 * Super Admin controlled) row for any key the tenant hasn't overridden yet.
 * Pass 0 (or omit) to read the global defaults directly.
 */
export async function getSettings(tenantId = 0): Promise<AppSettings> {
  try {
    const rows = await query<{ tenant_id: number; key: string; value: string }>(
      "SELECT tenant_id, key, value FROM settings WHERE tenant_id IN (0, ?)",
      [tenantId]
    );

    const globalMap: Record<string, string> = {};
    const tenantMap: Record<string, string> = {};
    for (const r of rows) {
      if (r.tenant_id === 0) globalMap[r.key] = r.value;
      else tenantMap[r.key] = r.value;
    }

    return {
      site_name: tenantMap.site_name ?? globalMap.site_name ?? DEFAULTS.site_name,
      accent_color: tenantMap.accent_color ?? globalMap.accent_color ?? DEFAULTS.accent_color,
      radius: tenantMap.radius ?? globalMap.radius ?? DEFAULTS.radius,
    };
  } catch {
    // DB unreachable (e.g. mid-deploy) — fall back to defaults instead of
    // crashing every page, since the root layout reads this on every request.
    return DEFAULTS;
  }
}

export async function setSetting(key: string, value: string, tenantId = 0) {
  await execute(
    "INSERT INTO settings (tenant_id, key, value) VALUES (?, ?, ?) ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value",
    [tenantId, key, value]
  );
}
