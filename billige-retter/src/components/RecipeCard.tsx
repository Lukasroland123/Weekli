"use client";

import Link from "next/link";
import Image from "next/image";
import { Recipe, RecipePrice } from "@/lib/types";
import { formatPrice } from "@/lib/pricing";

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
  const imageUrl = recipe.imageUrl ?? TAG_IMAGES[recipe.tags[0]] ?? FALLBACK_IMAGE;
  const harMangler = price.manglerMatch.length > 0;

  return (
    <Link href={`/opskrift/${recipe.slug}`} className="group block">
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
        {/* Image */}
        <div className="relative h-40 w-full bg-gray-100">
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
