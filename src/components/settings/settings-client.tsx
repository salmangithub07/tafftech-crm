"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Palette, Lock } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

import { useAccentColor } from "@/components/accent-color-provider";
import { ACCENT_PRESETS } from "@/lib/colors";
import type { SessionPayload } from "@/lib/types";
import type { AppSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

const roleLabel: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  executive: "Executive",
};

export function SettingsClient({
  session,
  initialSettings,
}: {
  session: SessionPayload;
  initialSettings: AppSettings;
}) {
  const canEditAppearance = session.role === "super_admin" || session.role === "admin";

  const [defaultTab] = React.useState(() => {
    if (typeof window === "undefined") return "profile";
    return new URLSearchParams(window.location.search).get("tab") || "profile";
  });

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        {canEditAppearance && <TabsTrigger value="appearance">Appearance</TabsTrigger>}
      </TabsList>

      <TabsContent value="profile" className="mt-6">
        <ProfileTab session={session} />
      </TabsContent>
      {canEditAppearance && (
        <TabsContent value="appearance" className="mt-6">
          <AppearanceTab initialSiteName={initialSettings.site_name} />
        </TabsContent>
      )}
    </Tabs>
  );
}

/* ---------------------------- Profile tab ---------------------------- */

function ProfileTab({ session }: { session: SessionPayload }) {
  const router = useRouter();
  const [name, setName] = React.useState(session.name);
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (password && password !== confirmPassword) {
      toast.error("Password and confirm password do not match.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, ...(password ? { password } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update.");
      toast.success("Profile updated.");
      setPassword("");
      setConfirmPassword("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar className="size-14">
            <AvatarFallback className="text-lg">{initials(session.name)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>{session.name}</CardTitle>
            <CardDescription className="flex items-center gap-2">
              {session.email}
              <Badge variant="secondary">{roleLabel[session.role] ?? session.role}</Badge>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <form onSubmit={handleSave}>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={session.email} disabled />
            </div>
          </div>

          <div className="mt-2 border-t pt-4">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-medium">
              <Lock className="size-3.5" /> Change password
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Leave blank to keep unchanged"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t">
          <Button type="submit" disabled={saving} className="ml-auto">
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save changes
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

/* --------------------------- Appearance tab --------------------------- */

function AppearanceTab({ initialSiteName }: { initialSiteName: string }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { accentColor, setAccentColor, persistAccentColor } = useAccentColor();
  const [siteName, setSiteName] = React.useState(initialSiteName);
  const [customHex, setCustomHex] = React.useState(accentColor);
  const [savingColor, setSavingColor] = React.useState(false);
  const [savingSite, setSavingSite] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration flag to avoid SSR/CSR theme mismatch
  React.useEffect(() => setMounted(true), []);

  async function applyAndSave(hex: string) {
    setAccentColor(hex);
    setCustomHex(hex);
    setSavingColor(true);
    try {
      await persistAccentColor(hex);
      toast.success("Accent color updated.");
      router.refresh();
    } catch {
      toast.error("Could not save color.");
    } finally {
      setSavingColor(false);
    }
  }

  async function handleSiteNameSave(e: React.FormEvent) {
    e.preventDefault();
    setSavingSite(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_name: siteName }),
      });
      if (!res.ok) throw new Error();
      toast.success("Dashboard name updated.");
      router.refresh();
    } catch {
      toast.error("Could not save.");
    } finally {
      setSavingSite(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>Choose light or dark mode, or let it follow your system setting.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid max-w-md grid-cols-3 gap-3">
            {(["light", "dark", "system"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-lg border p-3 text-sm capitalize transition-colors hover:bg-accent",
                  mounted && theme === t && "border-primary bg-accent"
                )}
              >
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full border",
                    t === "light" && "bg-white",
                    t === "dark" && "bg-neutral-900",
                    t === "system" && "bg-linear-to-br from-white to-neutral-900"
                  )}
                >
                  {mounted && theme === t && <Check className="size-4 text-primary" />}
                </span>
                {t}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="size-4" /> Accent color
          </CardTitle>
          <CardDescription>
            This changes the primary color across your entire tenant — applies to you and everyone on your team. Other Admins are not affected.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3">
            {ACCENT_PRESETS.map((preset) => (
              <button
                key={preset.hex}
                type="button"
                title={preset.name}
                onClick={() => applyAndSave(preset.hex)}
                className={cn(
                  "flex size-10 items-center justify-center rounded-full border-2 transition-transform hover:scale-105",
                  accentColor.toLowerCase() === preset.hex.toLowerCase()
                    ? "border-foreground"
                    : "border-transparent"
                )}
                style={{ backgroundColor: preset.hex }}
              >
                {accentColor.toLowerCase() === preset.hex.toLowerCase() && (
                  <Check className="size-4 text-white drop-shadow" />
                )}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-3 border-t pt-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="customColor">Custom color</Label>
              <div className="flex items-center gap-2">
                <input
                  id="customColor"
                  type="color"
                  value={customHex}
                  onChange={(e) => setAccentColor(e.target.value)}
                  onBlur={() => setCustomHex(accentColor)}
                  className="size-9 cursor-pointer rounded-md border bg-transparent p-1"
                />
                <Input
                  value={customHex}
                  onChange={(e) => setCustomHex(e.target.value)}
                  className="w-32 font-mono"
                  placeholder="#2563eb"
                />
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => applyAndSave(customHex)}
              disabled={savingColor}
            >
              {savingColor && <Loader2 className="size-4 animate-spin" />}
              Apply &amp; save
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dashboard name</CardTitle>
          <CardDescription>The name shown in your sidebar — only visible to you and your team.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSiteNameSave}>
          <CardContent>
            <div className="flex flex-col gap-1.5 sm:max-w-xs">
              <Label htmlFor="siteName">Name</Label>
              <Input id="siteName" value={siteName} onChange={(e) => setSiteName(e.target.value)} />
            </div>
          </CardContent>
          <CardFooter className="border-t">
            <Button type="submit" disabled={savingSite} className="ml-auto">
              {savingSite && <Loader2 className="size-4 animate-spin" />}
              Save changes
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
