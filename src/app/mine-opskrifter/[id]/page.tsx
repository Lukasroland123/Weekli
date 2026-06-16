"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { calcUserRecipePrice, formatPrice, formatShoppingAmount, erLøs } from "@/lib/pricing";
import { useApp } from "@/context/AppContext";
import { useProducts } from "@/lib/products";

export default function MinOpskriftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const products = useProducts();
  const { state, removeUserRecipe } = useApp();
  const router = useRouter();

  const recipe = state.userRecipes.find((r) => r.id === id);

  if (!recipe) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-400">Opskrift ikke fundet.</p>
      </div>
    );
  }

  const price = calcUserRecipePrice(recipe, products, state.selectedChains);

  function handleRemove() {
    removeUserRecipe(id);
    router.back();
  }

  return (
    <div className="pb-6">
      {/* Back */}
      <div className="px-4 pt-4 pb-2">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-green-600 text-sm font-medium"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Tilbage
        </button>
      </div>

      <div className="px-4">
        {/* Title + price */}
        <div className="flex items-start justify-between mt-2 mb-2">
          <div className="flex-1 mr-3">
            <h1 className="text-2xl font-bold text-gray-900">{recipe.name}</h1>
            <p className="text-sm text-gray-400 mt-0.5">{recipe.personer} pers. · din egen opskrift</p>
          </div>
          <div className="text-right shrink-0">
            {price.manglerMatch.length > 0 && price.matchede.length === 0 ? (
              <p className="text-sm text-amber-600 font-medium">Mangler varer</p>
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">{formatPrice(price.totalPris)}</div>
                <div className="text-xs text-gray-400">{formatPrice(price.prPerPerson)}/pers.</div>
              </>
            )}
          </div>
        </div>

        {/* Hvor er det billigst — indkøbsliste */}
        <h2 className="text-base font-semibold text-gray-900 mb-3 mt-4">Hvor er det billigst</h2>
        <ul className="space-y-2">
          {price.matchede.map((m) => (
            <li key={m.canonical} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3">
              <div>
                <p className="font-medium text-gray-800 text-sm">{m.produkt.produktnavn}</p>
                <p className="text-xs text-gray-400">
                  {erLøs(m.canonical, m.produkt.maengde, m.produkt.maengdeEnhed)
                    ? `${m.pakker}× løse`
                    : `${formatShoppingAmount(m.canonical, 1, m.produkt.maengde, m.produkt.maengdeEnhed)}${m.pakker > 1 ? ` × ${m.pakker}` : ""}`}
                  {" · "}{m.produkt.butik}
                </p>
              </div>
              <div className="text-right shrink-0 ml-3">
                {m.spar > 0 ? (
                  <>
                    <span className="text-xs text-gray-400 line-through">{formatPrice(m.pris + m.spar)}</span>
                    <span className="block text-sm font-semibold text-green-600">{formatPrice(m.pris)}</span>
                  </>
                ) : (
                  <span className="text-sm font-medium text-gray-700">{formatPrice(m.pris)}</span>
                )}
              </div>
            </li>
          ))}
          {price.manglerMatch.map((canonical) => (
            <li key={canonical} className="flex items-center bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              <p className="text-sm text-amber-700">{canonical.toLowerCase()} — ikke fundet i valgte kæder</p>
            </li>
          ))}
        </ul>
        {price.matchede.length > 0 && (
          <div className="flex justify-between font-semibold text-gray-900 px-1 mt-3">
            <span>Total</span>
            <span className="text-green-600">{formatPrice(price.totalPris)}</span>
          </div>
        )}

        {/* Fremgangsmåde */}
        {recipe.fremgangsmaade && (
          <section className="mt-6">
            <h2 className="text-base font-semibold text-gray-900 mb-2">Fremgangsmåde</h2>
            <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 border border-gray-100 rounded-2xl p-4">
              {recipe.fremgangsmaade}
            </p>
          </section>
        )}

        {/* Fjern */}
        <button
          onClick={handleRemove}
          className="w-full mt-6 py-3.5 rounded-2xl font-semibold text-sm text-red-500 bg-red-50 hover:bg-red-100 transition-colors"
        >
          Fjern opskrift
        </button>
      </div>
    </div>
  );
}
