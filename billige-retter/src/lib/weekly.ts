import { Recipe, Product, WeeklyPlan, PrisLogik, ShoppingItem, Tag } from "./types";
import { calcRecipePrice, buildShoppingList } from "./pricing";

const DAY_NAMES = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"];

export function filterRecipes(recipes: Recipe[], tagFilter: Tag | null): Recipe[] {
  if (!tagFilter) return recipes;
  return recipes.filter((r) => r.tags.includes(tagFilter));
}

export function generateWeeklyPlan(
  recipes: Recipe[],
  products: Product[],
  selectedChains: string[],
  prisLogik: PrisLogik,
  persons: number,
  days: number
): WeeklyPlan {
  // Only include recipes where all ingredients are matched
  const valid = recipes.filter((r) => {
    const price = calcRecipePrice(r, products, persons, selectedChains, prisLogik);
    return price.manglerMatch.length === 0 && price.totalPris > 0;
  });

  // Sort by total price ascending (billigst first)
  const sorted = [...valid].sort((a, b) => {
    const pa = calcRecipePrice(a, products, persons, selectedChains, prisLogik).totalPris;
    const pb = calcRecipePrice(b, products, persons, selectedChains, prisLogik).totalPris;
    return pa - pb;
  });

  // Pick cheapest recipes without repeating
  const picked: (Recipe | null)[] = [];
  const used = new Set<string>();

  for (let i = 0; i < days; i++) {
    const recipe = sorted.find((r) => !used.has(r.slug)) ?? null;
    if (recipe) used.add(recipe.slug);
    picked.push(recipe);
  }

  // Build shopping list
  const indkoebsliste: ShoppingItem[] = [];
  for (const recipe of picked) {
    if (!recipe) continue;
    const price = calcRecipePrice(recipe, products, persons, selectedChains, prisLogik);
    indkoebsliste.push(...buildShoppingList(recipe, price.matchede));
  }

  const totalPris = picked.reduce((sum, r) => {
    if (!r) return sum;
    return sum + calcRecipePrice(r, products, persons, selectedChains, prisLogik).totalPris;
  }, 0);

  return {
    days: picked.map((recipe, i) => ({ day: DAY_NAMES[i], recipe })),
    totalPris,
    prPerPerson: persons > 0 ? totalPris / persons : totalPris,
    indkoebsliste,
  };
}

export { DAY_NAMES };
