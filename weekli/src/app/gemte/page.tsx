"use client";

import { useState } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { useRecipes } from "@/lib/recipes";
import { useProducts } from "@/lib/products";
import { calcRecipePrice, formatPrice, formatRecipeAmount } from "@/lib/pricing";
import { buildPlanShoppingList, calcPlanCost } from "@/lib/weekly";
import { useVaegtLogik } from "@/lib/vaegt-logik";
import { Recipe } from "@/lib/types";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80";
const TAG_IMAGES: Record<string, string> = {
  fisk:    "https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=800&q=80",
  kylling: "https://images.unsplash.com/photo-1598103442097-8b74394b95c2?w=800&q=80",
  kød:     "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&q=80",
  vegetar: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80",
};

const PERSONS_OPTIONS = [1, 2, 3, 4, 5, 6];

// Reusable recipe expand panel used inside both plan cards and individual cards
function RecipeExpandPanel({
  recipe,
  persons,
  products,
  state,
  vaegtLogik,
}: {
  recipe: Recipe;
  persons: number;
  products: ReturnType<typeof useProducts>;
  state: ReturnType<typeof useApp>["state"];
  vaegtLogik: ReturnType<typeof useVaegtLogik>;
}) {
  const price = calcRecipePrice(recipe, products, persons, state.selectedChains, state.prisLogik, state.fridgeItems);
  return (
    <div className="space-y-3">
      {price.matchede.length > 0 && (
        <div className="bg-green-50 border border-green-100 rounded-xl p-3 space-y-1.5">
          {price.matchede.map((m) => (
            <div key={m.canonical} className="flex justify-between text-sm text-gray-700">
              <span className="capitalize">{m.canonical.toLowerCase()}</span>
              <span className="text-gray-500">{formatRecipeAmount(m.canonical, m.maengdeBehoevet, m.enhed, vaegtLogik)}</span>
            </div>
          ))}
          {recipe.basisvarer.length > 0 && (
            <div className="pt-1.5 mt-1.5 border-t border-green-100">
              <p className="text-xs text-gray-400">{recipe.basisvarer.join(", ")}</p>
            </div>
          )}
        </div>
      )}
      {recipe.fremgangsmaade && recipe.fremgangsmaade.length > 0 && (
        <ol className="space-y-2">
          {recipe.fremgangsmaade.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <p className="text-sm text-gray-600 leading-relaxed">{step}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default function GemtePage() {
  const { state, toggleSavedRecipe, removePlan, toggleCompletedPlan, toggleCompletedRecipe } = useApp();
  const { recipes } = useRecipes();
  const products = useProducts();
  const vaegtLogik = useVaegtLogik();

  // Plan cards state
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [planPersons, setPlanPersons] = useState<Record<string, number>>({});
  const [expandedPlanRecipe, setExpandedPlanRecipe] = useState<Record<string, string | null>>({});
  const [openShoppingPlanId, setOpenShoppingPlanId] = useState<string | null>(null);

  // Individual recipe cards state
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [personsMap, setPersonsMap] = useState<Record<string, number>>({});
  const [openShoppingRecipeSlug, setOpenShoppingRecipeSlug] = useState<string | null>(null);

  const savedRecipes = recipes.filter((r) => state.savedRecipes.some((e) => e.slug === r.slug));
  const hasAnything = state.savedPlans.length > 0 || savedRecipes.length > 0;

  function getPlanPersons(id: string, defaultPersons: number) {
    return planPersons[id] ?? defaultPersons;
  }

  function getRecipePersons(slug: string) {
    if (personsMap[slug] !== undefined) return personsMap[slug];
    return state.savedRecipes.find((e) => e.slug === slug)?.persons ?? state.persons;
  }

  function handleExpandIndividual(slug: string) {
    if (expandedSlug === slug) { setExpandedSlug(null); return; }
    if (personsMap[slug] === undefined) {
      const saved = state.savedRecipes.find((e) => e.slug === slug);
      if (saved) setPersonsMap((p) => ({ ...p, [slug]: saved.persons }));
    }
    setExpandedSlug(slug);
  }

  if (!hasAnything) {
    return (
      <div className="pb-24 px-4 pt-5">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Gemte retter</h1>
        <p className="text-sm text-gray-400 mb-8">Gem en ugeplan eller bogmærk enkelt-retter.</p>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-4">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          <p className="text-gray-400 text-sm">Intet gemt endnu.</p>
          <p className="text-gray-300 text-xs mt-1">Gem en ugeplan fra Planner, eller bogmærk enkelt-retter.</p>
          <Link href="/weekly" className="mt-6 px-5 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl">
            Gå til Planner
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 px-4 pt-5">
      <h1 className="text-2xl font-bold text-gray-900 mb-5">Gemte retter</h1>

      {/* Saved plans */}
      {state.savedPlans.length > 0 && (
        <div className="space-y-3 mb-6">
          {state.savedPlans.map((plan) => {
            const isExpanded = expandedPlanId === plan.id;
            const persons = getPlanPersons(plan.id, plan.persons);
            const planRecipes = plan.slugs.flatMap((slug) => {
              const r = recipes.find((x) => x.slug === slug);
              return r ? [r] : [];
            });
            const activeProducts =
              state.selectedChains.length === 0
                ? products
                : products.filter((p) => state.selectedChains.includes(p.butik));
            const totalPris = calcPlanCost(planRecipes, activeProducts, persons, state.fridgeItems);

            return (
              <div key={plan.id} className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden">
                {/* Plan header */}
                <button
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                  onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                >
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">Madplan {plan.date}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {plan.persons} personer · {formatPrice(totalPris)} · {planRecipes.length} dage
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"
                      className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                    {(() => {
                      const isDone = state.completedPlanIds.includes(plan.id);
                      return (
                        <div
                          role="button"
                          onClick={(e) => { e.stopPropagation(); toggleCompletedPlan(plan.id); }}
                          title={isDone ? "Markér som ikke lavet" : "Markér som lavet"}
                          className={`w-8 h-8 flex items-center justify-center rounded-full ml-1 transition-colors cursor-pointer border ${
                            isDone ? "bg-green-600 border-green-600" : "bg-white border-gray-200 text-gray-400 hover:border-green-400"
                          }`}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                            stroke={isDone ? "white" : "currentColor"} strokeWidth="2.5"
                            strokeLinecap="round" strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      );
                    })()}
                    <div
                      role="button"
                      onClick={(e) => { e.stopPropagation(); removePlan(plan.id); }}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-400 hover:text-red-500 ml-1 transition-colors cursor-pointer"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </div>
                  </div>
                </button>

                {/* Expanded plan */}
                {isExpanded && (
                  <div className="border-t border-gray-200 px-4 pb-4 pt-3 space-y-3 bg-white">
                    {/* Persons selector + shopping list button */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm text-gray-500">Personer:</span>
                      <div className="flex gap-1">
                        {PERSONS_OPTIONS.map((n) => (
                          <button
                            key={n}
                            onClick={() => setPlanPersons((p) => ({ ...p, [plan.id]: n }))}
                            className={`w-8 h-8 rounded-full text-xs font-semibold transition-colors ${
                              persons === n ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setOpenShoppingPlanId(openShoppingPlanId === plan.id ? null : plan.id)}
                        className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                          openShoppingPlanId === plan.id
                            ? "bg-green-600 text-white border-green-600"
                            : "bg-white text-gray-700 border-gray-200"
                        }`}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
                        </svg>
                        Indkøbsliste
                      </button>
                    </div>

                    {/* Shopping list panel */}
                    {openShoppingPlanId === plan.id && (() => {
                      const shoppingList = buildPlanShoppingList(planRecipes, activeProducts, persons, state.fridgeItems);
                      return (
                        <div className="border border-gray-100 rounded-xl overflow-hidden">
                          <ul className="divide-y divide-gray-50">
                            {shoppingList.map((item) => (
                              <li key={item.id} className="flex items-center justify-between bg-white px-3 py-2.5">
                                <div>
                                  <p className="text-sm font-medium text-gray-800">{item.navn}</p>
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    {item.pakker > 1 ? `${item.pakker}× ` : ""}{item.maengde} {item.maengdeEnhed} · {item.butik}
                                  </p>
                                </div>
                                <span className="text-sm font-semibold text-gray-700 shrink-0 ml-3">
                                  {formatPrice(item.pris)}
                                </span>
                              </li>
                            ))}
                          </ul>
                          <div className="flex justify-between font-semibold text-gray-900 px-3 py-2.5 bg-gray-50 border-t border-gray-100 text-sm">
                            <span>Total</span>
                            <span className="text-green-600">{formatPrice(shoppingList.reduce((s, i) => s + i.pris, 0))}</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Total price */}
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm font-semibold text-gray-700">Samlet pris</span>
                      <span className="text-lg font-bold text-green-600">{formatPrice(totalPris)}</span>
                    </div>

                    {/* Recipe list */}
                    {planRecipes.map((recipe) => {
                      const recipePrice = calcRecipePrice(recipe, products, persons, state.selectedChains, state.prisLogik, state.fridgeItems);
                      const imageUrl = recipe.imageUrl ?? TAG_IMAGES[recipe.tags[0]] ?? FALLBACK_IMAGE;
                      const isRecipeExpanded = expandedPlanRecipe[plan.id] === recipe.slug;

                      return (
                        <div key={recipe.slug} className="border border-gray-100 rounded-xl overflow-hidden">
                          <button
                            className="w-full flex items-center gap-3 p-3 text-left"
                            onClick={() => setExpandedPlanRecipe((prev) => ({
                              ...prev,
                              [plan.id]: isRecipeExpanded ? null : recipe.slug,
                            }))}
                          >
                            <img src={imageUrl} alt={recipe.titel} className="w-11 h-11 rounded-lg object-cover shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 line-clamp-1">{recipe.titel}</p>
                              <p className="text-xs text-green-600 mt-0.5">{formatPrice(recipePrice.totalPris)}</p>
                            </div>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"
                              className={`shrink-0 transition-transform ${isRecipeExpanded ? "rotate-180" : ""}`}>
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </button>
                          {isRecipeExpanded && (
                            <div className="border-t border-gray-100 px-3 pb-3 pt-2">
                              <RecipeExpandPanel
                                recipe={recipe}
                                persons={persons}
                                products={products}
                                state={state}
                                vaegtLogik={vaegtLogik}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Individual saved recipes */}
      {savedRecipes.length > 0 && (
        <>
          {state.savedPlans.length > 0 && (
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Bogmærkede retter</p>
          )}
          <div className="space-y-3">
            {savedRecipes.map((recipe) => {
              const isExpanded = expandedSlug === recipe.slug;
              const persons = getRecipePersons(recipe.slug);
              const imageUrl = recipe.imageUrl ?? TAG_IMAGES[recipe.tags[0]] ?? FALLBACK_IMAGE;
              const price = calcRecipePrice(recipe, products, persons, state.selectedChains, state.prisLogik, state.fridgeItems);

              return (
                <div key={recipe.slug} className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-3 p-3">
                    <Link href={`/opskrift/${recipe.slug}`} className="shrink-0">
                      <img src={imageUrl} alt={recipe.titel} className="w-14 h-14 rounded-xl object-cover" />
                    </Link>
                    <button className="flex-1 min-w-0 text-left" onClick={() => handleExpandIndividual(recipe.slug)}>
                      <p className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">{recipe.titel}</p>
                      {price.manglerMatch.length === 0 ? (
                        <p className="text-xs text-green-600 font-medium mt-0.5">
                          {formatPrice(price.totalPris)} · {formatPrice(price.prPerPerson)}/pers. · {persons} pers.
                        </p>
                      ) : (
                        <p className="text-xs text-amber-600 mt-0.5">Mangler varer</p>
                      )}
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"
                        className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        onClick={() => handleExpandIndividual(recipe.slug)}
                        style={{ cursor: "pointer" }}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                      {(() => {
                        const isDone = state.completedRecipeSlugs.includes(recipe.slug);
                        return (
                          <button
                            onClick={() => toggleCompletedRecipe(recipe.slug)}
                            title={isDone ? "Markér som ikke lavet" : "Markér som lavet"}
                            className={`w-8 h-8 flex items-center justify-center rounded-full ml-1 border transition-colors ${
                              isDone ? "bg-green-600 border-green-600" : "bg-white border-gray-200 text-gray-400 hover:border-green-400"
                            }`}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                              stroke={isDone ? "white" : "currentColor"} strokeWidth="2.5"
                              strokeLinecap="round" strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </button>
                        );
                      })()}
                      <button
                        onClick={() => toggleSavedRecipe(recipe.slug)}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 ml-1"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#16a34a" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                        </svg>
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-4">
                      {/* Persons + indkøbsliste */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-sm text-gray-500">Personer:</span>
                        <div className="flex gap-1">
                          {PERSONS_OPTIONS.map((n) => (
                            <button
                              key={n}
                              onClick={() => setPersonsMap((p) => ({ ...p, [recipe.slug]: n }))}
                              className={`w-8 h-8 rounded-full text-xs font-semibold transition-colors ${
                                persons === n ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => setOpenShoppingRecipeSlug(openShoppingRecipeSlug === recipe.slug ? null : recipe.slug)}
                          className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                            openShoppingRecipeSlug === recipe.slug
                              ? "bg-green-600 text-white border-green-600"
                              : "bg-white text-gray-700 border-gray-200"
                          }`}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
                          </svg>
                          Indkøbsliste
                        </button>
                      </div>

                      {/* Shopping list panel */}
                      {openShoppingRecipeSlug === recipe.slug && price.matchede.length > 0 && (
                        <div className="border border-gray-100 rounded-xl overflow-hidden">
                          <ul className="divide-y divide-gray-50">
                            {price.matchede.map((m) => (
                              <li key={m.canonical} className="flex items-center justify-between bg-white px-3 py-2.5">
                                <div>
                                  <p className="text-sm font-medium text-gray-800">{m.produkt.produktnavn}</p>
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    {m.pakker > 1 ? `${m.pakker}× ` : ""}{m.produkt.maengde} {m.produkt.maengdeEnhed} · {m.produkt.butik}
                                  </p>
                                </div>
                                <span className="text-sm font-semibold text-gray-700 shrink-0 ml-3">
                                  {formatPrice(m.pris)}
                                </span>
                              </li>
                            ))}
                          </ul>
                          <div className="flex justify-between font-semibold text-gray-900 px-3 py-2.5 bg-gray-50 border-t border-gray-100 text-sm">
                            <span>Total</span>
                            <span className="text-green-600">{formatPrice(price.totalPris)}</span>
                          </div>
                        </div>
                      )}

                      <RecipeExpandPanel
                        recipe={recipe}
                        persons={persons}
                        products={products}
                        state={state}
                        vaegtLogik={vaegtLogik}
                      />
                      <Link
                        href={`/opskrift/${recipe.slug}`}
                        className="block text-center py-2.5 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors"
                      >
                        Åbn opskrift
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
