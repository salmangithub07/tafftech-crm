"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Check,
  Palette,
  Lock,
  FileText,
  Building,
  Sparkles,
  Phone,
  Shield,
  MessageSquare,
  Send,
  HelpCircle,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useAccentColor } from "@/components/accent-color-provider";
import { ACCENT_PRESETS } from "@/lib/colors";
import type { SessionPayload } from "@/lib/types";
import type { AppSettings, InvoiceTemplateType, WhatsAppProviderType } from "@/lib/settings";
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
        {canEditAppearance && <TabsTrigger value="invoice">Invoice &amp; Bank</TabsTrigger>}
        {canEditAppearance && <TabsTrigger value="whatsapp">WhatsApp Gateway</TabsTrigger>}
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
      {canEditAppearance && (
        <TabsContent value="whatsapp" className="mt-6">
          <WhatsAppTab initialSettings={initialSettings} />
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
    } catch (err: any) {
      toast.error(err.message || "Could not update profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <Card>
        <CardHeader className="flex flex-row items-center gap-4 py-4">
          <Avatar className="size-14">
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
              {initials(session.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-lg">{session.name}</p>
              <Badge variant="secondary" className="capitalize text-xs">
                {roleLabel[session.role] ?? session.role}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{session.email}</p>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
          <CardDescription>Update your display name and login password.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSave}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={session.email} disabled className="bg-muted" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Display Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div className="flex flex-col gap-1.5 pt-2 border-t">
              <Label htmlFor="pass">New Password (leave blank to keep current)</Label>
              <Input
                id="pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {password && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="conf">Confirm New Password</Label>
                <Input
                  id="conf"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t">
            <Button type="submit" disabled={saving} className="ml-auto">
              {saving && <Loader2 className="size-4 animate-spin" />}
              Save Profile
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

/* ---------------------------- Appearance tab ---------------------------- */

function AppearanceTab({ initialSiteName }: { initialSiteName: string }) {
  const router = useRouter();
  const { setTheme, theme } = useTheme();
  const { accentColor, setAccentColor, persistAccentColor } = useAccentColor();
  const [siteName, setSiteName] = React.useState(initialSiteName);
  const [customHex, setCustomHex] = React.useState(accentColor);
  const [savingSite, setSavingSite] = React.useState(false);
  const [savingColor, setSavingColor] = React.useState(false);

  React.useEffect(() => {
    setCustomHex(accentColor);
  }, [accentColor]);

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
      toast.success("Site name updated.");
      router.refresh();
    } catch {
      toast.error("Could not update site name.");
    } finally {
      setSavingSite(false);
    }
  }

  async function applyAndSave(hex: string) {
    setAccentColor(hex);
    setSavingColor(true);
    try {
      await persistAccentColor(hex);
      toast.success("Accent color updated for your tenant.");
    } catch {
      toast.error("Could not save accent color.");
    } finally {
      setSavingColor(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Theme mode</CardTitle>
          <CardDescription>Choose how Nova CRM looks to you on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 max-w-sm">
            {(["light", "dark", "system"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg border-2 p-3 text-xs capitalize transition-all hover:bg-accent",
                  theme === t ? "border-primary bg-primary/5 font-semibold text-primary" : "border-transparent"
                )}
              >
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
            This changes the primary color across your entire tenant.
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
          <CardDescription>The name shown in your sidebar.</CardDescription>
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
  const [bankName, setBankName] = React.useState(initialSettings.bank_name || "");
  const [bankAcc, setBankAcc] = React.useState(initialSettings.bank_account_no || "");
  const [bankIfsc, setBankIfsc] = React.useState(initialSettings.bank_ifsc || "");
  const [bankUpi, setBankUpi] = React.useState(initialSettings.bank_upi_id || "");
  const [privacyPolicy, setPrivacyPolicy] = React.useState(initialSettings.privacy_policy || "");
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
          bank_name: bankName,
          bank_account_no: bankAcc,
          bank_ifsc: bankIfsc,
          bank_upi_id: bankUpi,
          privacy_policy: privacyPolicy,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Tenant Bank Details, T&C & Privacy Policy saved successfully!");
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="size-4 text-primary" /> Bank Account &amp; Payment Details (Tenant-Wise)
          </CardTitle>
          <CardDescription>
            Individual structured fields for your tenant bank account, IFSC code, and UPI ID printed on every invoice.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Axis Bank / HDFC Bank"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bankAcc">Account Number (A/C No)</Label>
              <Input
                id="bankAcc"
                value={bankAcc}
                onChange={(e) => setBankAcc(e.target.value)}
                placeholder="50200000000000"
                className="font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="bankIfsc">IFSC Code</Label>
              <Input
                id="bankIfsc"
                value={bankIfsc}
                onChange={(e) => setBankIfsc(e.target.value)}
                placeholder="ICIC0001234"
                className="font-mono uppercase"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bankUpi">UPI ID / VPA</Label>
              <Input
                id="bankUpi"
                value={bankUpi}
                onChange={(e) => setBankUpi(e.target.value)}
                placeholder="merchant@upi"
                className="font-mono"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-4 text-primary" /> Terms &amp; Conditions (T&amp;C)
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
              rows={3}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="1. Goods once sold will not be taken back.&#10;2. Interest @18% p.a. will be charged if payment is delayed.&#10;3. Subject to local jurisdiction."
              className="text-xs"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-4 text-primary" /> Privacy Policy &amp; Invoice Policy Note
          </CardTitle>
          <CardDescription>
            Separate dynamic policy statement printed on your tenant invoices and customer billing portals.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <Label htmlFor="privacyPolicy">Tenant Privacy &amp; Invoice Policy</Label>
            <Textarea
              id="privacyPolicy"
              rows={3}
              value={privacyPolicy}
              onChange={(e) => setPrivacyPolicy(e.target.value)}
              placeholder="We value your privacy. All customer data and transaction history are protected under our privacy guidelines."
              className="text-xs"
            />
          </div>
        </CardContent>
        <CardFooter className="border-t">
          <Button type="submit" disabled={saving} className="ml-auto gap-1.5">
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save Tenant Invoice Settings
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

/* --------------------------- WhatsApp Gateway & Reminders Tab --------------------------- */

function WhatsAppTab({ initialSettings }: { initialSettings: AppSettings }) {
  const router = useRouter();
  const [provider, setProvider] = React.useState<WhatsAppProviderType>(initialSettings.whatsapp_api_provider || "none");
  const [waPhone, setWaPhone] = React.useState(initialSettings.whatsapp_phone || "");
  const [instanceId, setInstanceId] = React.useState(initialSettings.whatsapp_instance_id || "");
  const [apiKey, setApiKey] = React.useState(initialSettings.whatsapp_api_key || "");
  const [template, setTemplate] = React.useState(initialSettings.whatsapp_reminder_template || "");
  const [saving, setSaving] = React.useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsapp_api_provider: provider,
          whatsapp_phone: waPhone,
          whatsapp_instance_id: instanceId,
          whatsapp_api_key: apiKey,
          whatsapp_reminder_template: template,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("WhatsApp Gateway & Reminder settings saved!");
      router.refresh();
    } catch {
      toast.error("Could not save WhatsApp settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <MessageSquare className="size-5" /> WhatsApp Sender &amp; Background Gateway
          </CardTitle>
          <CardDescription>
            Configure your WhatsApp Sender number and Background Gateway API (UltraMsg, Green-API, Wati, Twilio) for 1-Click Automated Batch Reminders.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="waPhone">WhatsApp Sender Phone Number</Label>
              <Input
                id="waPhone"
                value={waPhone}
                onChange={(e) => setWaPhone(e.target.value)}
                placeholder="+91 9876543210"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="provider">Background Gateway Provider</Label>
              <Select value={provider} onValueChange={(val) => setProvider(val as WhatsAppProviderType)}>
                <SelectTrigger id="provider">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (WhatsApp Web 1-Click Link)</SelectItem>
                  <SelectItem value="ultramsg">UltraMsg (Recommended)</SelectItem>
                  <SelectItem value="greenapi">Green-API</SelectItem>
                  <SelectItem value="wati">WATI WhatsApp API</SelectItem>
                  <SelectItem value="twilio">Twilio WhatsApp API</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {provider !== "none" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
              <div className="space-y-1.5">
                <Label htmlFor="instanceId">Instance ID / Channel ID</Label>
                <Input
                  id="instanceId"
                  value={instanceId}
                  onChange={(e) => setInstanceId(e.target.value)}
                  placeholder="instance12345"
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="apiKey">API Secret Key / Token</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="font-mono text-xs"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="size-4 text-emerald-600 dark:text-emerald-400" /> Appointment Reminder Message Template
          </CardTitle>
          <CardDescription>
            Personalize the WhatsApp message sent to customers on the day of their scheduled appointment.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="waTemplate">Message Template</Label>
            <Textarea
              id="waTemplate"
              rows={4}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              placeholder="Namaste {customer_name}! 🔔\nRemind karne ke liye text hai ki aapka appointment aaj {appointment_date} ko {appointment_time} baje scheduled hai for {product_name}.\nThank you! — {company_name}"
              className="text-xs leading-relaxed"
            />
          </div>

          <div className="rounded-lg border bg-muted/20 p-3 text-xs space-y-1.5">
            <p className="font-semibold flex items-center gap-1 text-foreground">
              <HelpCircle className="size-3.5 text-primary" /> Available Dynamic Placeholders:
            </p>
            <div className="flex flex-wrap gap-2 text-muted-foreground font-mono text-[11px]">
              <span className="bg-background px-1.5 py-0.5 rounded border">{`{customer_name}`}</span>
              <span className="bg-background px-1.5 py-0.5 rounded border">{`{appointment_date}`}</span>
              <span className="bg-background px-1.5 py-0.5 rounded border">{`{appointment_time}`}</span>
              <span className="bg-background px-1.5 py-0.5 rounded border">{`{product_name}`}</span>
              <span className="bg-background px-1.5 py-0.5 rounded border">{`{company_name}`}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t">
          <Button type="submit" disabled={saving} className="ml-auto gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save WhatsApp Gateway Settings
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
