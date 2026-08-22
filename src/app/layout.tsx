import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AccentColorProvider } from "@/components/accent-color-provider";
import { Toaster } from "@/components/ui/sonner";
import { getSettings } from "@/lib/settings";
import { getSession, tenantOf } from "@/lib/auth";
import { hexToHslString, readableForeground } from "@/lib/colors";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Taff Desk CRM — Admin Dashboard",
  description: "Manage customers and appointments from one clean dashboard.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  // Logged-out (e.g. /login) sees the global, Super Admin-controlled branding.
  // Logged-in users see their own tenant's color — isolated per Admin.
  const tenantId = session ? tenantOf(session) ?? 0 : 0;
  const settings = await getSettings(tenantId);
  const hsl = hexToHslString(settings.accent_color);
  const fg = readableForeground(settings.accent_color);

  return (
    <html lang="en" className={`${inter.variable} ${plusJakartaSans.variable}`} suppressHydrationWarning>
      <head>
        {/* Suppress browser extension (Bitdefender anti-tracker) DOM attribute hydration error overlay */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){if(typeof window!=='undefined'){var o=console.error;console.error=function(){if(arguments[0]&&typeof arguments[0]==='string'&&arguments[0].indexOf('bis_skin_checked')!==-1)return;o.apply(console,arguments);};}})();`,
          }}
        />
        {/* Applied before paint so the saved accent color never flashes to the default blue */}
        <style
          dangerouslySetInnerHTML={{
            __html: `:root{--primary:${hsl};--primary-foreground:${fg};--ring:${hsl};--sidebar-primary:${hsl};--sidebar-primary-foreground:${fg};--sidebar-ring:${hsl};--chart-1:${hsl};}`,
          }}
        />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AccentColorProvider initialColor={settings.accent_color}>
            {children}
            <Toaster richColors position="top-right" />
          </AccentColorProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
