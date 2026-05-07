"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { AppState, PrisLogik, Tag } from "@/lib/types";

const DEFAULT_STATE: AppState = {
  persons: 2,
  selectedChains: [],   // empty = all chains active
  prisLogik: "pris",
  weekDays: 7,
  tagFilter: null,
  searchQuery: "",
  searchType: "retter",
};

interface AppContextType {
  state: AppState;
  setPersons: (n: number) => void;
  setSelectedChains: (chains: string[]) => void;
  setPrisLogik: (logik: PrisLogik) => void;
  setWeekDays: (n: number) => void;
  setTagFilter: (tag: Tag | null) => void;
  setSearchQuery: (q: string) => void;
  setSearchType: (t: "retter" | "varer") => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);

  // Persist state to localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("weekli_state");
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AppState>;
        setState((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  function update(partial: Partial<AppState>) {
    setState((prev) => {
      const next = { ...prev, ...partial };
      try { localStorage.setItem("weekli_state", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  return (
    <AppContext.Provider
      value={{
        state,
        setPersons: (n) => update({ persons: n }),
        setSelectedChains: (chains) => update({ selectedChains: chains }),
        setPrisLogik: (logik) => update({ prisLogik: logik }),
        setWeekDays: (n) => update({ weekDays: n }),
        setTagFilter: (tag) => update({ tagFilter: tag }),
        setSearchQuery: (q) => update({ searchQuery: q }),
        setSearchType: (t) => update({ searchType: t }),
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
