"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { useProducts } from "@/lib/products";
import vaegtLogikJson from "@/data/vaegt-logik.json";

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

export default function AddRecipeSection() {
  const { state, addUserRecipe, removeUserRecipe } = useApp();
  const products = useProducts();
  const router = useRouter();

  const [openAddRecipe, setOpenAddRecipe] = useState(false);
  const [openMyRecipes, setOpenMyRecipes] = useState(false);

  // Recipe form
  const [recipeName, setRecipeName] = useState("");
  const [recipePersons, setRecipePersons] = useState<number | null>(null);
  const [draftIngredients, setDraftIngredients] = useState<DraftIngredient[]>([]);
  const [pendingRows, setPendingRows] = useState<PendingRow[]>([]);
  const [basisvarer, setBasisvarer] = useState<string[]>([]);
  const [basisInput, setBasisInput] = useState("");
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

  function addBasisvare(navn: string) {
    const clean = navn.trim().toLowerCase();
    if (!clean) return;
    setBasisvarer((prev) => (prev.includes(clean) ? prev : [...prev, clean]));
    setBasisInput("");
  }

  function addBasisvareFromRow(id: string) {
    const row = pendingRows.find((r) => r.id === id);
    if (!row) return;
    addBasisvare(row.query);
    cancelRow(id);
  }

  async function handleSaveAndSubmitRecipe() {
    if (!recipeName.trim() || !recipePersons || draftIngredients.length === 0) return;

    setSending(true);
    setSendError(null);

    // 1) Gem lokalt, så den dukker op i "Dine opskrifter" med pris-opslag
    addUserRecipe({ name: recipeName.trim(), personer: recipePersons, ingredienser: draftIngredients, basisvarer: basisvarer.length ? basisvarer : undefined, fremgangsmaade: recipeFremgangsmaade.trim() || undefined });

    // 2) Send til Weekli til verificering — direkte i appen, intet mailprogram åbnes
    try {
      const res = await fetch("/api/send-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: recipeName.trim(),
          personer: recipePersons,
          ingredienser: draftIngredients,
          basisvarer: basisvarer.length ? basisvarer : undefined,
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
    setBasisvarer([]);
    setBasisInput("");
    setRecipeFremgangsmaade("");
    setSending(false);
    setRecipeSaved(true);
    setOpenMyRecipes(true);
    setTimeout(() => setRecipeSaved(false), 2500);
  }

  return (
    <div className="space-y-3">
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
            <p className="font-semibold text-gray-800 text-sm leading-tight">Tilføj egen opskrift</p>
            <p className="text-xs text-gray-400 mt-0.5">Find en ret online, læg varerne ind, og se hvor den er billigst</p>
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
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Antal personer</p>
              <p className="text-xs text-gray-400 mb-2">Vælg hvor mange personer opskriften er til.</p>
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
            </div>

            {/* Ingredienser */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Ingredienser</p>
              <p className="text-xs text-gray-400 mb-2">Varerne med pris — bruges til at beregne hvad retten koster.</p>

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
                      {row.query.trim() && rowSuggestions(row).length === 0 && (
                        <button
                          onClick={() => addBasisvareFromRow(row.id)}
                          className="mt-1.5 w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-gray-300 bg-white text-left text-sm text-gray-600 hover:border-green-400 hover:text-green-700 transition-colors"
                        >
                          <span className="text-green-600 font-bold text-base leading-none">+</span>
                          Ikke i kategorierne? Tilføj &quot;{row.query.trim()}&quot; som basisvare
                        </button>
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

            {/* Basisvarer / krydderier */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Basisvarer &amp; krydderier</p>
              <p className="text-xs text-gray-400 mb-2">Ting uden pris, fx salt, olie eller persille — vises, men indgår ikke i prisen.</p>
              {basisvarer.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {basisvarer.map((b) => (
                    <span key={b} className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 rounded-full pl-3 pr-2 py-1 text-sm capitalize">
                      {b}
                      <button
                        onClick={() => setBasisvarer((prev) => prev.filter((x) => x !== b))}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        aria-label={`Fjern ${b}`}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={basisInput}
                  onChange={(e) => setBasisInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addBasisvare(basisInput); } }}
                  placeholder="F.eks. persille, olivenolie, salt..."
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  onClick={() => addBasisvare(basisInput)}
                  disabled={!basisInput.trim()}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-green-600 text-white disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
                >
                  Tilføj
                </button>
              </div>
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
            <p className="font-semibold text-gray-800 text-sm leading-tight">Mine egne opskrifter</p>
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
    </div>
  );
}
