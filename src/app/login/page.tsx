"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, LayoutDashboard, Eye, EyeOff, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  function handleFillDemo() {
    setEmail("demo@crm.com");
    setPassword("demo123");
    toast.success("Demo credentials filled! Click Sign in to continue.");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not log in.");
        return;
      }
      toast.success(`Welcome back, ${data.name.split(" ")[0]}!`);
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <LayoutDashboard className="size-5" />
          </div>
          <h1 className="text-xl font-semibold">Sign in to Taff Desk CRM</h1>
          <p className="text-sm text-muted-foreground">
            The admin dashboard to manage your customers and appointments.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Admin Login</CardTitle>
            <CardDescription>Enter your email and password.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10"
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

              {error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" className="mt-1 w-full font-bold" disabled={loading}>
                {loading && <Loader2 className="size-4 animate-spin" />}
                Sign in
              </Button>

              {/* 🔑 Demo Credentials Card */}
              <div className="mt-1.5 p-3 rounded-xl border border-primary/30 bg-primary/5 flex flex-col gap-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-primary" /> Try Live Demo Account
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-bold px-1.5 py-0">
                    1-Click Auto Fill
                  </Badge>
                </div>
                <div className="space-y-1 bg-card/80 p-2.5 rounded-lg border border-border/50 font-mono text-[11px]">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Username:</span>
                    <strong className="text-foreground select-all font-semibold">demo@crm.com</strong>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Password:</span>
                    <strong className="text-foreground select-all font-semibold">demo123</strong>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleFillDemo}
                  className="h-8 text-xs font-bold gap-1.5 border-primary/40 text-primary hover:bg-primary/10 w-full"
                >
                  <Sparkles className="size-3.5" /> Auto-fill Demo Credentials
                </Button>
              </div>

              <div className="text-center pt-2 text-xs text-muted-foreground border-t border-border/40 mt-2">
                Don&apos;t have a tenant account?{" "}
                <Link href="/register" className="font-bold text-primary hover:underline">
                  Start 14-Day Free Trial
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Signup & Pricing Footer Links */}
        <div className="mt-4 text-center text-xs text-muted-foreground space-y-1">
          <div>
            <Link href="/" className="font-semibold text-primary hover:underline">
              View Pricing & Features
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
