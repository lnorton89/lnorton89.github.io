"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

// Returns false during server rendering and the first client render, then true
// once React has hydrated. Time-relative text depends on Date.now(), which
// differs between the build-time HTML and the viewer's browser; gate those
// strings behind this hook so the server HTML and the first client render
// always agree.
export function useHydrated(): boolean {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}
