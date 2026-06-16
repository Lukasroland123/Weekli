"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { useProducts } from "@/lib/products";
import { useRecipes } from "@/lib/recipes";
import { calcRecipePrice, formatPrice } from "@/lib/pricing";
import { calcPlanCost } from "@/lib/weekly";
import { PrisLogik, Tag } from "@/lib/types";
import vaegtLogikJson from "@/data/vaegt-logik.json";

const CHAINS = ["REMA 1000", "FØTEX", "NETTO"];
const TAGS: { value: Tag; label: string }[] = [
  { value: "kød", label: "Kød" },
  { value: "kylling", label: "Kylling" },
  { value: "fisk", label: "Fisk" },
  { value: "vegetar", label: "Vegetar" },
];

const vl_map: Record<string, { stkVaegt: number; enhed: string }> = {};
for (const entry of vaegtLogikJson as Array<{ kategori: string; stkVaegt: number; enhed: string }>) {
  vl_map[entry.kategori.toUpperCase()] = { stkVaegt: entry.stkVaegt, enhed: entry.enhed };
}

interface DraftIngredient {
  canonical: string;
  maengde: number;
  enhed: string;
}

interface PendingRow {
  id: string;
  query: string;
  canonical: string | null;
  maengde: string;
  enhed: string;
}

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

