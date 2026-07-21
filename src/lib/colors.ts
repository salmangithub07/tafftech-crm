/** Convert a #rrggbb hex color into the "H S% L%" triplet string shadcn/Tailwind CSS vars expect. */
export function hexToHslString(hex: string): string {
  const { h, s, l } = hexToHsl(hex);
  return `${h} ${s}% ${l}%`;
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let clean = hex.replace("#", "");
  if (clean.length === 3) {
    clean = clean
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/** Decide black or white foreground text for a given hex background, for contrast. */
export function readableForeground(hex: string): string {
  const { l } = hexToHsl(hex);
  return l > 60 ? "0 0% 10%" : "0 0% 100%";
}

export const ACCENT_PRESETS: { name: string; hex: string }[] = [
  { name: "Blue", hex: "#2563eb" },
  { name: "Indigo", hex: "#4f46e5" },
  { name: "Violet", hex: "#7c3aed" },
  { name: "Emerald", hex: "#059669" },
  { name: "Teal", hex: "#0d9488" },
  { name: "Rose", hex: "#e11d48" },
  { name: "Orange", hex: "#ea580c" },
  { name: "Amber", hex: "#d97706" },
];
