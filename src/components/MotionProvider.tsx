"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

// Root client wrapper. Only provides reduced-motion handling for Framer Motion;
// the sync state machine no longer needs a query client.
export default function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
