"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  ShieldCheck,
  MessageSquare,
  Send,
  HelpCircle,
  User,
  IndianRupee,
  Eye,
  EyeOff,
  Code2,
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
import type { SubscriptionInfo } from "@/lib/subscription";
import { TenantRenewDialog } from "@/components/tenant-renew-dialog";
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
  subscriptionInfo,
  superAdminPhone,
}: {
  session: SessionPayload;
  initialSettings: AppSettings;
  subscriptionInfo?: SubscriptionInfo | null;
  superAdminPhone?: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams ? searchParams.get("tab") : null;
  const [activeTab, setActiveTab] = React.useState(tabParam || "profile");

  React.useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    } else {
      setActiveTab("profile");
    }
  }, [tabParam]);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    const params = new URLSearchParams(searchParams ? searchParams.toString() : "");
    params.set("tab", val);
    router.push(`/settings?${params.toString()}`, { scroll: false });
  };

  const canEditAppearance = session.role === "super_admin" || session.role === "admin";
  const canEditInvoice = session.role === "admin";

  return (
    <Tabs value={activeTab || "profile"} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid grid-cols-2 w-full h-auto p-1 gap-1 sm:flex sm:w-fit sm:h-9">
        <TabsTrigger value="profile" className="gap-1.5 text-xs py-1.5 sm:py-1">
          <User className="size-3.5 shrink-0" />
          <span>Profile</span>
        </TabsTrigger>
        {canEditAppearance && (
          <TabsTrigger value="appearance" className="gap-1.5 text-xs py-1.5 sm:py-1">
            <Palette className="size-3.5 shrink-0" />
            <span className="hidden sm:inline">Appearance</span>
            <span className="sm:hidden">Theme</span>
          </TabsTrigger>
        )}
        {canEditInvoice && (
          <TabsTrigger value="invoice" className="gap-1.5 text-xs py-1.5 sm:py-1">
            <FileText className="size-3.5 shrink-0" />
            <span className="hidden sm:inline">Invoice &amp; Bank</span>
            <span className="sm:hidden">Invoice &amp; Bank</span>
          </TabsTrigger>
        )}
        {canEditAppearance && (
          <TabsTrigger value="whatsapp" className="gap-1.5 text-xs py-1.5 sm:py-1">
            <MessageSquare className="size-3.5 shrink-0" />
            <span className="hidden sm:inline">WhatsApp Gateway</span>
            <span className="sm:hidden">WhatsApp</span>
          </TabsTrigger>
        )}
        {session.role === "super_admin" && (
          <TabsTrigger value="subscription" className="gap-1.5 text-xs py-1.5 sm:py-1">
            <IndianRupee className="size-3.5 shrink-0" />
            <span className="hidden sm:inline">Subscription Pricing &amp; QR</span>
            <span className="sm:hidden">Pricing &amp; QR</span>
          </TabsTrigger>
        )}
        {session.role === "super_admin" && (
          <TabsTrigger value="seo" className="gap-1.5 text-xs py-1.5 sm:py-1">
            <Code2 className="size-3.5 shrink-0 text-indigo-500" />
            <span className="hidden sm:inline">SEO &amp; HTML Scripts</span>
            <span className="sm:hidden">SEO &amp; Scripts</span>
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="profile" className="mt-6">
        <ProfileTab
          session={session}
          subscriptionInfo={subscriptionInfo}
          initialSettings={initialSettings}
          superAdminPhone={superAdminPhone}
        />
      </TabsContent>
      {canEditAppearance && (
        <TabsContent value="appearance" className="mt-6">
          <AppearanceTab initialSiteName={initialSettings.site_name} />
        </TabsContent>
      )}
      {canEditInvoice && (
        <TabsContent value="invoice" className="mt-6">
          <InvoiceTab initialSettings={initialSettings} />
        </TabsContent>
      )}
      {canEditAppearance && (
        <TabsContent value="whatsapp" className="mt-6">
          <WhatsAppTab initialSettings={initialSettings} />
        </TabsContent>
      )}
      {session.role === "super_admin" && (
        <TabsContent value="subscription" className="mt-6">
          <SubscriptionSettingsTab initialSettings={initialSettings} />
        </TabsContent>
      )}
      {session.role === "super_admin" && (
        <TabsContent value="seo" className="mt-6">
          <SeoHtmlScriptsTab initialSettings={initialSettings} />
        </TabsContent>
      )}
    </Tabs>
  );
}

/* ---------------------------- Profile tab ---------------------------- */

function ProfileTab({
  session,
  subscriptionInfo,
  initialSettings,
  superAdminPhone,
}: {
  session: SessionPayload;
  subscriptionInfo?: SubscriptionInfo | null;
  initialSettings: AppSettings;
  superAdminPhone?: string | null;
}) {
  const router = useRouter();
  const [name, setName] = React.useState(session.name);
  const [email, setEmail] = React.useState(session.email);
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [renewDialogOpen, setRenewDialogOpen] = React.useState(false);

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
        body: JSON.stringify({ name, email, ...(password ? { password } : {}) }),
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

      {subscriptionInfo && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-primary" />
                <CardTitle className="text-base font-bold">Subscription &amp; Plan Details</CardTitle>
              </div>
              <Badge
                variant={
                  subscriptionInfo.status === "active"
                    ? "success"
                    : subscriptionInfo.status === "grace"
                    ? "warning"
                    : "destructive"
                }
                className="capitalize text-xs"
              >
                {subscriptionInfo.status === "grace"
                  ? `Grace Period (${subscriptionInfo.graceDaysRemaining}d left)`
                  : subscriptionInfo.status}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Current subscription plan details for your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-xs py-2">
            <div>
              <span className="text-muted-foreground font-medium">Plan Type:</span>
              <p className="font-semibold text-foreground text-sm capitalize">{subscriptionInfo.planType}</p>
            </div>
            <div>
              <span className="text-muted-foreground font-medium">Expiry Date:</span>
              <p className="font-semibold text-foreground text-sm">{subscriptionInfo.formattedExpiry}</p>
            </div>
          </CardContent>
          <CardFooter className="border-t border-border/40 py-3 flex items-center justify-between">
            {subscriptionInfo.status === "grace" ||
            subscriptionInfo.status === "locked" ||
            (subscriptionInfo.daysRemaining !== null && subscriptionInfo.daysRemaining <= 3) ? (
              <>
                <span className="text-xs text-muted-foreground">Plan expiring soon. Send a renewal request to Super Admin:</span>
                <Button size="sm" onClick={() => setRenewDialogOpen(true)} className="gap-1.5 h-8 text-xs">
                  <Sparkles className="size-3.5" /> Send Renewal Request
                </Button>
              </>
            ) : subscriptionInfo.planType === "yearly" || subscriptionInfo.planType === "trial" ? (
              <>
                <span className="text-xs text-muted-foreground">Want to extend your access? Upgrade to 3-Year Plan anytime:</span>
                <Button size="sm" onClick={() => setRenewDialogOpen(true)} className="gap-1.5 h-8 text-xs">
                  <Sparkles className="size-3.5" /> Upgrade to 3-Year Plan
                </Button>
              </>
            ) : (
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Check className="size-3.5 text-emerald-500" /> Your subscription is active and up to date.
              </span>
            )}
          </CardFooter>
        </Card>
      )}

      <TenantRenewDialog
        open={renewDialogOpen}
        onOpenChange={setRenewDialogOpen}
        planType={subscriptionInfo?.planType}
        expiryDate={subscriptionInfo?.formattedExpiry}
        companyPhone={superAdminPhone || initialSettings.company_phone}
        yearlyPrice={initialSettings.yearly_plan_price}
        threeYearPrice={initialSettings.three_year_plan_price}
        bankUpiId={initialSettings.bank_upi_id}
        paymentQrCode={initialSettings.payment_qr_code}
      />

      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
          <CardDescription>Update your email address, display name, and login password.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSave}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email / Username</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Display Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div className="flex flex-col gap-1.5 pt-2 border-t">
              <Label htmlFor="pass">New Password (leave blank to keep current)</Label>
              <div className="relative">
                <Input
                  id="pass"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {password && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="conf">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="conf"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
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
  const [gstin, setGstin] = React.useState(initialSettings.gstin || "");
  const [panNo, setPanNo] = React.useState(initialSettings.pan_no || "");
  const [companyPhone, setCompanyPhone] = React.useState(initialSettings.company_phone || "");
  const [logo, setLogo] = React.useState(initialSettings.business_logo || "");
  const [tagline, setTagline] = React.useState(initialSettings.business_tagline || "");
  const [address, setAddress] = React.useState(initialSettings.business_address || "");
  const [bankName, setBankName] = React.useState(initialSettings.bank_name || "");
  const [bankBranch, setBankBranch] = React.useState(initialSettings.bank_branch || "");
  const [bankAcc, setBankAcc] = React.useState(initialSettings.bank_account_no || "");
  const [bankIfsc, setBankIfsc] = React.useState(initialSettings.bank_ifsc || "");
  const [bankUpi, setBankUpi] = React.useState(initialSettings.bank_upi_id || "");
  const [disputeNote, setDisputeNote] = React.useState(initialSettings.dispute_note || "");
  const [privacyPolicy, setPrivacyPolicy] = React.useState(initialSettings.privacy_policy || "");
  const [saving, setSaving] = React.useState(false);
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 200 * 1024) {
      toast.error("Logo image size must be under 200KB. Please select a smaller file.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setLogo(reader.result);
        toast.success("Business Logo loaded successfully!");
      }
    };
    reader.readAsDataURL(file);
  }

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
          gstin,
          pan_no: panNo,
          company_phone: companyPhone,
          business_logo: logo,
          business_tagline: tagline,
          business_address: address,
          bank_name: bankName,
          bank_branch: bankBranch,
          bank_account_no: bankAcc,
          bank_ifsc: bankIfsc,
          bank_upi_id: bankUpi,
          dispute_note: disputeNote,
          privacy_policy: privacyPolicy,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Tenant Invoice & Branding Settings saved successfully!");
      router.refresh();
    } catch {
      toast.error("Could not save invoice settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6 max-w-3xl">

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="size-4 text-primary" /> Business Branding &amp; Invoice Header Details
          </CardTitle>
          <CardDescription>
            Tenant-specific GSTIN, PAN, Phone, Logo, Tagline, and Address printed dynamically on every invoice.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="gstin">GSTIN Number</Label>
              <Input
                id="gstin"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                placeholder="27CENPA9070D1ZI"
                className="font-mono uppercase"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="panNo">PAN Number</Label>
              <Input
                id="panNo"
                value={panNo}
                onChange={(e) => setPanNo(e.target.value)}
                placeholder="CENPA9070D"
                className="font-mono uppercase"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="companyPhone">Business Phone(s)</Label>
              <Input
                id="companyPhone"
                value={companyPhone}
                onChange={(e) => setCompanyPhone(e.target.value)}
                placeholder="9607086390 / 8788099744"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="logoUpload">Business Logo (Max 200KB)</Label>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                  className="gap-1.5"
                >
                  <FileText className="size-4" /> Upload Logo
                </Button>
                {logo ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setLogo("")}
                    className="text-xs text-destructive hover:bg-destructive/10"
                  >
                    Remove Logo
                  </Button>
                ) : null}
              </div>
              <p className="text-[11px] text-muted-foreground">
                If no logo is uploaded, your Business Name will be displayed as bold header text on invoices.
              </p>
            </div>

            {logo ? (
              <div className="p-3 border rounded-lg bg-muted/20 flex flex-col items-center justify-center">
                <span className="text-[10px] text-muted-foreground mb-1 font-semibold uppercase">Logo Preview</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logo} alt="Business Logo Preview" className="max-h-12 w-auto object-contain" />
              </div>
            ) : null}
          </div>

          <div className="space-y-1.5 pt-2">
            <Label htmlFor="tagline">Business Tagline (Banner Bar)</Label>
            <Input
              id="tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="INDUSTRIAL SOLUTIONS"
              className="font-semibold uppercase"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">Business Address (Printed on Invoice Header)</Label>
            <Textarea
              id="address"
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="PLOT NO 4, NIZAMUDDIN COLONY, NAGPUR&#10;NAGPUR , MAHARASHTRA , INDIA – 440001"
              className="text-xs"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="size-4 text-primary" /> Bank Account &amp; Payment Details (Tenant-Wise)
          </CardTitle>
          <CardDescription>
            Individual structured fields for your tenant bank account, branch, IFSC code, and UPI ID printed on every invoice.
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
                placeholder="ICICI BANK"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bankBranch">Branch Address</Label>
              <Input
                id="bankBranch"
                value={bankBranch}
                onChange={(e) => setBankBranch(e.target.value)}
                placeholder="Rani Khothi, Police Lane,GN Road-441002 Maharashtra"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="bankAcc">Account Number (A/C No)</Label>
              <Input
                id="bankAcc"
                value={bankAcc}
                onChange={(e) => setBankAcc(e.target.value)}
                placeholder="146205002969"
                className="font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bankIfsc">RTGS/NEFT IFSC Code</Label>
              <Input
                id="bankIfsc"
                value={bankIfsc}
                onChange={(e) => setBankIfsc(e.target.value)}
                placeholder="ICIC0001462"
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
            <FileText className="size-4 text-primary" /> Attachment &amp; Legal Jurisdiction Note
          </CardTitle>
          <CardDescription>
            Standard dispute jurisdiction note printed at the very bottom attachment line of every invoice.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="disputeNote">Default Attachment / Jurisdiction Note</Label>
            <Input
              id="disputeNote"
              value={disputeNote}
              onChange={(e) => setDisputeNote(e.target.value)}
              placeholder="ALL DISPUTES SUBJECT TO NAGPUR JURISDICTION"
              className="text-xs uppercase"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="terms">Standard Terms &amp; Conditions (Optional)</Label>
            <Textarea
              id="terms"
              rows={3}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="1. Goods once sold will not be taken back.&#10;2. Interest @18% p.a. will be charged if payment is delayed."
              className="text-xs"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving} className="gap-2">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Save Invoice &amp; Branding Settings
        </Button>
      </div>

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
                  <SelectItem value="none">None (100% Free - WhatsApp Web 1-Click Link)</SelectItem>
                  <SelectItem value="greenapi">Green-API (Free Tier Available)</SelectItem>
                  <SelectItem value="ultramsg">UltraMsg Gateway</SelectItem>
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

