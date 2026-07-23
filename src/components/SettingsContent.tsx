"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { useProducts } from "@/lib/products";
import { useRecipes } from "@/lib/recipes";
import { calcRecipePrice, formatPrice } from "@/lib/pricing";
import { calcPlanCost } from "@/lib/weekly";
import { PrisLogik, Tag } from "@/lib/types";

const CHAINS = ["REMA 1000", "FØTEX", "NETTO"];
const TAGS: { value: Tag; label: string }[] = [
  { value: "kød", label: "Kød" },
  { value: "kylling", label: "Kylling" },
  { value: "fisk", label: "Fisk" },
  { value: "vegetar", label: "Vegetar" },
];

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="#9ca3af" strokeWidth="2"
      className={`transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export default function SettingsContent() {
  const { state, setPersons, setSelectedChains, setPrisLogik, setTagFilters } = useApp();
  const products = useProducts();
  const { recipes } = useRecipes();

  const [openPrefs, setOpenPrefs] = useState(true);

  // Draft preferences — only committed on "Gem"
  const [draftPersons, setDraftPersons] = useState(state.persons);
  const [draftChains, setDraftChains] = useState<string[]>(state.selectedChains);
  const [draftPrisLogik, setDraftPrisLogik] = useState<PrisLogik>(state.prisLogik);
  const [draftTags, setDraftTags] = useState<Tag[]>(state.tagFilters);
  const [prefsSaved, setPrefsSaved] = useState(false);

  function handleOpenPrefs() {
    if (!openPrefs) {
      setDraftPersons(state.persons);
      setDraftChains(state.selectedChains);
      setDraftPrisLogik(state.prisLogik);
      setDraftTags(state.tagFilters);
    }
    setOpenPrefs((v) => !v);
  }

  function toggleDraftChain(chain: string) {
    setDraftChains((cur) => cur.includes(chain) ? cur.filter((c) => c !== chain) : [...cur, chain]);
  }

  function toggleDraftTag(tag: Tag) {
    setDraftTags((cur) => cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag]);
  }

  function handleSavePrefs() {
    setPersons(draftPersons);
    setSelectedChains(draftChains);
    setPrisLogik(draftPrisLogik);
    setTagFilters(draftTags);
    setPrefsSaved(true);
    setTimeout(() => setPrefsSaved(false), 2000);
  }

  // Besparelse — kun fra afkrydsede (completed) planer og opskrifter
  const activeProducts = useMemo(
    () => state.selectedChains.length === 0 ? products : products.filter((p) => state.selectedChains.includes(p.butik)),
    [products, state.selectedChains]
  );

  const { tilbudsBesparelse, plannerBesparelse } = useMemo(() => {
    let tilbud = 0;
    let planner = 0;

    // Completed saved plans
    for (const plan of state.savedPlans.filter((p) => state.completedPlanIds.includes(p.id))) {
      const planRecipes = plan.slugs.flatMap((slug) => {
        const r = recipes.find((x) => x.slug === slug);
        return r ? [r] : [];
      });
      let individualSum = 0;
      for (const r of planRecipes) {
        const price = calcRecipePrice(r, products, plan.persons, state.selectedChains, state.prisLogik, []);
        tilbud += price.sparPris;
        individualSum += price.totalPris;
      }
      const planCost = calcPlanCost(planRecipes, activeProducts, plan.persons, []);
      planner += Math.max(0, individualSum - planCost);
    }

    // Completed individual recipes (tilbud only — no plan sharing)
    for (const { slug } of state.savedRecipes.filter((r) => state.completedRecipeSlugs.includes(r.slug))) {
      const recipe = recipes.find((x) => x.slug === slug);
      if (!recipe) continue;
      const price = calcRecipePrice(recipe, products, state.persons, state.selectedChains, state.prisLogik, []);
      tilbud += price.sparPris;
    }

    return { tilbudsBesparelse: tilbud, plannerBesparelse: planner };
  }, [state.savedPlans, state.savedRecipes, state.completedPlanIds, state.completedRecipeSlugs, state.selectedChains, state.prisLogik, state.persons, recipes, products, activeProducts]);

  return (
    <div className="space-y-3">
      {/* ── Mine præferencer ── */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
        <button
          className="w-full flex items-center gap-3 px-4 py-4"
          onClick={handleOpenPrefs}
        >
          <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            </svg>
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-gray-800 text-sm leading-tight">Mine præferencer</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {state.persons} pers.
              {state.tagFilters.length > 0 ? ` · ${state.tagFilters.join(', ')}` : ''}
              {state.selectedChains.length > 0 ? ` · ${state.selectedChains.join(', ')}` : ''}
            </p>
          </div>
          <ChevronIcon open={openPrefs} />
        </button>

        {openPrefs && (
          <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-5">
            {/* Antal personer */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Antal personer</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    onClick={() => setDraftPersons(n)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      draftPersons === n ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Kæder */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Kæder</p>
              <p className="text-xs text-gray-400 mb-2">Ingen valgt = alle kæder aktive</p>
              <div className="flex flex-col gap-2">
                {CHAINS.map((chain) => {
                  const isOn = draftChains.includes(chain);
                  return (
                    <button
                      key={chain}
                      onClick={() => toggleDraftChain(chain)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium border transition-colors ${
                        isOn ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-700 border-gray-100"
                      }`}
                    >
                      <span>{chain}</span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isOn ? "bg-green-600 border-green-600" : "border-gray-300"
                      }`}>
                        {isOn && (
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Madpræferencer */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Madpræferencer</p>
              <p className="text-xs text-gray-400 mb-2">Ingen valgt = alle retter vises</p>
              <div className="flex gap-2">
                {TAGS.map(({ value, label }) => {
                  const isOn = draftTags.includes(value);
                  return (
                    <button
                      key={value}
                      onClick={() => toggleDraftTag(value)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                        isOn ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Prislogik */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Prislogik</p>
              <div className="flex gap-2">
                {(["pris", "tilbud"] as PrisLogik[]).map((val) => (
                  <button
                    key={val}
                    onClick={() => setDraftPrisLogik(val)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      draftPrisLogik === val ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {val === "pris" ? "Pris" : "Tilbud"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {draftPrisLogik === "pris"
                  ? "Vælger den billigste upfront-pris pr. ret."
                  : "Sorterer retter efter størst besparelse på tilbud."}
              </p>
            </div>

            {/* Gem */}
            <button
              onClick={handleSavePrefs}
              className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
                prefsSaved
                  ? "bg-green-100 text-green-700"
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              {prefsSaved ? "Præferencer gemt!" : "Gem præferencer"}
            </button>
          </div>
        )}
      </div>

      {/* ── Din besparelse ── */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="w-9 h-9 bg-yellow-50 rounded-xl flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
              <polyline points="17 6 23 6 23 12"/>
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-800 text-sm leading-tight">Din besparelse</p>
            <p className="text-xs text-gray-400 mt-0.5">Baseret på afkrydsede retter</p>
          </div>
          {(state.completedPlanIds.length > 0 || state.completedRecipeSlugs.length > 0) && (
            <p className="text-lg font-bold text-gray-900">{formatPrice(tilbudsBesparelse + plannerBesparelse)}</p>
          )}
        </div>

        {state.completedPlanIds.length === 0 && state.completedRecipeSlugs.length === 0 ? (
          <div className="border-t border-gray-50 px-4 py-4">
            <p className="text-sm text-gray-400">
              Afkryds en madplan eller ret i Gemte for at se din besparelse.
            </p>
          </div>
        ) : (
          <div className="border-t border-gray-50 px-4 pb-4 pt-3 grid grid-cols-2 gap-3">
            <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3">
              <p className="text-xs font-medium text-yellow-700 mb-1.5">Tilbudsbesparelse</p>
              <p className="text-xl font-bold text-yellow-600">{formatPrice(tilbudsBesparelse)}</p>
              <p className="text-xs text-yellow-500 mt-1">sparet på tilbud</p>
            </div>
            <div className="bg-green-50 border border-green-100 rounded-xl p-3">
              <p className="text-xs font-medium text-green-700 mb-1.5">Planner besparelse</p>
              <p className="text-xl font-bold text-green-600">{formatPrice(plannerBesparelse)}</p>
              <p className="text-xs text-green-500 mt-1">sparet på delte varer</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Om Weekli ── */}
      <Link
        href="/om"
        className="flex items-center gap-3 px-4 py-4 bg-white border border-gray-100 shadow-sm rounded-2xl"
      >
        <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </div>
        <div className="flex-1 text-left">
          <p className="font-semibold text-gray-800 text-sm leading-tight">Om Weekli</p>
          <p className="text-xs text-gray-400 mt-0.5">Priser, privatliv og kontakt</p>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" className="shrink-0">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </Link>
    </div>
  );
}
