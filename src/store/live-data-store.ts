import { create } from "zustand";
import type { GithubSnapshot } from "@/lib/types";

interface LiveDataState {
  liveSnapshot: GithubSnapshot | null;
  lastSyncedAt: string | null;
  selectedLanguage: string | null;
  setLiveSnapshot: (snapshot: GithubSnapshot) => void;
  setSelectedLanguage: (language: string | null) => void;
}

// Holds a client-refreshed snapshot fetched directly from the GitHub REST API.
// Components read from this store (falling back to the build-time snapshot)
// so a single "Sync now" action updates the whole page at once.
export const useLiveDataStore = create<LiveDataState>((set) => ({
  liveSnapshot: null,
  lastSyncedAt: null,
  selectedLanguage: null,
  setLiveSnapshot: (snapshot) =>
    set({ liveSnapshot: snapshot, lastSyncedAt: new Date().toISOString() }),
  setSelectedLanguage: (language) => set({ selectedLanguage: language }),
}));
