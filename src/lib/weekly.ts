import { Recipe, Product, WeeklyPlan, PrisLogik, ShoppingItem, Tag, RecipeIngredientDef, FridgeItem } from "./types";
import { findBestOption } from "./pricing";
import vaegtLogikJson from "@/data/vaegt-logik.json";

// Module-level vaegt-logik map for unit conversions
const vl_map: Record<string, { stkVaegt: number; enhed: string }> = {};
for (const entry of vaegtLogikJson as Array<{ kategori: string; stkVaegt: number; enhed: string }>) {
  vl_map[entry.kategori.toUpperCase()] = { stkVaegt: entry.stkVaegt, enhed: entry.enhed };
}

function toGrams(amount: number, enhed: string, canonical: string): number | null {
  if (enhed === "g") return amount;
  if (enhed === "kg") return amount * 1000;
  if (enhed === "ml" || enhed === "l") return null;
  if (enhed === "stk") {
    const vl = vl_map[canonical.toUpperCase()];
    if (vl) return amount * vl.stkVaegt;
    return null;
  }
  return null;
}

function toMl(amount: number, enhed: string): number | null {
  if (enhed === "ml") return amount;
  if (enhed === "l") return amount * 1000;
  return null;
}

const DAY_NAMES = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"];

export function filterRecipes(recipes: Recipe[], tagFilters: Tag[]): Recipe[] {
  if (tagFilters.length === 0) return recipes;
  return recipes.filter((r) => tagFilters.some((t) => r.tags.includes(t)));
}

// Collect combined ingredient needs across a set of recipes.
// Fridge items are deducted — fully covered items are skipped, partially covered are reduced.
function aggregateNeeds(
  recipes: Recipe[],
  persons: number,
  fridgeItems: FridgeItem[]
): Map<string, { totalNeeded: number; enhed: string }> {
  const needs = new Map<string, { totalNeeded: number; enhed: string }>();
  for (const r of recipes) {
    for (const ing of r.ingredienser) {
      if ("placeholder" in ing) continue;
      const ingDef = ing as RecipeIngredientDef;
      const canonical = ingDef.canonical.toUpperCase();
      const needed = Math.max(ingDef.maengde * persons, ingDef.minTotal ?? 0);

      const fridgeItem = fridgeItems.find((f) => f.canonical.toUpperCase() === canonical);
      let effectiveNeeded = needed;

      if (fridgeItem) {
        const fridgeG = toGrams(fridgeItem.maengde, fridgeItem.enhed, fridgeItem.canonical);
        const needG = toGrams(needed, ingDef.enhed, ingDef.canonical);
        const fridgeMl = fridgeG === null ? toMl(fridgeItem.maengde, fridgeItem.enhed) : null;
        const needMl = needG === null ? toMl(needed, ingDef.enhed) : null;

        const fridgeComparable = fridgeG ?? fridgeMl;
        const needComparable = needG ?? needMl;

        if (fridgeComparable !== null && needComparable !== null) {
          if (fridgeComparable >= needComparable) {
            // Fully covered — skip
            continue;
          } else {
            // Partial coverage
            const coveredFraction = fridgeComparable / needComparable;
            effectiveNeeded = needed * (1 - coveredFraction);
          }
        } else {
          // Can't compare units — treat as fully free
          continue;
        }
      }

      const existing = needs.get(canonical);
      if (existing) {
        existing.totalNeeded += effectiveNeeded;
      } else {
        needs.set(canonical, { totalNeeded: effectiveNeeded, enhed: ingDef.enhed });
      }
    }
  }
  return needs;
}

// Total purchase cost for a set of recipes using shared packages across the whole plan.
export function calcPlanCost(
  recipes: Recipe[],
  products: Product[],
  persons: number,
  fridgeItems: FridgeItem[] = []
): number {
  const needs = aggregateNeeds(recipes, persons, fridgeItems);
  let total = 0;
  for (const [canonical, { totalNeeded }] of needs) {
    const prods = products.filter((p) => p.kategori.toUpperCase() === canonical);
    if (prods.length === 0) continue;
    const match = findBestOption(prods, totalNeeded);
    if (match) total += match.pris;
  }
  return total;
}

// Total tilbud-besparelse for en hel plan — samme aggregering som calcPlanCost,
// men summerer match.spar i stedet for match.pris.
export function calcPlanSpar(
  recipes: Recipe[],
  products: Product[],
  persons: number,
  fridgeItems: FridgeItem[] = []
): number {
  const needs = aggregateNeeds(recipes, persons, fridgeItems);
  let total = 0;
  for (const [canonical, { totalNeeded }] of needs) {
    const prods = products.filter((p) => p.kategori.toUpperCase() === canonical);
    if (prods.length === 0) continue;
    const match = findBestOption(prods, totalNeeded);
    if (match) total += match.spar;
  }
  return total;
}