export default function ProfilPage() {
  const { state, setPersons, setSelectedChains, setPrisLogik, setTagFilters, addUserRecipe, removeUserRecipe } = useApp();
  const products = useProducts();
  const { recipes } = useRecipes();
  const router = useRouter();

  const [openPrefs, setOpenPrefs] = useState(false);
  const [openAddRecipe, setOpenAddRecipe] = useState(false);
  const [openMyRecipes, setOpenMyRecipes] = useState(false);

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

  // Recipe form
  const [recipeName, setRecipeName] = useState("");
  const [recipePersons, setRecipePersons] = useState<number | null>(null);
  const [draftIngredients, setDraftIngredients] = useState<DraftIngredient[]>([]);
  const [pendingRows, setPendingRows] = useState<PendingRow[]>([]);
  const [recipeFremgangsmaade, setRecipeFremgangsmaade] = useState("");
  const [recipeSaved, setRecipeSaved] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const allCanonicals = useMemo(() => {
    const set = new Set(products.map((p) => p.kategori.toUpperCase()));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products]);

  function rowSuggestions(row: PendingRow): string[] {
    const q = row.query.trim().toLowerCase();
    if (!q || row.canonical) return [];
    return allCanonicals.filter((c) => c.toLowerCase().includes(q)).slice(0, 6);
  }

  function rowUnits(canonical: string): string[] {
    const isLiquid = products.some((p) => p.kategori.toUpperCase() === canonical && ["ml", "l"].includes(p.maengdeEnhed));
    const hasStkConversion = !!vl_map[canonical];
    if (isLiquid) return ["ml", "l"];
    if (hasStkConversion) return ["stk", "g"];
    return ["g"];
  }

  function addPendingRow() {
    setPendingRows((prev) => [...prev, { id: String(Date.now() + Math.random()), query: "", canonical: null, maengde: "", enhed: "g" }]);
  }

  function updateRow(id: string, patch: Partial<PendingRow>) {
    setPendingRows((prev) => prev.map((r) => r.id === id ? { ...r, ...patch } : r));
  }

  function selectRowCanonical(id: string, canonical: string) {
    const units = rowUnits(canonical);
    updateRow(id, { canonical, query: "", enhed: units[0] });
  }

  function confirmRow(id: string) {
    const row = pendingRows.find((r) => r.id === id);
    if (!row?.canonical) return;
    const amount = parseFloat(row.maengde);
    if (!amount || amount <= 0) return;
    setDraftIngredients((prev) => [
      ...prev.filter((i) => i.canonical !== row.canonical),
      { canonical: row.canonical!, maengde: amount, enhed: row.enhed },
    ]);
    setPendingRows((prev) => prev.filter((r) => r.id !== id));
  }

  function cancelRow(id: string) {
    setPendingRows((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleSaveAndSubmitRecipe() {
    if (!recipeName.trim() || !recipePersons || draftIngredients.length === 0) return;

    setSending(true);
    setSendError(null);

    // 1) Gem lokalt, så den dukker op i "Dine opskrifter" med pris-opslag
    addUserRecipe({ name: recipeName.trim(), personer: recipePersons, ingredienser: draftIngredients, fremgangsmaade: recipeFremgangsmaade.trim() || undefined });

    // 2) Send til Weekli til verificering — direkte i appen, intet mailprogram åbnes
    try {
      const res = await fetch("/api/send-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: recipeName.trim(),
          personer: recipePersons,
          ingredienser: draftIngredients,
          fremgangsmaade: recipeFremgangsmaade.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Kunne ikke sende opskriften.");
      }
    } catch (err) {
      setSending(false);
      setSendError(err instanceof Error ? err.message : "Kunne ikke sende opskriften.");
      return;
    }

    setRecipeName("");
    setRecipePersons(null);
    setDraftIngredients([]);
    setPendingRows([]);
    setRecipeFremgangsmaade("");
    setSending(false);
    setRecipeSaved(true);
    setOpenMyRecipes(true);
    setTimeout(() => setRecipeSaved(false), 2500);
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
    <div className="pb-24 px-4 pt-5 space-y-3 min-h-screen bg-gray-50">
      <div className="mb-1">
        <h1 className="text-2xl font-bold text-gray-900">Profil</h1>
        <p className="text-sm text-gray-400 mt-0.5">Indstillinger og dine opskrifter</p>
      </div>

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

      {/* ── Tilføj opskrift ── */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
        <button
          className="w-full flex items-center gap-3 px-4 py-4"
          onClick={() => setOpenAddRecipe((v) => !v)}
        >
          <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-gray-800 text-sm leading-tight">Tilføj opskrift</p>
            <p className="text-xs text-gray-400 mt-0.5">Del en ret med Weekli</p>
          </div>
          <ChevronIcon open={openAddRecipe} />
        </button>

        {openAddRecipe && (
          <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-4">

            {/* Navn */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Navn</p>
              <input
                type="text"
                value={recipeName}
                onChange={(e) => setRecipeName(e.target.value)}
                placeholder="F.eks. pasta bolognese..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Antal personer */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Antal personer <span className="text-red-500">*</span>
              </p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRecipePersons(n)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      recipePersons === n ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {recipePersons === null && (
                <p className="text-xs text-red-500 mt-1.5">Vælg hvor mange personer opskriften er til</p>
              )}
            </div>

            {/* Ingredienser */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ingredienser</p>

              {/* Confirmed ingredient rows */}
              {draftIngredients.length > 0 && (
                <ul className="space-y-1.5 mb-2">
                  {draftIngredients.map((ing, i) => (
                    <li key={i} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
                      <span className="text-sm text-gray-700 capitalize">{ing.canonical.toLowerCase()}</span>
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm text-gray-500">{ing.maengde} {ing.enhed}</span>
                        <button
                          onClick={() => setDraftIngredients((prev) => prev.filter((_, j) => j !== i))}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {/* Pending rows — each is independent */}
              {pendingRows.map((row, idx) => (
                <div key={row.id} className="bg-green-50 border border-green-200 rounded-xl p-3 mb-2 space-y-2">
                  {!row.canonical ? (
                    <div>
                      <div className="relative">
                        <input
                          autoFocus={idx === pendingRows.length - 1}
                          type="text"
                          value={row.query}
                          onChange={(e) => updateRow(row.id, { query: e.target.value })}
                          placeholder="Søg ingrediens, f.eks. kylling..."
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-green-500"
                        />
                        {row.query && (
                          <button
                            onClick={() => updateRow(row.id, { query: "" })}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        )}
                      </div>
                      {rowSuggestions(row).length > 0 && (
                        <ul className="mt-1.5 border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50 bg-white">
                          {rowSuggestions(row).map((c) => (
                            <li key={c}>
                              <button
                                onClick={() => selectRowCanonical(row.id, c)}
                                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-green-50 transition-colors text-left"
                              >
                                <span className="text-sm text-gray-700 capitalize">{c.toLowerCase()}</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="flex justify-end mt-1.5">
                        <button onClick={() => cancelRow(row.id)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                          Fjern
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-800 capitalize">{row.canonical.toLowerCase()}</p>
                        <button onClick={() => cancelRow(row.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={row.maengde}
                          onChange={(e) => updateRow(row.id, { maengde: e.target.value })}
                          onKeyDown={(e) => { if (e.key === "Enter") confirmRow(row.id); }}
                          placeholder="Mængde"
                          autoFocus
                          className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-green-500"
                        />
                        <div className="flex gap-1">
                          {rowUnits(row.canonical).map((u) => (
                            <button
                              key={u}
                              onClick={() => updateRow(row.id, { enhed: u })}
                              className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                                row.enhed === u ? "bg-green-600 text-white" : "bg-white border border-gray-200 text-gray-600"
                              }`}
                            >
                              {u}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => confirmRow(row.id)}
                        disabled={!row.maengde || parseFloat(row.maengde) <= 0}
                        className="w-full py-2 rounded-xl text-sm font-semibold bg-green-600 text-white disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
                      >
                        Tilføj
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* + button — always visible */}
              <button
                onClick={addPendingRow}
                className="flex items-center gap-2 text-sm font-medium text-green-700 hover:text-green-800 transition-colors py-1"
              >
                <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </div>
                Tilføj ingrediens
              </button>
            </div>

            {/* Fremgangsmåde */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Fremgangsmåde</p>
              <textarea
                value={recipeFremgangsmaade}
                onChange={(e) => setRecipeFremgangsmaade(e.target.value)}
                placeholder="Beskriv kort hvordan retten laves..."
                rows={3}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
            </div>

            <button
              onClick={handleSaveAndSubmitRecipe}
              disabled={!recipeName.trim() || !recipePersons || draftIngredients.length === 0 || sending}
              className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
                recipeSaved
                  ? "bg-green-100 text-green-700"
                  : "bg-green-600 text-white disabled:bg-gray-100 disabled:text-gray-400"
              }`}
            >
              {recipeSaved ? "Gemt og sendt!" : sending ? "Sender..." : "Gem og send til Weekli"}
            </button>
            {sendError && (
              <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{sendError}</p>
            )}
          </div>
        )}
      </div>

      {/* ── Dine opskrifter ── */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
        <button
          className="w-full flex items-center gap-3 px-4 py-4"
          onClick={() => setOpenMyRecipes((v) => !v)}
        >
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
            </svg>
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-gray-800 text-sm leading-tight">Dine opskrifter</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {state.userRecipes.length === 0 ? "Ingen gemte endnu" : `${state.userRecipes.length} opskrift${state.userRecipes.length !== 1 ? "er" : ""} gemt`}
            </p>
          </div>
          <ChevronIcon open={openMyRecipes} />
        </button>

        {openMyRecipes && (
          <div className="border-t border-gray-100">
            {state.userRecipes.length === 0 ? (
              <p className="px-4 py-4 text-sm text-gray-400">
                Ingen gemte opskrifter endnu. Udfyld formularen ovenfor og tryk &quot;Gem og send til Weekli&quot;.
              </p>
            ) : (
              <div className="divide-y divide-gray-50">
                {state.userRecipes.map((recipe) => (
                  <div
                    key={recipe.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/mine-opskrifter/${recipe.id}`)}
                    onKeyDown={(e) => { if (e.key === "Enter") router.push(`/mine-opskrifter/${recipe.id}`); }}
                    className="px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-800">{recipe.name}</p>
                        <span className="text-xs text-gray-400">· {recipe.personer ?? "?"} pers.</span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeUserRecipe(recipe.id); }}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                    <ul className="space-y-0.5">
                      {recipe.ingredienser.map((ing, i) => (
                        <li key={i} className="text-xs text-gray-500 capitalize">
                          {ing.canonical.toLowerCase()} — {ing.maengde} {ing.enhed}
                        </li>
                      ))}
                    </ul>
                    {recipe.fremgangsmaade && (
                      <p className="text-xs text-gray-400 mt-2 leading-relaxed">{recipe.fremgangsmaade}</p>
                    )}
                    <p className="text-xs text-green-600 font-medium mt-2">Se hvor det er billigst →</p>
                  </div>
                ))}
              </div>
            )}
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

    </div>
  );
}
