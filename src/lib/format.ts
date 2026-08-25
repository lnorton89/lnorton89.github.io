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
  TypeScript: "#3ddad7",
  JavaScript: "#e8c547",
  Python: "#7fb8e8",
  Go: "#5fd0a0",
  Rust: "#e8a33d",
  Svelte: "#ff7a4d",
  HTML: "#e06c75",
  CSS: "#c792ea",
  Shell: "#8b8f98",
  Dockerfile: "#61c3ec",
  C: "#a3a3a3",
  "C++": "#f28779",
  Java: "#e8a33d",
  Ruby: "#e05c5c",
  PHP: "#8b93e8",
  Vue: "#7fd88f",
  Kotlin: "#c792ea",
  Swift: "#f2a65a",
  MDX: "#e8e6e1",
  Markdown: "#8b8f98",
};

export function languageColor(name: string): string {
  if (LANGUAGE_COLORS[name]) return LANGUAGE_COLORS[name];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 62%)`;
}
