"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import { calcRecipePrice, buildShoppingList, formatPrice, formatRecipeAmount, formatShoppingAmount } from "@/lib/pricing";
import { useVaegtLogik } from "@/lib/vaegt-logik";
import { useShopping } from "@/context/ShoppingContext";
import { useApp } from "@/context/AppContext";
import { useRecipes } from "@/lib/recipes";
import { useProducts } from "@/lib/products";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80";
const TAG_IMAGES: Record<string, string> = {
  fisk:    "https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=800&q=80",
  kylling: "https://images.unsplash.com/photo-1598103442097-8b74394b95c2?w=800&q=80",
  kød:     "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&q=80",
  vegetar: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80",
};

export default function OpskriftPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { recipes } = useRecipes();
  const products = useProducts();
  const { state } = useApp();
  const vaegtLogik = useVaegtLogik();
  const { addItems, openList } = useShopping();
  const router = useRouter();

  const [persons, setPersons] = useState(state.persons > 0 ? state.persons : 2);
  const [addedToList, setAddedToList] = useState(false);

  const recipe = recipes.find((r) => r.slug === slug);

  if (!recipe) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-400">Opskrift ikke fundet.</p>
      </div>
    );
  }

  const price = calcRecipePrice(recipe, products, persons, state.selectedChains, state.prisLogik);
  const imageUrl = recipe.imageUrl ?? TAG_IMAGES[recipe.tags[0]] ?? FALLBACK_IMAGE;

  function handleAddToList() {
    const items = buildShoppingList(recipe!, price.matchede);
    addItems(items);
    setAddedToList(true);
    openList();
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

      {/* Hero */}
      <div className="relative h-56 w-full bg-gray-100">
        <img src={imageUrl} alt={recipe.titel} className="w-full h-full object-cover" />
      </div>

      <div className="px-4">
        {/* Title + price */}
        <div className="flex items-start justify-between mt-4 mb-2">
          <h1 className="text-2xl font-bold text-gray-900 flex-1 mr-3">{recipe.titel}</h1>
          <div className="text-right shrink-0">
            {price.manglerMatch.length > 0 ? (
              <p className="text-sm text-amber-600 font-medium">Mangler varer</p>
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">{formatPrice(price.totalPris)}</div>
                <div className="text-xs text-gray-400">{formatPrice(price.prPerPerson)}/pers.</div>
              </>
            )}
          </div>
        </div>

        <p className="text-gray-600 text-sm mb-4">{recipe.beskrivelse}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {recipe.tags.map((tag) => (
            <span key={tag} className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              tag === "vegetar" ? "bg-green-100 text-green-700"
              : tag === "fisk" ? "bg-blue-100 text-blue-700"
              : "bg-orange-100 text-orange-700"
            }`}>
              {tag.charAt(0).toUpperCase() + tag.slice(1)}
            </span>
          ))}
        </div>

        {/* Persons selector */}
        <div className="flex items-center gap-3 mb-5 text-sm text-gray-500">
          <span>Portioner:</span>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              onClick={() => setPersons(n)}
              className={`w-7 h-7 rounded-full text-xs font-semibold transition-colors ${
                persons === n ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {n}
            </button>
          ))}
          {recipe.tilberedningstid && <span className="ml-2">{recipe.tilberedningstid} min</span>}
        </div>

        {/* Price breakdown */}
        {price.manglerMatch.length === 0 && (
          <div className="bg-green-50 border border-green-100 rounded-2xl p-4 mb-5 text-sm space-y-1.5">
            {price.matchede.map((m) => (
              <div key={m.canonical} className="flex justify-between text-gray-600">
                <span>{m.produkt.produktnavn} <span className="text-gray-400">({m.pakker}×)</span></span>
                <span className="font-medium">{formatPrice(m.pris)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold text-gray-900 border-t border-green-100 pt-1.5">
              <span>Total</span>
              <span className="text-green-600">{formatPrice(price.totalPris)}</span>
            </div>
          </div>
        )}

        {/* Missing ingredients warning */}
        {price.manglerMatch.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 text-sm">
            <p className="font-semibold text-amber-700 mb-1">Ikke tilgængelig i valgte kæder</p>
            <p className="text-amber-600 text-xs">
              Mangler: {price.manglerMatch.join(", ")}
            </p>
          </div>
        )}

        {/* Ingredienser */}
        <section className="mb-5">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Ingredienser</h2>
          <ul className="space-y-2">
            {price.matchede.map((m) => (
              <li key={m.canonical} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3">
                <div>
                  <p className="font-medium text-gray-800 text-sm">{m.produkt.produktnavn}</p>
                  <p className="text-xs text-gray-400">
                    {formatRecipeAmount(m.canonical, m.maengdeBehoevet, m.enhed, vaegtLogik)}
                    {" · "}
                    {formatShoppingAmount(m.canonical, m.pakker, m.produkt.maengde, m.produkt.maengdeEnhed)} · {m.produkt.butik}
                  </p>
                </div>
                <span className="text-sm font-medium text-gray-700">{formatPrice(m.pris)}</span>
              </li>
            ))}
            {price.manglerMatch.map((canonical) => (
              <li key={canonical} className="flex items-center bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                <p className="text-sm text-amber-700">{canonical} — ikke fundet i valgte kæder</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Basisvarer */}
        {recipe.basisvarer.length > 0 && (
          <section className="mb-6">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Krydderier & basisvarer</h2>
            <p className="text-xs text-gray-400 mb-3">Forventes at være i et standardkøkken — ikke med i prisen.</p>
            <ul className="space-y-1">
              {recipe.basisvarer.map((v) => (
                <li key={v} className="flex items-center gap-2 text-sm text-gray-500 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                  {v}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Add to list */}
        <button
          onClick={handleAddToList}
          disabled={addedToList || price.manglerMatch.length > 0}
          className={`w-full py-4 rounded-2xl font-semibold text-base transition-colors ${
            addedToList
              ? "bg-gray-100 text-gray-400 cursor-default"
              : price.manglerMatch.length > 0
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-green-600 text-white hover:bg-green-700"
          }`}
        >
          {addedToList ? "Tilføjet til indkøbsliste" : "Tilføj til indkøbsliste"}
        </button>
      </div>
    </div>
  );
}
