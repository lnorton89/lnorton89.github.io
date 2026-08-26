// Used by upstream sections (Languages in play, Repository signals) when a
// filter that lives on the repository grid is activated. Brings the repository
// section into view and moves keyboard focus to its heading, respecting
// prefers-reduced-motion.
export function revealRepositorySection() {
  const el = document.getElementById("repositories");
  if (!el) return;
  const reduced = typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  el.focus({ preventScroll: true });
}
