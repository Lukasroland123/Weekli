"use client";

import Link from "next/link";
import Image from "next/image";
import { Recipe, RecipePrice } from "@/lib/types";
import { formatPrice } from "@/lib/pricing";
import { useApp } from "@/context/AppContext";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80";

const TAG_IMAGES: Record<string, string> = {
  fisk:     "https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=800&q=80",
  kylling:  "https://images.unsplash.com/photo-1598103442097-8b74394b95c2?w=800&q=80",
  kød:      "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&q=80",
  vegetar:  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80",
};

interface Props {
  recipe: Recipe;
  price: RecipePrice;
}

export default function RecipeCard({ recipe, price }: Props) {
  const { state, toggleSavedRecipe } = useApp();
  const imageUrl = recipe.imageUrl ?? TAG_IMAGES[recipe.tags[0]] ?? FALLBACK_IMAGE;
  const harMangler = price.manglerMatch.length > 0;
  const isSaved = state.savedRecipes.some((r) => r.slug === recipe.slug);

  return (
    <Link href={`/opskrift/${recipe.slug}`} className="group block">
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
        {/* Image */}
        <div className="relative h-40 w-full bg-gray-100">
          <button
            onClick={(e) => { e.preventDefault(); toggleSavedRecipe(recipe.slug); }}
            className="absolute top-2 left-2 z-10 w-7 h-7 rounded-full flex items-center justify-center bg-white/80 backdrop-blur-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={isSaved ? "#16a34a" : "none"} stroke={isSaved ? "#16a34a" : "#6b7280"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
          <Image
            src={imageUrl}
            alt={recipe.titel}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {harMangler && (
            <div className="absolute top-2 right-2 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
              Mangler varer
            </div>
          )}
          {!harMangler && price.sparPris > 0 && (
            <div className="absolute bottom-2 left-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-lg">
              Spar {formatPrice(price.sparPris)}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3">
          <h2 className="font-semibold text-gray-900 text-sm leading-tight mb-2 line-clamp-2">
            {recipe.titel}
          </h2>

          {harMangler ? (
            <p className="text-xs text-amber-600">
              Ikke tilgængelig i valgte kæder
            </p>
          ) : (
            <>
              <span className="text-lg font-bold text-green-600">
                {formatPrice(price.totalPris)}
              </span>
              <p className="text-xs text-gray-400 mt-0.5">
                {formatPrice(price.prPerPerson)}/pers.
              </p>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
