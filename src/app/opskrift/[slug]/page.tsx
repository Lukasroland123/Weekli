import type { Metadata } from "next";
import { notFound } from "next/navigation";
import recipesJson from "@/data/recipes.json";
import { Recipe, RecipeIngredientDef } from "@/lib/types";
import OpskriftClient from "./OpskriftClient";

const recipes = recipesJson as Recipe[];
const SITE = "https://getweekli.com";

// Statisk pre-render af alle opskriftssider (bedst for SEO + hastighed)
export function generateStaticParams() {
  return recipes.map((r) => ({ slug: r.slug }));
}

function findRecipe(slug: string): Recipe | undefined {
  return recipes.find((r) => r.slug === slug);
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const recipe = findRecipe(slug);
  if (!recipe) return { title: "Opskrift ikke fundet" };

  // Layout-templaten tilføjer " | Weekli" til `title`; OG-titlen står alene.
  const title = `${recipe.titel} — billig opskrift`;
  const ogTitle = `${title} | Weekli`;
  const description = recipe.beskrivelse;
  const image = recipe.imageUrl ?? "/opengraph-image.png";
  const url = `/opskrift/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: ogTitle,
      description,
      url,
      type: "article",
      siteName: "Weekli",
      images: [{ url: image, width: 1200, height: 630, alt: recipe.titel }],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [image],
    },
  };
}

function buildJsonLd(recipe: Recipe) {
  const ingredientLines = recipe.ingredienser.map((ing) => {
    if ("placeholder" in ing) return "salat";
    const def = ing as RecipeIngredientDef;
    return `${def.maengde} ${def.enhed} ${def.canonical.toLowerCase()}`;
  });

  const image = recipe.imageUrl ? `${SITE}${recipe.imageUrl}` : `${SITE}/opengraph-image.png`;

  return {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.titel,
    description: recipe.beskrivelse,
    image: [image],
    recipeYield: `${recipe.personer} personer`,
    recipeCategory: recipe.tags,
    keywords: ["billig", "madplan", "tilbud", ...recipe.tags].join(", "),
    ...(recipe.tilberedningstid ? { totalTime: `PT${recipe.tilberedningstid}M` } : {}),
    recipeIngredient: [...ingredientLines, ...recipe.basisvarer],
    ...(recipe.fremgangsmaade && recipe.fremgangsmaade.length > 0
      ? {
          recipeInstructions: recipe.fremgangsmaade.map((step) => ({
            "@type": "HowToStep",
            text: step,
          })),
        }
      : {}),
  };
}

export default async function OpskriftPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const recipe = findRecipe(slug);
  if (!recipe) notFound();

  const jsonLd = buildJsonLd(recipe);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <OpskriftClient recipe={recipe} />
    </>
  );
}
