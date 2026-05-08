"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { useProducts } from "@/lib/products";
import { useRecipes } from "@/lib/recipes";
import { calcRecipePrice, formatPrice } from "@/lib/pricing";
import vaegtLogikJson from "@/data/vaegt-logik.json";

const vl_map: Record<string, { stkVaegt: number }> = {};
for (const entry of vaegtLogikJson as Array<{ kategori: string; stkVaegt: number; enhed: string }>) {
  vl_map[entry.kategori.toUpperCase()] = { stkVaegt: entry.stkVaegt };
}

export default function KoeleskabPage() {
  const { state, addFridgeItem, removeFridgeItem, clearFridge } = useApp();
  const products = useProducts();
  const { recipes } = useRecipes();

  const [query, setQuery] = useState("");
  const [pendingCanonical, setPendingCanonical] = useState<string | null>(null);
  const [pendingMaengde, setPendingMaengde] = useState("");
  const [pendingEnhed, setPendingEnhed] = useState("g");

  const allCanonicals = useMemo(() => {
    const set = new Set(products.map((p) => p.kategori.toUpperCase()));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || pendingCanonical) return [];
    return allCanonicals
      .filter(
        (c) =>
          c.toLowerCase().includes(q) &&
          !state.fridgeItems.some((f) => f.canonical.toUpperCase() === c)
      )
      .slice(0, 8);
  }, [query, allCanonicals, state.fridgeItems, pendingCanonical]);

  const availableUnits = useMemo(() => {
    if (!pendingCanonical) return ["g"];
    const isLiquid = products.some(
      (p) => p.kategori.toUpperCase() === pendingCanonical && ["ml", "l"].includes(p.maengdeEnhed)
    );
    const hasStkConversion = !!vl_map[pendingCanonical.toUpperCase()];
    if (isLiquid) return ["ml", "l"];
    if (hasStkConversion) return ["stk", "g"];
    return ["g"];
  }, [pendingCanonical, products]);

  function selectCanonical(canonical: string) {
    setPendingCanonical(canonical);
    setQuery("");
    const isLiquid = products.some(
      (p) => p.kategori.toUpperCase() === canonical && ["ml", "l"].includes(p.maengdeEnhed)
    );
    const hasStkConversion = !!vl_map[canonical.toUpperCase()];
    if (hasStkConversion) setPendingEnhed("stk");
    else if (isLiquid) setPendingEnhed("ml");
    else setPendingEnhed("g");
    setPendingMaengde("");
  }

  function confirmAdd() {
    if (!pendingCanonical) return;
    const amount = parseFloat(pendingMaengde);
    if (!amount || amount <= 0) return;
    addFridgeItem(pendingCanonical, amount, pendingEnhed);
    setPendingCanonical(null);
    setPendingMaengde("");
  }

  function cancelPending() {
    setPendingCanonical(null);
    setPendingMaengde("");
    setQuery("");
  }

  function stkHint(canonical: string, maengde: number): string | null {
    const vl = vl_map[canonical.toUpperCase()];
    if (!vl || !maengde) return null;
    return `≈ ${Math.round(maengde * vl.stkVaegt)} g`;
  }

  const recipeSuggestions = useMemo(() => {
    if (state.fridgeItems.length === 0) return [];
    const fridgeCanonicals = new Set(state.fridgeItems.map((f) => f.canonical.toUpperCase()));
    const matching = recipes.filter((r) =>
      r.ingredienser.some(
        (ing) => !("placeholder" in ing) && fridgeCanonicals.has((ing as import("@/lib/types").RecipeIngredientDef).canonical.toUpperCase())
      )
    );
    return matching
      .map((r) => ({
        recipe: r,
        price: calcRecipePrice(r, products, state.persons, state.selectedChains, state.prisLogik, state.fridgeItems),
      }))
      .sort((a, b) => a.price.totalPris - b.price.totalPris)
      .slice(0, 5);
  }, [state.fridgeItems, state.persons, state.selectedChains, state.prisLogik, recipes, products]);

  const fridgeCount = state.fridgeItems.length;

  return (
    <div className="pb-24 px-4 pt-5 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Køleskab</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Ingredienser du har hjemme trækkes fra prisen.
        </p>
      </div>

      {/* Search bar */}
      {!pendingCanonical && (
        <div className="relative mb-3">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && suggestions.length > 0) selectCanonical(suggestions[0]);
            }}
            placeholder="Søg på en vare, f.eks. kylling..."
            className="w-full bg-white border border-gray-200 shadow-sm rounded-2xl pl-10 pr-10 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-green-500"
          />
          {query.trim() && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Autocomplete suggestions */}
      {suggestions.length > 0 && (
        <ul className="mb-3 bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden divide-y divide-gray-50">
          {suggestions.map((c) => (
            <li key={c}>
              <button
                onClick={() => selectCanonical(c)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-green-50 transition-colors text-left"
              >
                <span className="text-sm text-gray-700 capitalize">{c.toLowerCase()}</span>
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Amount input panel */}
      {pendingCanonical && (
        <div className="mb-4 bg-white border border-gray-200 shadow-sm rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <p className="text-sm font-semibold text-gray-800 capitalize">{pendingCanonical.toLowerCase()}</p>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <input
              type="number"
              min="0"
              step="any"
              value={pendingMaengde}
              onChange={(e) => setPendingMaengde(e.target.value)}
              placeholder="Mængde"
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-green-500"
              autoFocus
            />
            <div className="flex gap-1">
              {availableUnits.map((u) => (
                <button
                  key={u}
                  onClick={() => setPendingEnhed(u)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    pendingEnhed === u ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
          {pendingEnhed === "stk" && pendingMaengde && parseFloat(pendingMaengde) > 0 && (
            <p className="text-xs text-gray-400 mb-3">{stkHint(pendingCanonical, parseFloat(pendingMaengde))}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={confirmAdd}
              disabled={!pendingMaengde || parseFloat(pendingMaengde) <= 0}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
            >
              Tilføj
            </button>
            <button
              onClick={cancelPending}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              Annuller
            </button>
          </div>
        </div>
      )}

      {/* Fridge items */}
      {fridgeCount > 0 ? (
        <section className="mb-5">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              I køleskabet ({fridgeCount})
            </p>
            <button
              onClick={clearFridge}
              className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors"
            >
              Ryd alt
            </button>
          </div>
          <ul className="space-y-2">
            {state.fridgeItems.map((item) => {
              const hint = item.enhed === "stk" ? stkHint(item.canonical, item.maengde) : null;
              return (
                <li
                  key={item.canonical}
                  className="flex items-center justify-between bg-white border border-gray-100 shadow-sm rounded-xl px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    <div>
                      <span className="text-sm font-medium text-gray-800 capitalize">
                        {item.canonical.toLowerCase()}
                      </span>
                      <span className="text-sm text-gray-500 ml-1.5">
                        {item.maengde} {item.enhed}
                        {hint && <span className="text-xs text-gray-400 ml-1">{hint}</span>}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFridgeItem(item.canonical)}
                    className="text-gray-300 hover:text-red-400 transition-colors"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-gray-400 mt-2.5 px-1">
            Disse varer trækkes automatisk fra prisen på alle retter.
          </p>
        </section>
      ) : (
        !pendingCanonical && !query.trim() && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-white border border-gray-100 shadow-sm rounded-2xl flex items-center justify-center mb-4">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2" />
                <line x1="5" y1="9" x2="19" y2="9" />
                <line x1="9" y1="14" x2="9" y2="16" />
                <line x1="15" y1="14" x2="15" y2="16" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-500">Køleskabet er tomt</p>
            <p className="text-xs text-gray-400 mt-1">Søg på en vare herover for at tilføje den.</p>
          </div>
        )
      )}

      {/* Recipe suggestions */}
      {recipeSuggestions.length > 0 && (
        <section>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">
            Retter du kan lave
          </p>
          <ul className="space-y-2">
            {recipeSuggestions.map(({ recipe, price }) => (
              <li key={recipe.slug}>
                <Link
                  href={`/opskrift/${recipe.slug}`}
                  className="flex items-center justify-between bg-white border border-gray-100 shadow-sm rounded-xl px-4 py-3 hover:bg-green-50 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-800">{recipe.titel}</span>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-sm font-semibold text-green-600">{formatPrice(price.totalPris)}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
