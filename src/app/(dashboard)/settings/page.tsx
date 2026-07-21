import { getSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { SettingsClient } from "@/components/settings/settings-client";

export default async function SettingsPage() {
  const session = await getSession();
  const settings = await getSettings();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your profile and, if you have permission, your dashboard&apos;s appearance.
        </p>
      </div>

      <SettingsClient session={session!} initialSettings={settings} />
    </div>
  );
}
