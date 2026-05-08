"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { AppState, PrisLogik, Tag, FridgeItem, SavedRecipe, SavedPlan, UserRecipe } from "@/lib/types";

const DEFAULT_STATE: AppState = {
  persons: 2,
  selectedChains: [],
  prisLogik: "pris",
  weekDays: 7,
  tagFilters: [],
  searchQuery: "",
  searchType: "retter",
  fridgeItems: [] as FridgeItem[],
  savedRecipes: [],
  savedPlans: [],
  userRecipes: [],
  completedPlanIds: [],
  completedRecipeSlugs: [],
};

interface AppContextType {
  state: AppState;
  setPersons: (n: number) => void;
  setSelectedChains: (chains: string[]) => void;
  setPrisLogik: (logik: PrisLogik) => void;
  setWeekDays: (n: number) => void;
  toggleTagFilter: (tag: Tag) => void;
  clearTagFilters: () => void;
  setTagFilters: (tags: Tag[]) => void;
  setSearchQuery: (q: string) => void;
  setSearchType: (t: "retter" | "varer") => void;
  addFridgeItem: (canonical: string, maengde: number, enhed: string) => void;
  removeFridgeItem: (canonical: string) => void;
  clearFridge: () => void;
  toggleSavedRecipe: (slug: string) => void;
  saveRecipe: (slug: string, persons: number) => void;
  savePlan: (plan: Omit<SavedPlan, "id">) => void;
  removePlan: (id: string) => void;
  addUserRecipe: (recipe: Omit<UserRecipe, "id">) => void;
  removeUserRecipe: (id: string) => void;
  toggleCompletedPlan: (id: string) => void;
  toggleCompletedRecipe: (slug: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("weekli_state");
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AppState>;
        // Migrate old fridgeItems format (string[]) to FridgeItem[]
        if (Array.isArray(parsed.fridgeItems) && parsed.fridgeItems.length > 0 && typeof parsed.fridgeItems[0] === "string") {
          parsed.fridgeItems = [];
        }
        // Migrate old savedRecipes format (string[]) to SavedRecipe[]
        if (Array.isArray(parsed.savedRecipes) && parsed.savedRecipes.length > 0 && typeof parsed.savedRecipes[0] === "string") {
          parsed.savedRecipes = (parsed.savedRecipes as unknown as string[]).map((slug) => ({ slug, persons: 2 }));
        }
        // Ensure savedPlans exists
        if (!Array.isArray(parsed.savedPlans)) {
          parsed.savedPlans = [];
        }
        if (!Array.isArray(parsed.userRecipes)) {
          parsed.userRecipes = [];
        }
        if (!Array.isArray(parsed.completedPlanIds)) {
          parsed.completedPlanIds = [];
        }
        if (!Array.isArray(parsed.completedRecipeSlugs)) {
          parsed.completedRecipeSlugs = [];
        }
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
        toggleTagFilter: (tag) => update({
          tagFilters: state.tagFilters.includes(tag)
            ? state.tagFilters.filter((t) => t !== tag)
            : [...state.tagFilters, tag],
        }),
        clearTagFilters: () => update({ tagFilters: [] }),
        setTagFilters: (tags) => update({ tagFilters: tags }),
        setSearchQuery: (q) => update({ searchQuery: q }),
        setSearchType: (t) => update({ searchType: t }),
        addFridgeItem: (canonical, maengde, enhed) => update({
          fridgeItems: [
            ...state.fridgeItems.filter((f) => f.canonical.toUpperCase() !== canonical.toUpperCase()),
            { canonical: canonical.toUpperCase(), maengde, enhed },
          ],
        }),
        removeFridgeItem: (canonical) => update({
          fridgeItems: state.fridgeItems.filter(
            (f) => f.canonical.toUpperCase() !== canonical.toUpperCase()
          ),
        }),
        clearFridge: () => update({ fridgeItems: [] }),
        toggleSavedRecipe: (slug) => update({
          savedRecipes: state.savedRecipes.some((r) => r.slug === slug)
            ? state.savedRecipes.filter((r) => r.slug !== slug)
            : [...state.savedRecipes, { slug, persons: state.persons }],
        }),
        saveRecipe: (slug, persons) => update({
          savedRecipes: state.savedRecipes.some((r) => r.slug === slug)
            ? state.savedRecipes
            : [...state.savedRecipes, { slug, persons }],
        }),
        savePlan: (plan) => setState((prev) => {
          const id = String(Date.now());
          const next = { ...prev, savedPlans: [{ ...plan, id }, ...prev.savedPlans] };
          try { localStorage.setItem("weekli_state", JSON.stringify(next)); } catch { /* ignore */ }
          return next;
        }),
        removePlan: (id) => update({
          savedPlans: state.savedPlans.filter((p) => p.id !== id),
        }),
        addUserRecipe: (recipe) => setState((prev) => {
          const id = String(Date.now());
          const next = { ...prev, userRecipes: [...prev.userRecipes, { ...recipe, id }] };
          try { localStorage.setItem("weekli_state", JSON.stringify(next)); } catch { /* ignore */ }
          return next;
        }),
        removeUserRecipe: (id) => update({
          userRecipes: state.userRecipes.filter((r) => r.id !== id),
        }),
        toggleCompletedPlan: (id) => update({
          completedPlanIds: state.completedPlanIds.includes(id)
            ? state.completedPlanIds.filter((x) => x !== id)
            : [...state.completedPlanIds, id],
        }),
        toggleCompletedRecipe: (slug) => update({
          completedRecipeSlugs: state.completedRecipeSlugs.includes(slug)
            ? state.completedRecipeSlugs.filter((x) => x !== slug)
            : [...state.completedRecipeSlugs, slug],
        }),
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
