"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Palette, Lock, FileText, Building, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

import { useAccentColor } from "@/components/accent-color-provider";
import { ACCENT_PRESETS } from "@/lib/colors";
import type { SessionPayload } from "@/lib/types";
import type { AppSettings, InvoiceTemplateType } from "@/lib/settings";
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
        {canEditAppearance && <TabsTrigger value="invoice">Invoice &amp; T&amp;C</TabsTrigger>}
      </TabsList>

      <TabsContent value="profile" className="mt-6">
        <ProfileTab session={session} />
      </TabsContent>
      {canEditAppearance && (
        <TabsContent value="appearance" className="mt-6">
          <AppearanceTab initialSiteName={initialSettings.site_name} />
        </TabsContent>
      )}
      {canEditAppearance && (
        <TabsContent value="invoice" className="mt-6">
          <InvoiceTab initialSettings={initialSettings} />
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
    <Card className="max-w-2xl">
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar className="size-16">
            <AvatarFallback className="text-xl">{initials(session.name)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>{session.name}</CardTitle>
            <CardDescription>{session.email}</CardDescription>
            <Badge variant="outline" className="mt-1 capitalize">
              {roleLabel[session.role] || session.role}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <form onSubmit={handleSave}>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={session.email} disabled className="bg-muted" />
            <p className="text-[11px] text-muted-foreground">Email cannot be changed.</p>
          </div>
          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <Lock className="size-4 text-muted-foreground" /> Change password
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="pass">New password</Label>
                <Input
                  id="pass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave blank to keep current"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="conf">Confirm password</Label>
                <Input
                  id="conf"
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
    <div className="flex flex-col gap-6 max-w-2xl">
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
            This changes the primary color across your entire tenant — applies to you and everyone on your team.
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

/* --------------------------- Invoice & T&C tab --------------------------- */

function InvoiceTab({ initialSettings }: { initialSettings: AppSettings }) {
  const router = useRouter();
  const [template, setTemplate] = React.useState<InvoiceTemplateType>(initialSettings.invoice_template || "modern");
  const [terms, setTerms] = React.useState(initialSettings.invoice_terms || "");
  const [bankDetails, setBankDetails] = React.useState(initialSettings.bank_details || "");
  const [saving, setSaving] = React.useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_template: template,
          invoice_terms: terms,
          bank_details: bankDetails,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Invoice settings & T&C saved successfully!");
      router.refresh();
    } catch {
      toast.error("Could not save invoice settings.");
    } finally {
      setSaving(false);
    }
  }

  const templatesList = [
    {
      id: "modern",
      name: "Modern Template",
      desc: "Clean layout with accent color title, rounded cards & right-aligned totals box.",
      badge: "Popular",
    },
    {
      id: "classic",
      name: "Classic Corporate",
      desc: "Formal navy/black top banner, crisp double borders & traditional serif fonts.",
      badge: "Formal",
    },
    {
      id: "minimal",
      name: "Minimalist Elegant",
      desc: "Monochrome elegance, thin dividers & generous clean whitespace.",
      badge: "Clean",
    },
    {
      id: "compact",
      name: "Compact / Receipt",
      desc: "Space-saving single-page layout optimized for thermal / small print jobs.",
      badge: "POS / Print",
    },
  ] as const;

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6 max-w-3xl">
      {/* Template Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" /> Invoice Template Layout
          </CardTitle>
          <CardDescription>
            Select your preferred default printable invoice design template.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {templatesList.map((tpl) => (
              <div
                key={tpl.id}
                onClick={() => setTemplate(tpl.id as InvoiceTemplateType)}
                className={cn(
                  "cursor-pointer rounded-lg border p-4 transition-all hover:border-primary/50 relative flex flex-col justify-between gap-3",
                  template === tpl.id
                    ? "border-2 border-primary bg-primary/5 ring-1 ring-primary/20 shadow-xs"
                    : "bg-card hover:bg-accent/40"
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm text-foreground">{tpl.name}</p>
                    <Badge variant="outline" className="text-[10px]">
                      {tpl.badge}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{tpl.desc}</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                  {template === tpl.id ? (
                    <>
                      <Check className="size-4" /> Selected Default
                    </>
                  ) : (
                    <span className="text-muted-foreground hover:text-foreground">Click to select</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bank & Payment Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="size-4" /> Bank Account &amp; Payment Details
          </CardTitle>
          <CardDescription>
            These payment details (Bank Name, Account Number, IFSC, UPI ID) will be printed at the bottom of every invoice.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <Label htmlFor="bankDetails">Bank &amp; Payment Details</Label>
            <Textarea
              id="bankDetails"
              rows={4}
              value={bankDetails}
              onChange={(e) => setBankDetails(e.target.value)}
              placeholder="Bank: HDFC Bank&#10;A/C No: 50200012345678&#10;IFSC Code: HDFC0001234&#10;UPI ID: merchant@upi"
              className="font-mono text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Terms & Conditions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-4" /> Terms &amp; Conditions (T&amp;C)
          </CardTitle>
          <CardDescription>
            Specify your standard business terms, return policies, and legal jurisdiction printed on invoices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <Label htmlFor="terms">Standard Terms &amp; Conditions</Label>
            <Textarea
              id="terms"
              rows={4}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="1. Goods once sold will not be taken back.&#10;2. Interest @18% p.a. will be charged if payment is delayed.&#10;3. Subject to local jurisdiction."
              className="text-xs"
            />
          </div>
        </CardContent>
        <CardFooter className="border-t">
          <Button type="submit" disabled={saving} className="ml-auto gap-1.5">
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save Invoice Settings
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