/* --------------------------- Subscription Pricing & QR Tab --------------------------- */

function SubscriptionSettingsTab({ initialSettings }: { initialSettings: AppSettings }) {
  const router = useRouter();
  const [yearlyPrice, setYearlyPrice] = React.useState(initialSettings.yearly_plan_price || "4999");
  const [threeYearPrice, setThreeYearPrice] = React.useState(initialSettings.three_year_plan_price || "11999");
  const [lifetimePrice, setLifetimePrice] = React.useState(initialSettings.lifetime_plan_price || "24999");
  const [bankUpi, setBankUpi] = React.useState(initialSettings.bank_upi_id || "");
  const [paymentQr, setPaymentQr] = React.useState(initialSettings.payment_qr_code || "");

  // Plan limits state
  const [trialExecs, setTrialExecs] = React.useState(initialSettings.trial_max_executives || "2");
  const [trialCusts, setTrialCusts] = React.useState(initialSettings.trial_max_customers || "50");
  const [yearlyExecs, setYearlyExecs] = React.useState(initialSettings.yearly_max_executives || "10");
  const [yearlyCusts, setYearlyCusts] = React.useState(initialSettings.yearly_max_customers || "1000");
  const [threeYearExecs, setThreeYearExecs] = React.useState(initialSettings.three_year_max_executives || "25");
  const [threeYearCusts, setThreeYearCusts] = React.useState(initialSettings.three_year_max_customers || "5000");
  const [lifetimeExecs, setLifetimeExecs] = React.useState(initialSettings.lifetime_max_executives || "-1");
  const [lifetimeCusts, setLifetimeCusts] = React.useState(initialSettings.lifetime_max_customers || "-1");

  // Broadcast announcement state
  const [announcementEnabled, setAnnouncementEnabled] = React.useState(initialSettings.broadcast_announcement_enabled || "0");
  const [announcementMessage, setAnnouncementMessage] = React.useState(initialSettings.broadcast_announcement_message || "");
  const [announcementType, setAnnouncementType] = React.useState(initialSettings.broadcast_announcement_type || "info");
  const [announcementTarget, setAnnouncementTarget] = React.useState(initialSettings.broadcast_announcement_target_plan || "all");

  const [saving, setSaving] = React.useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          yearly_plan_price: yearlyPrice,
          three_year_plan_price: threeYearPrice,
          lifetime_plan_price: lifetimePrice,
          bank_upi_id: bankUpi,
          payment_qr_code: paymentQr,
          trial_max_executives: trialExecs,
          trial_max_customers: trialCusts,
          yearly_max_executives: yearlyExecs,
          yearly_max_customers: yearlyCusts,
          three_year_max_executives: threeYearExecs,
          three_year_max_customers: threeYearCusts,
          lifetime_max_executives: lifetimeExecs,
          lifetime_max_customers: lifetimeCusts,
          broadcast_announcement_enabled: announcementEnabled,
          broadcast_announcement_message: announcementMessage,
          broadcast_announcement_type: announcementType,
          broadcast_announcement_target_plan: announcementTarget,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Subscription pricing, limits & announcements saved!");
      router.refresh();
    } catch {
      toast.error("Could not save subscription settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6 max-w-3xl">
      {/* Broadcast System Announcement Card */}
      <Card className="border-purple-500/30 bg-purple-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="size-5 text-purple-600 dark:text-purple-400" /> System Announcement &amp; Broadcast Alert
          </CardTitle>
          <CardDescription>
            Broadcast a live announcement banner across tenant dashboards (e.g. maintenance updates or new features).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-foreground">Enable Live Broadcast Banner</span>
              <span className="text-[11px] text-muted-foreground">Toggle on to display this announcement to active tenants</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={announcementEnabled === "1" ? "success" : "secondary"}>
                {announcementEnabled === "1" ? "Active" : "Disabled"}
              </Badge>
              <Button
                type="button"
                size="sm"
                variant={announcementEnabled === "1" ? "destructive" : "default"}
                className="h-8 text-xs"
                onClick={() => setAnnouncementEnabled(announcementEnabled === "1" ? "0" : "1")}
              >
                {announcementEnabled === "1" ? "Disable Alert" : "Enable Alert"}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="announcement_message">Announcement Message Text *</Label>
            <Input
              id="announcement_message"
              value={announcementMessage}
              onChange={(e) => setAnnouncementMessage(e.target.value)}
              placeholder="e.g., ⚠️ Scheduled maintenance tonight at 11 PM (IST). Please save your work."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="announcement_type">Alert Style / Banner Type</Label>
              <Select value={announcementType} onValueChange={setAnnouncementType}>
                <SelectTrigger id="announcement_type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">🔵 Info (Blue - System Updates)</SelectItem>
                  <SelectItem value="warning">🟡 Warning (Amber - Scheduled Maintenance)</SelectItem>
                  <SelectItem value="danger">🔴 Critical Alert (Red - Urgent Notice)</SelectItem>
                  <SelectItem value="success">🟢 Success (Green - New Feature Live)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="announcement_target">Target Tenant Plan</Label>
              <Select value={announcementTarget} onValueChange={setAnnouncementTarget}>
                <SelectTrigger id="announcement_target">
                  <SelectValue placeholder="Select target" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Active Tenants</SelectItem>
                  <SelectItem value="trial">Trial Plan Tenants Only</SelectItem>
                  <SelectItem value="yearly">1-Year Plan Tenants Only</SelectItem>
                  <SelectItem value="3_year">3-Year Plan Tenants Only</SelectItem>
                  <SelectItem value="lifetime">Lifetime Plan Tenants Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" /> Subscription Pricing &amp; Payment QR
          </CardTitle>
          <CardDescription>
            Manage the 1-Year and 3-Year plan prices, UPI ID, and QR Code image shown to tenants when renewing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="yearly_price">1-Year Subscription Price (₹) *</Label>
              <Input
                id="yearly_price"
                type="number"
                value={yearlyPrice}
                onChange={(e) => setYearlyPrice(e.target.value)}
                placeholder="4999"
                required
              />
              <span className="text-[11px] text-muted-foreground">
                Price for 1 Year (365 Days) access.
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="three_year_price">3-Year Subscription Price (₹) *</Label>
              <Input
                id="three_year_price"
                type="number"
                value={threeYearPrice}
                onChange={(e) => setThreeYearPrice(e.target.value)}
                placeholder="11999"
                required
              />
              <span className="text-[11px] text-muted-foreground">
                Price for 3 Years (1095 Days) access.
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lifetime_price">Lifetime Access Price (₹) *</Label>
              <Input
                id="lifetime_price"
                type="number"
                value={lifetimePrice}
                onChange={(e) => setLifetimePrice(e.target.value)}
                placeholder="24999"
                required
              />
              <span className="text-[11px] text-muted-foreground">
                One-time price for Lifetime unlimited access.
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bank_upi_id">Super Admin UPI ID for Receiving Payments *</Label>
            <Input
              id="bank_upi_id"
              value={bankUpi}
              onChange={(e) => setBankUpi(e.target.value)}
              placeholder="e.g. merchant@upi or 9876543210@paytm"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment_qr">Payment QR Code Image URL (Optional)</Label>
            <Input
              id="payment_qr"
              value={paymentQr}
              onChange={(e) => setPaymentQr(e.target.value)}
              placeholder="https://... or leave empty for auto-generated UPI QR"
            />
            <span className="text-[11px] text-muted-foreground">
              If left blank, an automatic UPI QR code will be generated for your UPI ID and plan price.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Tiered Plan Limits Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" /> Tiered Plan Feature &amp; Resource Limits
          </CardTitle>
          <CardDescription>
            Set maximum Executives and Customers/Leads allowed per plan tier. Enter <strong>-1</strong> for Unlimited.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Trial Plan Limits */}
          <div className="space-y-3 p-3.5 rounded-xl border bg-muted/20">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-foreground">Trial Plan Limits</span>
              <Badge variant="outline">Trial</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <Label htmlFor="trial_execs">Max Team Executives (-1 = Unlimited)</Label>
                <Input
                  id="trial_execs"
                  type="number"
                  value={trialExecs}
                  onChange={(e) => setTrialExecs(e.target.value)}
                  placeholder="2"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="trial_custs">Max Customers / Leads (-1 = Unlimited)</Label>
                <Input
                  id="trial_custs"
                  type="number"
                  value={trialCusts}
                  onChange={(e) => setTrialCusts(e.target.value)}
                  placeholder="50"
                  required
                />
              </div>
            </div>
          </div>

          {/* 1-Year Plan Limits */}
          <div className="space-y-3 p-3.5 rounded-xl border bg-muted/20">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-foreground">1-Year Plan Limits</span>
              <Badge variant="secondary">1 Year</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <Label htmlFor="yearly_execs">Max Team Executives (-1 = Unlimited)</Label>
                <Input
                  id="yearly_execs"
                  type="number"
                  value={yearlyExecs}
                  onChange={(e) => setYearlyExecs(e.target.value)}
                  placeholder="10"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="yearly_custs">Max Customers / Leads (-1 = Unlimited)</Label>
                <Input
                  id="yearly_custs"
                  type="number"
                  value={yearlyCusts}
                  onChange={(e) => setYearlyCusts(e.target.value)}
                  placeholder="1000"
                  required
                />
              </div>
            </div>
          </div>

          {/* 3-Year Plan Limits */}
          <div className="space-y-3 p-3.5 rounded-xl border border-primary/30 bg-primary/5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-foreground">3-Year Plan Limits</span>
              <Badge variant="default">3 Years</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <Label htmlFor="three_year_execs">Max Team Executives (-1 = Unlimited)</Label>
                <Input
                  id="three_year_execs"
                  type="number"
                  value={threeYearExecs}
                  onChange={(e) => setThreeYearExecs(e.target.value)}
                  placeholder="25"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="three_year_custs">Max Customers / Leads (-1 = Unlimited)</Label>
                <Input
                  id="three_year_custs"
                  type="number"
                  value={threeYearCusts}
                  onChange={(e) => setThreeYearCusts(e.target.value)}
                  placeholder="5000"
                  required
                />
              </div>
            </div>
          </div>

          {/* Lifetime Plan Limits */}
          <div className="space-y-3 p-3.5 rounded-xl border bg-muted/20">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-foreground">Lifetime Plan Limits</span>
              <Badge variant="success">Lifetime</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <Label htmlFor="lifetime_execs">Max Team Executives (-1 = Unlimited)</Label>
                <Input
                  id="lifetime_execs"
                  type="number"
                  value={lifetimeExecs}
                  onChange={(e) => setLifetimeExecs(e.target.value)}
                  placeholder="-1"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lifetime_custs">Max Customers / Leads (-1 = Unlimited)</Label>
                <Input
                  id="lifetime_custs"
                  type="number"
                  value={lifetimeCusts}
                  onChange={(e) => setLifetimeCusts(e.target.value)}
                  placeholder="-1"
                  required
                />
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t">
          <Button type="submit" disabled={saving} className="ml-auto">
            {saving && <Loader2 className="size-4 animate-spin mr-1.5" />} Save All Settings &amp; Broadcasts
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

/* ---------------------------- SEO & HTML Scripts tab ---------------------------- */

function SeoHtmlScriptsTab({ initialSettings }: { initialSettings: AppSettings }) {
  const [saving, setSaving] = React.useState(false);
  const [metaTitle, setMetaTitle] = React.useState(initialSettings.meta_title || "");
  const [metaDescription, setMetaDescription] = React.useState(initialSettings.meta_description || "");
  const [seoKeywords, setSeoKeywords] = React.useState(initialSettings.seo_keywords || "");
  const [schemaJsonLd, setSchemaJsonLd] = React.useState(initialSettings.schema_json_ld || "");
  const [customHeadCode, setCustomHeadCode] = React.useState(initialSettings.custom_head_code || "");
  const [customBodyCode, setCustomBodyCode] = React.useState(initialSettings.custom_body_code || "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meta_title: metaTitle,
          meta_description: metaDescription,
          seo_keywords: seoKeywords,
          schema_json_ld: schemaJsonLd,
          custom_head_code: customHeadCode,
          custom_body_code: customBodyCode,
        }),
      });
      if (!res.ok) throw new Error("Failed to save SEO settings");
      toast.success("SEO & Custom HTML/Script settings updated successfully!");
    } catch {
      toast.error("Failed to update SEO & HTML settings.");
    } finally {
      setSaving(false);
    }
  }

  function handleLoadSampleSchema() {
    const sampleSchema = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "SoftwareApplication",
          "@id": `${typeof window !== "undefined" ? window.location.origin : "https://www.taffdesk.com"}/#software`,
          "name": initialSettings.site_name || "Taff Desk CRM",
          "alternateName": "TaffTech CRM",
          "operatingSystem": "All (Web-based SaaS, Windows, macOS, iOS, Android)",
          "applicationCategory": "BusinessApplication",
          "applicationSubCategory": "CRM & GST Billing Software",
          "softwareVersion": "2.0.0",
          "description": metaDescription || "All-in-one CRM & GST Billing Software for growing businesses. Manage customer leads, appointments, 1-click WhatsApp reminders, quotation generator, inventory, and team permissions.",
          "url": typeof window !== "undefined" ? window.location.origin : "https://www.taffdesk.com",
          "featureList": [
            "Lead & Customer Management",
            "1-Click Automated WhatsApp Reminders",
            "GST Invoice & Quotation Generator",
            "Appointment Scheduling & Tracking",
            "Role-Based Access Control (RBAC)",
            "Financial Ledger & Income/Expense Tracking",
            "Multi-Tenant Business Architecture"
          ],
          "offers": [
            {
              "@type": "Offer",
              "name": "1-Year License",
              "price": "4999",
              "priceCurrency": "INR",
              "availability": "https://schema.org/InStock"
            },
            {
              "@type": "Offer",
              "name": "3-Year License",
              "price": "11999",
              "priceCurrency": "INR",
              "availability": "https://schema.org/InStock"
            },
            {
              "@type": "Offer",
              "name": "Lifetime Access",
              "price": "24999",
              "priceCurrency": "INR",
              "availability": "https://schema.org/InStock"
            }
          ],
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.9",
            "ratingCount": "128",
            "bestRating": "5",
            "worstRating": "1"
          },
          "author": {
            "@type": "Organization",
            "@id": `${typeof window !== "undefined" ? window.location.origin : "https://www.taffdesk.com"}/#organization`
          }
        },
        {
          "@type": "Organization",
          "@id": `${typeof window !== "undefined" ? window.location.origin : "https://www.taffdesk.com"}/#organization`,
          "name": "TaffTech Industrial Solutions",
          "legalName": "TaffTech Solutions",
          "url": typeof window !== "undefined" ? window.location.origin : "https://www.taffdesk.com",
          "logo": initialSettings.business_logo || undefined,
          "contactPoint": [
            {
              "@type": "ContactPoint",
              "telephone": "+91-9607086390",
              "contactType": "customer service",
              "areaServed": "IN",
              "availableLanguage": ["English", "Hindi"]
            }
          ]
        },
        {
          "@type": "WebSite",
          "@id": `${typeof window !== "undefined" ? window.location.origin : "https://www.taffdesk.com"}/#website`,
          "url": typeof window !== "undefined" ? window.location.origin : "https://www.taffdesk.com",
          "name": initialSettings.site_name || "Taff Desk CRM",
          "description": metaDescription || "All-In-One CRM & GST Billing Software"
        },
        {
          "@type": "FAQPage",
          "@id": `${typeof window !== "undefined" ? window.location.origin : "https://www.taffdesk.com"}/#faq`,
          "mainEntity": [
            {
              "@type": "Question",
              "name": "What is Taff Desk CRM?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Taff Desk CRM is an all-in-one customer relationship management and GST billing software designed for growing businesses. It helps manage leads, send automated WhatsApp reminders, generate official GST invoices & quotations, track appointments, and manage team permissions."
              }
            },
            {
              "@type": "Question",
              "name": "Does Taff Desk CRM support GST Invoice and Quotation generation?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes, Taff Desk CRM includes built-in 1-click Proforma Invoice / Quotation and GST Tax Invoice generation with custom company logo, GSTIN, bank details, and downloadable PDF / print formats."
              }
            },
            {
              "@type": "Question",
              "name": "How does 1-click WhatsApp Integration work?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Taff Desk CRM allows you to instantly send appointment reminders, billing details, and customer updates directly to your customer's WhatsApp with one click."
              }
            }
          ]
        }
      ]
    };
    setSchemaJsonLd(JSON.stringify(sampleSchema, null, 2));
    toast.info("Sample Google SEO Schema.org JSON-LD loaded!");
  }

  function handleLoadSampleGTM() {
    const sampleHeadSnippet = `<!-- Google Tag Manager / Analytics Snippet -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=G-MEASUREMENT_ID"></script>\n<script>\n  window.dataLayer = window.dataLayer || [];\n  function gtag(){dataLayer.push(arguments);}\n  gtag('js', new Date());\n  gtag('config', 'G-MEASUREMENT_ID');\n</script>`;
    setCustomHeadCode((prev) => (prev ? prev + "\n\n" + sampleHeadSnippet : sampleHeadSnippet));
    toast.info("Sample Analytics tag appended to Head scripts!");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Code2 className="size-5 text-indigo-500" /> SEO &amp; HTML Script Injector
          </CardTitle>
          <CardDescription>
            Configure meta tags, Schema.org JSON-LD structured data, Google Tag Manager/Analytics, and custom HTML scripts for maximum SEO performance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* SEO Meta Information */}
          <div className="space-y-4 rounded-xl border p-4 bg-muted/20">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">1. SEO &amp; Search Engine Meta Information</h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="meta_title">Meta Title Tag</Label>
                <Input
                  id="meta_title"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder="Taff Desk CRM — Modern All-In-One CRM & Billing Software"
                />
                <p className="text-[11px] text-muted-foreground">Appears in Google search results and browser tab header.</p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="meta_description">Meta Description</Label>
                <Textarea
                  id="meta_description"
                  rows={2}
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="Manage customer leads, appointments, WhatsApp reminders, and GST billing..."
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="seo_keywords">Meta Keywords (Comma separated)</Label>
                <Textarea
                  id="seo_keywords"
                  rows={3}
                  value={seoKeywords}
                  onChange={(e) => setSeoKeywords(e.target.value)}
                  placeholder="crm, saas crm, lead management, whatsapp crm, invoice software, quotation software, appointment scheduling"
                  className="font-sans text-xs leading-relaxed"
                />
                <p className="text-[11px] text-muted-foreground">List all primary, long-tail, and industry keywords separated by commas.</p>
              </div>
            </div>
          </div>

          {/* Schema.org Structured Data Editor */}
          <div className="space-y-3 rounded-xl border p-4 bg-muted/20">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">2. Schema.org JSON-LD Structured Data</h3>
                <p className="text-xs text-muted-foreground">Helps Google understand your business, pricing, and rich snippets.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleLoadSampleSchema} className="h-7 text-xs gap-1">
                <Sparkles className="size-3.5 text-indigo-500" /> Insert Sample Schema
              </Button>
            </div>
            <Textarea
              rows={8}
              value={schemaJsonLd}
              onChange={(e) => setSchemaJsonLd(e.target.value)}
              placeholder={`{\n  "@context": "https://schema.org",\n  "@type": "SoftwareApplication",\n  "name": "Taff Desk CRM"\n}`}
              className="font-mono text-xs bg-slate-950 text-emerald-400 dark:bg-slate-900 border-slate-800 p-3 leading-relaxed rounded-md min-h-[160px]"
            />
          </div>

          {/* Custom Head HTML / Scripts */}
          <div className="space-y-3 rounded-xl border p-4 bg-muted/20">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">3. Custom Head HTML &amp; Scripts (`&lt;head&gt;`)</h3>
                <p className="text-xs text-muted-foreground">Inject Google Tag Manager, Analytics pixels, Meta Domain verification, or custom CSS/scripts into the page header.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleLoadSampleGTM} className="h-7 text-xs gap-1">
                <Code2 className="size-3.5 text-indigo-500" /> Insert Sample Analytics
              </Button>
            </div>
            <Textarea
              rows={6}
              value={customHeadCode}
              onChange={(e) => setCustomHeadCode(e.target.value)}
              placeholder={`<!-- Paste Google Analytics, GTM, or meta verification tags here -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXX"></script>`}
              className="font-mono text-xs bg-slate-950 text-indigo-300 dark:bg-slate-900 border-slate-800 p-3 leading-relaxed rounded-md min-h-[140px]"
            />
          </div>

          {/* Custom Body / Footer HTML / Scripts */}
          <div className="space-y-3 rounded-xl border p-4 bg-muted/20">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">4. Custom Footer &amp; Body HTML (`&lt;body&gt;`)</h3>
              <p className="text-xs text-muted-foreground">Inject live chat widgets (Tawk.to, Crisp, Intercom), conversion tracking scripts, or footer badges before closing `&lt;/body&gt;`.</p>
            </div>
            <Textarea
              rows={6}
              value={customBodyCode}
              onChange={(e) => setCustomBodyCode(e.target.value)}
              placeholder={`<!-- Paste live chat widget or footer tracking scripts here -->\n<script>\n  // Live chat initialization code...\n</script>`}
              className="font-mono text-xs bg-slate-950 text-amber-300 dark:bg-slate-900 border-slate-800 p-3 leading-relaxed rounded-md min-h-[140px]"
            />
          </div>
        </CardContent>
        <CardFooter className="border-t">
          <Button type="submit" disabled={saving} className="ml-auto">
            {saving && <Loader2 className="size-4 animate-spin mr-1.5" />} Save SEO &amp; HTML Scripts
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

