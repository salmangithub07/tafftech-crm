"use client";

import * as React from "react";
import { hexToHslString, readableForeground } from "@/lib/colors";

type AccentColorContextValue = {
  accentColor: string;
  setAccentColor: (hex: string) => void;
  persistAccentColor: (hex: string) => Promise<void>;
};

const AccentColorContext = React.createContext<AccentColorContextValue | null>(
  null
);

function applyAccentColor(hex: string) {
  const hsl = hexToHslString(hex);
  const fg = readableForeground(hex);
  const root = document.documentElement.style;
  root.setProperty("--primary", hsl);
  root.setProperty("--primary-foreground", fg);
  root.setProperty("--ring", hsl);
  root.setProperty("--sidebar-primary", hsl);
  root.setProperty("--sidebar-primary-foreground", fg);
  root.setProperty("--sidebar-ring", hsl);
  root.setProperty("--chart-1", hsl);
}

export function AccentColorProvider({
  initialColor,
  children,
}: {
  initialColor: string;
  children: React.ReactNode;
}) {
  const [accentColor, setAccentColorState] = React.useState(initialColor);

  React.useEffect(() => {
    applyAccentColor(accentColor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setAccentColor = React.useCallback((hex: string) => {
    setAccentColorState(hex);
    applyAccentColor(hex);
  }, []);

  const persistAccentColor = React.useCallback(async (hex: string) => {
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accent_color: hex }),
    });
  }, []);

  return (
    <AccentColorContext.Provider
      value={{ accentColor, setAccentColor, persistAccentColor }}
    >
      {children}
    </AccentColorContext.Provider>
  );
}

export function useAccentColor() {
  const ctx = React.useContext(AccentColorContext);
  if (!ctx) throw new Error("useAccentColor must be used within AccentColorProvider");
  return ctx;
}
