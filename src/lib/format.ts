export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const diffSec = Math.round(diffMs / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "always" });
  for (const [unit, secondsInUnit] of units) {
    if (diffSec >= secondsInUnit) {
      return rtf.format(-Math.floor(diffSec / secondsInUnit), unit);
    }
  }
  return "just now";
}

export function compactNumber(n: number): string {
  return new Intl.NumberFormat("en", { notation: "compact" }).format(n);
}

// A restrained, high-contrast-on-dark palette keyed by language name.
// Falls back to a deterministic hash-based hue for anything not listed.
const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#4f8cff",
  JavaScript: "#f0c75e",
  Python: "#68a063",
  Go: "#00add8",
  Rust: "#d77a61",
  Svelte: "#ff6b6b",
  HTML: "#e44d26",
  CSS: "#42a5f5",
  Shell: "#9b8afb",
  Dockerfile: "#2496ed",
  C: "#6f9bd1",
  "C++": "#f28779",
  Java: "#e76f51",
  Ruby: "#cc342d",
  PHP: "#8892be",
  Vue: "#42b883",
  Kotlin: "#a97bff",
  Swift: "#f05138",
  MDX: "#f9ac00",
  Markdown: "#b07219",
};

export function languageColor(name: string): string {
  if (LANGUAGE_COLORS[name]) return LANGUAGE_COLORS[name];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 62%)`;
}
