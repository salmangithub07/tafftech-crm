"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, LayoutDashboard, Eye, EyeOff, Sparkles, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [agree, setAgree] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agree) {
      setError("Please agree to the Terms of Service to continue.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not complete registration.");
        toast.error(data.error || "Registration failed");
        return;
      }

      toast.success(data.message || "Registration successful! Welcome to Taff Desk CRM.");
      router.push(data.redirectUrl || "/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please check your connection and try again.");
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted/40 p-4 sm:p-6">
      <div className="w-full max-w-md space-y-4">
        {/* Logo & Headline */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <LayoutDashboard className="size-6" />
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary border border-primary/20">
            <Sparkles className="size-3.5" />
            14-Day Free Trial · No Credit Card Required
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Start your Taff Desk CRM Trial
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xs">
            Manage your customers, appointments, billing, and stock in one place.
          </p>
        </div>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Register Tenant Account</CardTitle>
            <CardDescription className="text-xs">
              Fill in your details below to set up your business workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-xs font-medium text-destructive border border-destructive/20 flex items-start gap-2">
                <span className="shrink-0 font-bold">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Selected Plan Banner */}
              <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-3 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground">14-Day Free Trial</span>
                    <Badge variant="success" className="text-[10px] px-1.5 py-0">Included</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Full CRM Access · Up to 50 Leads · 2 Executives</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-extrabold text-primary">₹0</span>
                  <span className="text-[10px] text-muted-foreground block">/ 14 days</span>
                </div>
              </div>

              {/* Name Input */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name" className="text-xs font-semibold">
                  Business / Owner Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="e.g. Acme Industrial Solutions"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>

              {/* Email Input */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email" className="text-xs font-semibold">
                  Admin Email Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>

              {/* Password Input */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password" className="text-xs font-semibold">
                  Password <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pr-10 h-9 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Terms Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="agree"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="size-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                />
                <label htmlFor="agree" className="text-[11px] text-muted-foreground cursor-pointer select-none">
                  I agree to the <span className="font-semibold text-foreground">Terms of Service</span> and <span className="font-semibold text-foreground">Privacy Policy</span>
                </label>
              </div>

              {/* Submit Button */}
              <Button type="submit" disabled={loading} className="w-full h-10 font-bold text-xs gap-2 mt-1">
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Creating your workspace...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4" /> Start 14-Day Free Trial Now
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer Navigation */}
        <div className="text-center text-xs text-muted-foreground space-y-2">
          <p>
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-primary hover:underline">
              Sign in to your account
            </Link>
          </p>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/80">
            <ShieldCheck className="size-3.5 text-emerald-600" />
            <span>Secure 256-bit Encrypted Platform</span>
          </div>
        </div>
      </div>
    </div>
  );
}
