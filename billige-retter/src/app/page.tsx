"use client";

import { useMemo } from "react";
import RecipeCard from "@/components/RecipeCard";
import TopBar from "@/components/TopBar";
import { calcRecipePrice } from "@/lib/pricing";
import { filterRecipes } from "@/lib/weekly";
import { useApp } from "@/context/AppContext";
import { useRecipes } from "@/lib/recipes";
import { useProducts } from "@/lib/products";

export default function DailyPage() {
  const { state } = useApp();
  const { recipes } = useRecipes();
  const products = useProducts();

  const filtered = useMemo(() => {
    let list = filterRecipes(recipes, state.tagFilter);

    if (state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase();
      if (state.searchType === "retter") {
        list = list.filter(
          (r) =>
            r.titel.toLowerCase().includes(q) ||
            r.beskrivelse.toLowerCase().includes(q)
        );
      } else {
        list = list.filter((r) =>
          r.ingredienser.some((ing) => "canonical" in ing && ing.canonical.toLowerCase().includes(q))
        );
      }
    }

    return list
      .map((r) => ({
        recipe: r,
        price: calcRecipePrice(r, products, state.persons, state.selectedChains, state.prisLogik),
      }))
      .sort((a, b) => a.price.totalPris - b.price.totalPris)
      .slice(0, 20);
  }, [recipes, products, state]);

  return (
    <>
      <TopBar />
      <div className="px-4 py-4">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-gray-400 text-center">
              {recipes.length === 0
                ? "Ingen opskrifter endnu."
                : "Ingen retter matcher dine filtre."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map(({ recipe, price }) => (
              <RecipeCard key={recipe.slug} recipe={recipe} price={price} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
