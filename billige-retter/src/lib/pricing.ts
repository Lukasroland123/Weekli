import { Recipe, Product, RecipePrice, MatchedIngredient, ShoppingItem, PrisLogik, RecipeIngredientDef } from "./types";

// Normalize package size to base unit (g or ml)
function normalizeSize(maengde: number, enhed: string): number {
  if (enhed === "kg") return maengde * 1000;
  if (enhed === "l") return maengde * 1000;
  return maengde;
}

// Find the cheapest product+quantity to cover a needed amount.
// "pris" mode: minimizes total upfront cost (ceil(need/pkg) × price)
// "kilopris" mode: minimizes price per unit
function findBestOption(
  products: Product[],
  maengdeBehoevet: number,
  prisLogik: PrisLogik
): { produkt: Product; pakker: number; pris: number } | null {
  const valid = products.filter((p) => p.maengde != null && p.maengde > 0);
  if (valid.length === 0) return null;

  let best: { produkt: Product; pakker: number; pris: number } | null = null;

  for (const p of valid) {
    const pkgSize = normalizeSize(p.maengde, p.maengdeEnhed);
    const pakker = Math.ceil(maengdeBehoevet / pkgSize);
    const pris = pakker * p.normalPris;

    if (!best) {
      best = { produkt: p, pakker, pris };
      continue;
    }

    if (prisLogik === "pris") {
      // Lowest total cost to cover the need
      if (pris < best.pris) best = { produkt: p, pakker, pris };
    } else {
      // Best price per unit (kilopris)
      const thisPrEnhed = p.normalPris / pkgSize;
      const bestPrEnhed = best.produkt.normalPris / normalizeSize(best.produkt.maengde, best.produkt.maengdeEnhed);
      if (thisPrEnhed < bestPrEnhed) best = { produkt: p, pakker, pris };
    }
  }

  return best;
}

export function calcRecipePrice(
  recipe: Recipe,
  products: Product[],
  persons: number,
  selectedChains: string[],
  prisLogik: PrisLogik
): RecipePrice {
  const matchede: MatchedIngredient[] = [];
  const manglerMatch: string[] = [];

  const activeProducts =
    selectedChains.length === 0
      ? products
      : products.filter((p) => selectedChains.includes(p.butik));

  for (const ing of recipe.ingredienser) {
    // Skip placeholders (salat, blandede grøntsager — resolved elsewhere)
    if ("placeholder" in ing) continue;

    const ingDef = ing as RecipeIngredientDef;

    // Scale amount — respect minTotal
    const maengdeBehoevet = Math.max(
      ingDef.maengde * persons,
      ingDef.minTotal ?? 0
    );

    // Support kandidater: try all listed canonicals, pick cheapest across all
    const canonicals = ingDef.kandidater ?? [ingDef.canonical];
    const kandidater = activeProducts.filter((p) =>
      canonicals.map((c) => c.toUpperCase()).includes(p.kategori.toUpperCase())
    );

    if (kandidater.length === 0) {
      manglerMatch.push(ingDef.canonical);
      continue;
    }

    const match = findBestOption(kandidater, maengdeBehoevet, prisLogik);
    if (!match) {
      manglerMatch.push(ingDef.canonical);
      continue;
    }

    matchede.push({
      canonical: ingDef.canonical,
      maengdeBehoevet,
      enhed: ingDef.enhed,
      ...match,
    });
  }

  const totalPris = matchede.reduce((sum, m) => sum + m.pris, 0);

  return {
    totalPris,
    prPerPerson: persons > 0 ? totalPris / persons : totalPris,
    matchede,
    manglerMatch,
  };
}

export function buildShoppingList(
  recipe: Recipe,
  matchede: MatchedIngredient[]
): ShoppingItem[] {
  return matchede.map((m, i) => ({
    id: `${recipe.slug}-${m.canonical}-${i}`,
    navn: m.produkt.produktnavn,
    pakker: m.pakker,
    maengde: m.produkt.maengde,
    maengdeEnhed: m.produkt.maengdeEnhed,
    pris: m.pris,
    butik: m.produkt.butik,
    opskriftTitel: recipe.titel,
  }));
}

// Format a decimal stk amount as a fraction for RECIPE display.
// Examples: 0.25 → "¼", 0.5 → "½", 1.25 → "1¼", 2 → "2"
export function formatStk(amount: number): string {
  const whole = Math.floor(amount);
  const frac = amount - whole;

  let fracStr = "";
  if (frac >= 0.01 && frac < 0.3) fracStr = "¼";
  else if (frac >= 0.3 && frac < 0.6) fracStr = "½";
  else if (frac >= 0.6 && frac < 0.9) fracStr = "¾";
  else if (frac >= 0.9) return `${whole + 1}`; // round 7/8+ to next whole

  if (whole === 0) return fracStr || "0";
  return fracStr ? `${whole}${fracStr}` : `${whole}`;
}

// Returns true if a product is sold loose (løse) — weighed at store, not pre-packaged.
// Rule: TOMATER with package < 150g = løse. Add more canonicals + thresholds as needed.
function erLøs(canonical: string, maengde: number, enhed: string): boolean {
  if (enhed !== "g") return false;
  if (canonical.toUpperCase() === "TOMATER" && maengde < 150) return true;
  return false;
}

// Format amount for SHOPPING LIST display — always whole purchasable units.
// Løse varer: show total weight needed + "(løse)". stk: whole number. g/ml: show grams.
export function formatShoppingAmount(canonical: string, pakker: number, maengde: number, enhed: string): string {
  if (erLøs(canonical, maengde, enhed)) {
    const total = pakker * maengde;
    return `${total} ${enhed} (løse)`;
  }
  if (enhed === "stk") return `${pakker} stk`;
  const total = pakker * maengde;
  if (total >= 1000 && (enhed === "g" || enhed === "ml")) {
    return `${(total / 1000).toFixed(1).replace(".0", "")} ${enhed === "g" ? "kg" : "l"}`;
  }
  return `${total} ${enhed}`;
}

// Format an ingredient amount for RECIPE display using vægtlogik.
// g-items with a known stk-weight are shown as fractions (¾ løg, 1½ broccoli).
// stk-items use formatStk directly. g/ml without mapping show raw grams.
export function formatRecipeAmount(
  canonical: string,
  maengdeBehoevet: number,
  enhed: string,
  vaegtLogik: Record<string, { stkVaegt: number }>
): string {
  if (enhed === "stk") {
    return `${formatStk(maengdeBehoevet)} stk`;
  }
  const vl = vaegtLogik[canonical.toUpperCase()];
  if (vl) {
    const antal = maengdeBehoevet / vl.stkVaegt;
    return `${formatStk(antal)} stk`;
  }
  if (maengdeBehoevet >= 1000) {
    const val = maengdeBehoevet / 1000;
    return `${val % 1 === 0 ? val : val.toFixed(1)} ${enhed === "g" ? "kg" : "l"}`;
  }
  return `${Math.round(maengdeBehoevet)} ${enhed}`;
}

export function formatPrice(kr: number): string {
  return `${kr.toFixed(0)} kr`;
}
