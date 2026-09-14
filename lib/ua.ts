/**
 * Minimal, zero-dependency User-Agent parser. Covers the browsers/OSes that matter for a
 * personal analytics dashboard — not meant to be exhaustive. Order matters: more specific
 * patterns (e.g. Edge, which also contains "Chrome") must be checked before their broader parents.
 */

const BROWSER_PATTERNS: [RegExp, string][] = [
  [/Edg\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/SamsungBrowser/, "Samsung Internet"],
  [/CriOS/, "Chrome"], // Chrome on iOS
  [/FxiOS/, "Firefox"], // Firefox on iOS
  [/Firefox\//, "Firefox"],
  [/Chrome\//, "Chrome"],
  [/Safari\//, "Safari"],
];

const OS_PATTERNS: [RegExp, string][] = [
  [/Windows/, "Windows"],
  [/iPhone|iPad|iPod/, "iOS"],
  [/Mac OS X/, "macOS"],
  [/Android/, "Android"],
  [/CrOS/, "Chrome OS"],
  [/Linux/, "Linux"],
];

export function parseBrowser(userAgent: string): string {
  for (const [pattern, name] of BROWSER_PATTERNS) {
    if (pattern.test(userAgent)) return name;
  }
  return "Other";
}

export function parseOs(userAgent: string): string {
  for (const [pattern, name] of OS_PATTERNS) {
    if (pattern.test(userAgent)) return name;
  }
  return "Other";
}

const BOT_PATTERN =
  /bot|crawl|spider|slurp|headless|curl|wget|python-requests|axios|go-http-client|scrapy|facebookexternalhit|preview/i;

export function isBot(userAgent: string): boolean {
  return !userAgent || BOT_PATTERN.test(userAgent);
}

export type Device = "mobile" | "tablet" | "desktop";

export function deviceFromWidth(width: number | undefined): Device {
  if (!width || Number.isNaN(width)) return "desktop";
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}
