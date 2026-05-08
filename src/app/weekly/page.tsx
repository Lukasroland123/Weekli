"use client";

import { useState, useEffect, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { useRecipes } from "@/lib/recipes";
import { useProducts } from "@/lib/products";
import { generateWeeklyPlan, calcPlanCost, buildPlanShoppingList, filterRecipes } from "@/lib/weekly";
import { formatPrice, formatRecipeAmount, calcRecipePrice } from "@/lib/pricing";
import { useVaegtLogik } from "@/lib/vaegt-logik";
import { Recipe, WeeklyPlan } from "@/lib/types";
import TopBar from "@/components/TopBar";

const DAY_COUNT_OPTIONS = [2, 3, 4, 5, 6, 7];

export default function WeeklyPage() {
  const { state, setWeekDays, toggleSavedRecipe, savePlan } = useApp();
  const { recipes } = useRecipes();
  const products = useProducts();
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [openPanel, setOpenPanel] = useState<"indkoeb" | "ingredienser" | null>(null);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [addingDay, setAddingDay] = useState<number | null>(null);
  const [addQuery, setAddQuery] = useState("");
  const vaegtLogik = useVaegtLogik();

  const activeProducts =
    state.selectedChains.length === 0
      ? products
      : products.filter((p) => state.selectedChains.includes(p.butik));

  useEffect(() => {
    const generated = generateWeeklyPlan(
      filterRecipes(recipes, state.tagFilters),
      products,
      state.selectedChains,
      state.prisLogik,
      state.persons,
      state.weekDays,
      state.fridgeItems
    );
    setPlan(generated);
    setAddingDay(null);
    setAddQuery("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipes, products, state]);

  function handleRemoveDay(idx: number) {
    if (!plan) return;
    const newDays = plan.days.map((d, i) =>
      i === idx ? { ...d, recipe: null } : d
    );
    const remaining = newDays.flatMap((d) => (d.recipe ? [d.recipe] : []));
    const totalPris = calcPlanCost(remaining, activeProducts, state.persons, state.fridgeItems);
    const indkoebsliste = buildPlanShoppingList(remaining, activeProducts, state.persons, state.fridgeItems);
    setPlan({ ...plan, days: newDays, totalPris, prPerPerson: state.persons > 0 ? totalPris / state.persons : totalPris, indkoebsliste });
    setExpandedDay(null);
  }

  function handleAddRecipe(idx: number, recipe: Recipe) {
    if (!plan) return;
    const newDays = plan.days.map((d, i) =>
      i === idx ? { ...d, recipe } : d
    );
    const allRecipes = newDays.flatMap((d) => (d.recipe ? [d.recipe] : []));
    const totalPris = calcPlanCost(allRecipes, activeProducts, state.persons, state.fridgeItems);
    const indkoebsliste = buildPlanShoppingList(allRecipes, activeProducts, state.persons, state.fridgeItems);
    setPlan({ ...plan, days: newDays, totalPris, prPerPerson: state.persons > 0 ? totalPris / state.persons : totalPris, indkoebsliste });
    setAddingDay(null);
    setAddQuery("");
  }

  function handleSavePlan() {
    if (!plan) return;
    const slugs = plan.days.flatMap((d) => d.recipe ? [d.recipe.slug] : []);
    const d = new Date();
    const date = `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
    savePlan({ date, persons: state.persons, slugs });
  }

  // Recommendations for a given empty day slot
  const recommendations = useMemo(() => {
    if (addingDay === null || !plan) return [];
    const usedSlugs = new Set(plan.days.flatMap((d) => d.recipe ? [d.recipe.slug] : []));
    const currentRecipes = plan.days.flatMap((d, i) => (d.recipe && i !== addingDay) ? [d.recipe] : []);
    const baseCost = calcPlanCost(currentRecipes, activeProducts, state.persons, state.fridgeItems);
    const eligible = recipes.filter((r) => !usedSlugs.has(r.slug));
    return eligible
      .map((r) => ({
        recipe: r,
        marginal: calcPlanCost([...currentRecipes, r], activeProducts, state.persons, state.fridgeItems) - baseCost,
      }))
      .sort((a, b) => a.marginal - b.marginal)
      .slice(0, 3)
      .map((x) => x.recipe);
  }, [addingDay, plan, recipes, activeProducts, state.persons, state.fridgeItems]);

  // Filtered search results (when user types)
  const searchResults = useMemo(() => {
    const q = addQuery.trim().toLowerCase();
    if (!q) return [];
    const usedSlugs = new Set(plan?.days.flatMap((d) => d.recipe ? [d.recipe.slug] : []) ?? []);
    return recipes
      .filter((r) => !usedSlugs.has(r.slug) && r.titel.toLowerCase().includes(q))
      .slice(0, 6);
  }, [addQuery, recipes, plan]);

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

        {/* Liste-knapper */}
        {plan && plan.days.some((d) => d.recipe) && (
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setOpenPanel((p) => (p === "indkoeb" ? null : "indkoeb"))}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                openPanel === "indkoeb"
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-white text-gray-700 border-gray-200"
              }`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              Indkøbsliste
            </button>
            <button
              onClick={() => setOpenPanel((p) => (p === "ingredienser" ? null : "ingredienser"))}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                openPanel === "ingredienser"
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-white text-gray-700 border-gray-200"
              }`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
              Ingredienser
            </button>
          </div>
        )}

        {/* Samlet indkøbsliste */}
        {openPanel === "indkoeb" && plan && (
          <div className="mb-4 border border-gray-100 rounded-2xl overflow-hidden">
            <ul className="divide-y divide-gray-50">
              {plan.indkoebsliste.map((item) => (
                <li key={item.id} className="flex items-center justify-between bg-white px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{item.navn}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {item.pakker > 1 ? `${item.pakker}× ` : ""}{item.maengde} {item.maengdeEnhed} · {item.butik}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-gray-800 shrink-0 ml-3">
                    {formatPrice(item.pris)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between font-semibold text-gray-900 px-4 py-3 bg-gray-50 border-t border-gray-100">
              <span>Total</span>
              <span className="text-green-600">{formatPrice(plan.totalPris)}</span>
            </div>
          </div>
        )}

        {/* Samlet ingrediensliste */}
        {openPanel === "ingredienser" && plan && (
          <div className="mb-4 bg-green-50 border border-green-100 rounded-2xl overflow-hidden">
            <ul className="divide-y divide-green-100">
              {plan.days
                .flatMap((d) => d.recipe?.ingredienser ?? [])
                .filter((ing) => !("placeholder" in ing))
                .reduce<{ canonical: string; total: number; enhed: string }[]>((acc, ing) => {
                  const ingDef = ing as import("@/lib/types").RecipeIngredientDef;
                  const canonical = ingDef.canonical.toUpperCase();
                  const needed = Math.max(ingDef.maengde * state.persons, ingDef.minTotal ?? 0);
                  const existing = acc.find((x) => x.canonical === canonical);
                  if (existing) { existing.total += needed; } else { acc.push({ canonical, total: needed, enhed: ingDef.enhed }); }
                  return acc;
                }, [])
                .sort((a, b) => a.canonical.localeCompare(b.canonical))
                .map(({ canonical, total, enhed }) => (
                  <li key={canonical} className="flex items-center justify-between px-4 py-2.5 bg-green-50">
                    <span className="text-sm text-gray-700 capitalize">{canonical.toLowerCase()}</span>
                    <span className="text-sm text-gray-500">
                      {total >= 1000 && (enhed === "g" || enhed === "ml")
                        ? `${(total / 1000).toFixed(1).replace(".0", "")} ${enhed === "g" ? "kg" : "l"}`
                        : enhed === "stk"
                        ? `${total % 1 === 0 ? total : total.toFixed(1)} stk`
                        : `${Math.round(total)} ${enhed}`}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        )}

        {state.fridgeItems.length > 0 && (
          <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2">
            <span className="text-green-600 text-xs">🧊</span>
            <p className="text-xs text-green-700">
              {state.fridgeItems.length} vare{state.fridgeItems.length !== 1 ? "r" : ""} fra køleskabet trækkes fra prisen
            </p>
          </div>
        )}

        {/* Day cards */}
        {plan && (
          <div className="space-y-3 mb-6">
            {plan.days.map((dayPlan, idx) => (
              <div key={dayPlan.day} className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                {dayPlan.recipe ? (
                  <>
                    {/* Header row — click to expand */}
                    <button
                      className="w-full flex items-center gap-3 p-3 text-left"
                      onClick={() => setExpandedDay(expandedDay === idx ? null : idx)}
                    >
                      {dayPlan.recipe.imageUrl && (
                        <img
                          src={dayPlan.recipe.imageUrl}
                          alt={dayPlan.recipe.titel}
                          className="w-14 h-14 rounded-xl object-cover shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-400 font-medium">{dayPlan.day}</p>
                        <p className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
                          {dayPlan.recipe.titel}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <svg
                          width="14" height="14" viewBox="0 0 24 24" fill="none"
                          stroke="#9ca3af" strokeWidth="2"
                          className={`transition-transform ${expandedDay === idx ? "rotate-180" : ""}`}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                        <div
                          role="button"
                          onClick={(e) => { e.stopPropagation(); toggleSavedRecipe(dayPlan.recipe!.slug); }}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 ml-1"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24"
                            fill={state.savedRecipes.some((r) => r.slug === dayPlan.recipe!.slug) ? "#16a34a" : "none"}
                            stroke={state.savedRecipes.some((r) => r.slug === dayPlan.recipe!.slug) ? "#16a34a" : "#9ca3af"}
                            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          >
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                          </svg>
                        </div>
                        <div
                          role="button"
                          onClick={(e) => { e.stopPropagation(); handleRemoveDay(idx); }}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 ml-1"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </div>
                      </div>
                    </button>

                    {/* Expanded panel */}
                    {expandedDay === idx && (
                      <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-4">
                        {(() => {
                          const price = calcRecipePrice(dayPlan.recipe!, products, state.persons, state.selectedChains, state.prisLogik, state.fridgeItems);
                          return (
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ingredienser</p>
                              <div className="bg-green-50 border border-green-100 rounded-xl p-3 space-y-1.5">
                                {price.matchede.map((m) => (
                                  <div key={m.canonical} className="flex justify-between text-sm text-gray-700">
                                    <span className="capitalize">{m.canonical.toLowerCase()}</span>
                                    <span className="text-gray-500">{formatRecipeAmount(m.canonical, m.maengdeBehoevet, m.enhed, vaegtLogik)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                        {dayPlan.recipe.fremgangsmaade && dayPlan.recipe.fremgangsmaade.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Fremgangsmåde</p>
                            <ol className="space-y-2">
                              {dayPlan.recipe.fremgangsmaade.map((step, i) => (
                                <li key={i} className="flex gap-3">
                                  <span className="shrink-0 w-5 h-5 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                                    {i + 1}
                                  </span>
                                  <p className="text-sm text-gray-600 leading-relaxed">{step}</p>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  /* Empty day slot */
                  <>
                    <button
                      className="w-full flex items-center gap-3 p-3 text-left"
                      onClick={() => { setAddingDay(addingDay === idx ? null : idx); setAddQuery(""); }}
                    >
                      <div className="w-14 h-14 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-400 font-medium">{dayPlan.day}</p>
                        <p className="text-sm text-green-600 font-medium">Tilføj ret</p>
                      </div>
                      <svg
                        width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="#9ca3af" strokeWidth="2"
                        className={`shrink-0 transition-transform ${addingDay === idx ? "rotate-180" : ""}`}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>

                    {/* Add recipe panel */}
                    {addingDay === idx && (
                      <div className="border-t border-gray-100 px-3 pb-3 pt-3 space-y-2">
                        {/* Search */}
                        <div className="relative">
                          <input
                            type="text"
                            value={addQuery}
                            onChange={(e) => setAddQuery(e.target.value)}
                            placeholder="Søg på en ret..."
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-green-500"
                            autoFocus
                          />
                          {addQuery && (
                            <button
                              onClick={() => setAddQuery("")}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                              </svg>
                            </button>
                          )}
                        </div>

                        {/* Results */}
                        {(addQuery ? searchResults : recommendations).map((recipe) => (
                          <button
                            key={recipe.slug}
                            onClick={() => handleAddRecipe(idx, recipe)}
                            className="w-full flex items-center gap-3 bg-gray-50 hover:bg-green-50 border border-gray-100 hover:border-green-200 rounded-xl px-3 py-2.5 text-left transition-colors"
                          >
                            {recipe.imageUrl && (
                              <img src={recipe.imageUrl} alt={recipe.titel} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 line-clamp-1">{recipe.titel}</p>
                              {!addQuery && (
                                <p className="text-xs text-green-600">
                                  {formatPrice(calcPlanCost(
                                    [...plan.days.flatMap((d, i) => (d.recipe && i !== idx) ? [d.recipe] : []), recipe],
                                    activeProducts, state.persons, state.fridgeItems
                                  ) - calcPlanCost(
                                    plan.days.flatMap((d, i) => (d.recipe && i !== idx) ? [d.recipe] : []),
                                    activeProducts, state.persons, state.fridgeItems
                                  ))} mere
                                </p>
                              )}
                            </div>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                          </button>
                        ))}

                        {addQuery && searchResults.length === 0 && (
                          <p className="text-xs text-gray-400 text-center py-2">Ingen retter fundet</p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Save plan button */}
        {plan && plan.days.some((d) => d.recipe) && (() => {
          const currentSlugs = plan.days.flatMap((d) => d.recipe ? [d.recipe.slug] : []);
          const planSaved = state.savedPlans.some(
            (saved) =>
              saved.persons === state.persons &&
              saved.slugs.length === currentSlugs.length &&
              saved.slugs.every((s, i) => s === currentSlugs[i])
          );
          return (
            <button
              onClick={handleSavePlan}
              disabled={planSaved}
              className={`w-full py-3.5 rounded-2xl font-semibold text-base transition-colors flex items-center justify-center gap-2 ${
                planSaved ? "bg-gray-100 text-gray-400 cursor-default" : "bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24"
                fill={planSaved ? "#9ca3af" : "white"}
                stroke={planSaved ? "#9ca3af" : "white"}
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
              {planSaved ? "Ugeplanen er gemt" : "Gem hele ugeplanen"}
            </button>
          );
        })()}

        {recipes.length === 0 && (
          <p className="text-gray-400 text-center py-10">Ingen opskrifter endnu.</p>
        )}
      </div>
    </>
  );
}
