import type { MetadataRoute } from "next";
import recipesJson from "@/data/recipes.json";
import { Recipe } from "@/lib/types";

const SITE = "https://getweekli.com";
const recipes = recipesJson as Recipe[];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/weekly`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/om`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const recipePages: MetadataRoute.Sitemap = recipes.map((r) => ({
    url: `${SITE}/opskrift/${r.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticPages, ...recipePages];
}
