"use client";

import { motion } from "framer-motion";
import { Check, Radio } from "lucide-react";
import { useLiveDataStore } from "@/store/live-data-store";

export default function LiveUpdateFeedback() {
  const updateVersion = useLiveDataStore((state) => state.updateVersion);

  return updateVersion > 0 ? (
        <motion.div
          key={updateVersion}
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: -10, scale: 0.96 }}
          animate={{ opacity: [0, 1, 1, 0], y: [-10, 0, 0, -6], scale: [0.96, 1, 1, 0.98] }}
          transition={{ duration: 4.5, times: [0, 0.08, 0.82, 1], ease: "easeOut" }}
          className="pointer-events-none fixed right-4 top-4 z-50 flex items-center gap-2 rounded-md border border-cyan/40 bg-surface-raised/95 px-3 py-2 font-mono text-[11px] text-cyan shadow-[0_0_24px_rgba(61,218,215,0.18)]"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan opacity-60" />
            <Radio className="relative h-2 w-2" aria-hidden="true" />
          </span>
          <span>API refreshed</span>
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
        </motion.div>
  ) : null;
}
