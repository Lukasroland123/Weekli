"use client";

import { useMemo } from "react";
import RecipeCard from "@/components/RecipeCard";
import TopBar from "@/components/TopBar";
import { calcRecipePrice, formatPrice } from "@/lib/pricing";
import { filterRecipes } from "@/lib/weekly";
import { useApp } from "@/context/AppContext";
import { useRecipes } from "@/lib/recipes";
import { useProducts } from "@/lib/products";
import { Product } from "@/lib/types";

export default function DailyPage() {
  const { state } = useApp();
  const { recipes } = useRecipes();
  const products = useProducts();

  const filteredRecipes = useMemo(() => {
    if (state.searchType === "varer") return [];

    let list = filterRecipes(recipes, state.tagFilters);

    if (state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          r.titel.toLowerCase().includes(q) ||
          r.beskrivelse.toLowerCase().includes(q)
      );
    }

    const priced = list.map((r) => ({
      recipe: r,
      price: calcRecipePrice(r, products, state.persons, state.selectedChains, state.prisLogik, state.fridgeItems),
    }));

    if (state.prisLogik === "tilbud") {
      return priced.sort((a, b) => b.price.sparPris - a.price.sparPris);
    }
    return priced.sort((a, b) => a.price.totalPris - b.price.totalPris);
  }, [recipes, products, state]);

  const filteredProducts = useMemo(() => {
    if (state.searchType !== "varer") return null;

    const q = state.searchQuery.trim().toLowerCase();
    if (!q) return [];

    const activeProducts =
      state.selectedChains.length === 0
        ? products
        : products.filter((p) => state.selectedChains.includes(p.butik));

    const matched = activeProducts.filter(
      (p) =>
        p.kategori.toLowerCase().includes(q) ||
        p.produktnavn.toLowerCase().includes(q)
    );

    // Group by kategori, sort groups alphabetically, within group sort by price
    const groups = new Map<string, Product[]>();
    for (const p of matched) {
      const key = p.kategori.toUpperCase();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }
    for (const [, list] of groups) {
      list.sort((a, b) => a.normalPris - b.normalPris);
    }

    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [products, state]);

  return (
    <>
      <TopBar />
      <div className="px-4 py-4">
        {/* Varer-visning */}
        {state.searchType === "varer" && (
          <>
            {!state.searchQuery.trim() ? (
              <div className="flex items-center justify-center py-20">
                <p className="text-gray-400 text-center text-sm">
                  Søg på en vare, f.eks. "kylling" eller "kartofler"
                </p>
              </div>
            ) : filteredProducts && filteredProducts.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <p className="text-gray-400 text-center text-sm">Ingen varer fundet.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {filteredProducts?.map(([kategori, prods]) => (
                  <div key={kategori}>
                    <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
                      {kategori}
                    </h2>
                    <ul className="space-y-2">
                      {prods.map((p, i) => (
                        <li
                          key={i}
                          className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-800">{p.produktnavn}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {p.maengde} {p.maengdeEnhed} · {p.butik}
                              {p.paTilbud && (
                                <span className="ml-1.5 bg-yellow-100 text-yellow-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">
                                  Tilbud
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="text-right shrink-0 ml-3">
                            {p.paTilbud && p.foerPris && p.foerPris > p.normalPris ? (
                              <>
                                <span className="text-xs text-gray-400 line-through">{formatPrice(p.foerPris)}</span>
                                <span className="block text-sm font-semibold text-green-600">{formatPrice(p.normalPris)}</span>
                                <span className="block text-[11px] text-green-600 font-medium">Spar {formatPrice(p.foerPris - p.normalPris)}</span>
                              </>
                            ) : (
                              <span className="text-sm font-semibold text-gray-800">{formatPrice(p.normalPris)}</span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Retter-visning */}
        {state.searchType === "retter" && (
          <>
            {filteredRecipes.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <p className="text-gray-400 text-center">
                  {recipes.length === 0
                    ? "Ingen opskrifter endnu."
                    : "Ingen retter matcher dine filtre."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredRecipes.map(({ recipe, price }) => (
                  <RecipeCard key={recipe.slug} recipe={recipe} price={price} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
