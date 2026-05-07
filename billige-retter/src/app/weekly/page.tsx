"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { useRecipes } from "@/lib/recipes";
import { useProducts } from "@/lib/products";
import { generateWeeklyPlan } from "@/lib/weekly";
import { calcRecipePrice, formatPrice } from "@/lib/pricing";
import { WeeklyPlan, Recipe } from "@/lib/types";
import TopBar from "@/components/TopBar";
import { useShopping } from "@/context/ShoppingContext";
import { buildShoppingList } from "@/lib/pricing";

const DAY_COUNT_OPTIONS = [2, 3, 4, 5, 6, 7];

export default function WeeklyPage() {
  const { state, setWeekDays } = useApp();
  const { addItems } = useShopping();
  const { recipes } = useRecipes();
  const products = useProducts();
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [addedAll, setAddedAll] = useState(false);

  useEffect(() => {
    const generated = generateWeeklyPlan(
      recipes,
      products,
      state.selectedChains,
      state.prisLogik,
      state.persons,
      state.weekDays
    );
    setPlan(generated);
    setAddedAll(false);
  }, [recipes, products, state.selectedChains, state.prisLogik, state.persons, state.weekDays]);

  function handleAddAll() {
    if (!plan) return;
    for (const { recipe } of plan.days) {
      if (!recipe) continue;
      const price = calcRecipePrice(recipe, products, state.persons, state.selectedChains, state.prisLogik);
      addItems(buildShoppingList(recipe, price.matchede));
    }
    setAddedAll(true);
  }

  function handleRemoveDay(idx: number) {
    if (!plan) return;
    const newDays = [...plan.days];
    newDays[idx] = { ...newDays[idx], recipe: null };
    const totalPris = newDays.reduce((sum, d) => {
      if (!d.recipe) return sum;
      return sum + calcRecipePrice(d.recipe, products, state.persons, state.selectedChains, state.prisLogik).totalPris;
    }, 0);
    setPlan({ ...plan, days: newDays, totalPris, prPerPerson: state.persons > 0 ? totalPris / state.persons : totalPris });
  }

  return (
    <>
      <TopBar />
      <div className="px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-gray-400 font-medium mb-1">Antal dage</p>
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {DAY_COUNT_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => setWeekDays(n)}
                  className={`w-8 h-7 rounded-lg text-xs font-semibold transition-colors ${
                    state.weekDays === n ? "bg-white text-green-600 shadow-sm" : "text-gray-500"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          {plan && (
            <div className="text-right">
              <p className="text-lg font-bold text-green-600">{formatPrice(plan.totalPris)}</p>
              <p className="text-xs text-gray-400">{formatPrice(plan.prPerPerson)}/pers.</p>
            </div>
          )}
        </div>

        {/* Day cards */}
        {plan && (
          <div className="space-y-3 mb-6">
            {plan.days.map((dayPlan, idx) => (
              <div key={dayPlan.day} className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                {dayPlan.recipe ? (
                  <div className="flex items-center gap-3 p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 font-medium">{dayPlan.day}</p>
                      <p className="font-semibold text-gray-900 text-sm leading-tight line-clamp-1">
                        {dayPlan.recipe.titel}
                      </p>
                      <p className="text-sm text-green-600 font-medium">
                        {formatPrice(calcRecipePrice(dayPlan.recipe, products, state.persons, state.selectedChains, state.prisLogik).totalPris)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveDay(idx)}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 shrink-0"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-400 font-medium">{dayPlan.day}</p>
                      <p className="text-sm text-gray-400">Ingen ret valgt</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add all button */}
        {plan && (
          <button
            onClick={handleAddAll}
            disabled={addedAll}
            className={`w-full py-3.5 rounded-2xl font-semibold text-base transition-colors ${
              addedAll ? "bg-gray-100 text-gray-400 cursor-default" : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            {addedAll ? "Tilføjet til indkøbsliste" : "Tilføj hele ugeplan til indkøbsliste"}
          </button>
        )}

        {recipes.length === 0 && (
          <p className="text-gray-400 text-center py-10">Ingen opskrifter endnu.</p>
        )}
      </div>
    </>
  );
}