// Aggregated shopping list for a whole plan — each item covers all recipes that need it.
export function buildPlanShoppingList(
  recipes: Recipe[],
  products: Product[],
  persons: number,
  fridgeItems: FridgeItem[] = []
): ShoppingItem[] {
  const needs = aggregateNeeds(recipes, persons, fridgeItems);

  // Track which recipe titles use each canonical
  const recipesByCanonical = new Map<string, string[]>();
  for (const r of recipes) {
    for (const ing of r.ingredienser) {
      if ("placeholder" in ing) continue;
      const canonical = (ing as RecipeIngredientDef).canonical.toUpperCase();
      const list = recipesByCanonical.get(canonical) ?? [];
      if (!list.includes(r.titel)) list.push(r.titel);
      recipesByCanonical.set(canonical, list);
    }
  }

  const items: ShoppingItem[] = [];
  let idx = 0;
  for (const [canonical, { totalNeeded }] of needs) {
    const prods = products.filter((p) => p.kategori.toUpperCase() === canonical);
    if (prods.length === 0) continue;
    const match = findBestOption(prods, totalNeeded);
    if (!match) continue;
    items.push({
      id: `plan-${canonical}-${idx++}`,
      navn: match.produkt.produktnavn,
      pakker: match.pakker,
      maengde: match.produkt.maengde,
      maengdeEnhed: match.produkt.maengdeEnhed,
      pris: match.pris,
      butik: match.produkt.butik,
      opskriftTitel: (recipesByCanonical.get(canonical) ?? []).join(", "),
    });
  }
  return items;
}

export function generateWeeklyPlan(
  recipes: Recipe[],
  products: Product[],
  selectedChains: string[],
  prisLogik: PrisLogik,
  persons: number,
  days: number,
  fridgeItems: FridgeItem[] = []
): WeeklyPlan {
  const activeProducts =
    selectedChains.length === 0
      ? products
      : products.filter((p) => selectedChains.includes(p.butik));

  // Only include recipes where every ingredient has at least one matching product
  const valid = recipes.filter((r) =>
    r.ingredienser.every((ing) => {
      if ("placeholder" in ing) return true;
      const ingDef = ing as RecipeIngredientDef;
      const canonical = ingDef.canonical.toUpperCase();
      if (fridgeItems.some((f) => f.canonical.toUpperCase() === canonical)) return true;
      const canonicals = (ingDef.kandidater ?? [ingDef.canonical]).map((c) => c.toUpperCase());
      return activeProducts.some((p) => canonicals.includes(p.kategori.toUpperCase()));
    })
  );

  // Greedy selection: at each step pick the recipe with the lowest marginal cost.
  // Diversity rule: prefer recipes whose primary tag differs from the previous day.
  // Only falls back to same tag if no other valid recipes exist.
  const picked: Recipe[] = [];
  const used = new Set<string>();

  for (let i = 0; i < days; i++) {
    const baseCost = calcPlanCost(picked, activeProducts, persons, fridgeItems);
    const lastTag = picked.length > 0 ? picked[picked.length - 1].tags[0] : null;

    const eligible = valid.filter((r) => !used.has(r.slug));
    const diverse = lastTag ? eligible.filter((r) => !r.tags.includes(lastTag)) : eligible;
    const candidates = diverse.length > 0 ? diverse : eligible;

    let best: Recipe | null = null;
    let bestMarginal = Infinity;

    for (const r of candidates) {
      const marginal = calcPlanCost([...picked, r], activeProducts, persons, fridgeItems) - baseCost;
      if (marginal < bestMarginal) {
        bestMarginal = marginal;
        best = r;
      }
    }

    if (best) {
      picked.push(best);
      used.add(best.slug);
    }
  }

  const totalPris = calcPlanCost(picked, activeProducts, persons, fridgeItems);
  const sparPris = calcPlanSpar(picked, activeProducts, persons, fridgeItems);
  const indkoebsliste = buildPlanShoppingList(picked, activeProducts, persons, fridgeItems);

  return {
    days: picked.map((recipe, i) => ({ day: DAY_NAMES[i], recipe })),
    totalPris,
    prPerPerson: persons > 0 ? totalPris / persons : totalPris,
    sparPris,
    indkoebsliste,
  };
}

export { DAY_NAMES };
