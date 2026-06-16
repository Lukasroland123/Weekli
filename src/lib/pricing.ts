import { Recipe, Product, RecipePrice, MatchedIngredient, ShoppingItem, PrisLogik, RecipeIngredientDef, Salat, SalatType, RecipePlaceholder, FridgeItem, UserRecipe } from "./types";
import salaterJson from "@/data/salater.json";
import vaegtLogikJson from "@/data/vaegt-logik.json";

// Build a lookup map from vaegt-logik.json at module level (not a hook)
const vl_map: Record<string, { stkVaegt: number; enhed: string }> = {};
for (const entry of vaegtLogikJson as Array<{ kategori: string; stkVaegt: number; enhed: string }>) {
  vl_map[entry.kategori.toUpperCase()] = { stkVaegt: entry.stkVaegt, enhed: entry.enhed };
}

// Convert an amount+unit to grams. Returns null if not convertible to grams.
function toGrams(amount: number, enhed: string, canonical: string): number | null {
  if (enhed === "g") return amount;
  if (enhed === "kg") return amount * 1000;
  if (enhed === "ml" || enhed === "l") return null; // not convertible to g
  if (enhed === "stk") {
    const vl = vl_map[canonical.toUpperCase()];
    if (vl) return amount * vl.stkVaegt;
    return null;
  }
  return null;
}

// Convert an amount+unit to millilitres. Returns null if not convertible to ml.
function toMl(amount: number, enhed: string): number | null {
  if (enhed === "ml") return amount;
  if (enhed === "l") return amount * 1000;
  return null;
}

const salater = salaterJson as Salat[];

const SALAT_TYPE_MAP: Record<SalatType, string> = {
  salat_fisk:    "fisk",
  salat_okse:    "okse",
  salat_svin:    "svin",
  salat_kylling: "kylling",
};

function priceSalatIngredients(
  salat: Salat,
  products: Product[],
  persons: number,
  prisLogik: PrisLogik
): { matchede: MatchedIngredient[]; manglerMatch: string[]; totalPris: number; sparPris: number } {
  const matchede: MatchedIngredient[] = [];
  const manglerMatch: string[] = [];
  let sparPris = 0;

  for (const ing of salat.ingredienser) {
    const maengdeBehoevet = Math.max(ing.maengde * persons, ing.minTotal ?? 0);
    const canonicals = (ing.kandidater ?? [ing.canonical]).map((c) => c.toUpperCase());
    const kandidater = products.filter((p) => canonicals.includes(p.kategori.toUpperCase()));

    if (kandidater.length === 0) { manglerMatch.push(ing.canonical); continue; }
    const match = findBestOption(kandidater, maengdeBehoevet);
    if (!match) { manglerMatch.push(ing.canonical); continue; }

    sparPris += match.spar;
    matchede.push({ canonical: ing.canonical, maengdeBehoevet, enhed: ing.enhed, produkt: match.produkt, pakker: match.pakker, pris: match.pris, spar: match.spar });
  }

  return { matchede, manglerMatch, totalPris: matchede.reduce((s, m) => s + m.pris, 0), sparPris };
}

function resolveSalatPlaceholder(
  type: SalatType,
  products: Product[],
  persons: number,
  prisLogik: PrisLogik
): { matchede: MatchedIngredient[]; manglerMatch: string[]; sparPris: number } | null {
  const passerTil = SALAT_TYPE_MAP[type];
  const candidates = salater.filter((s) => (s.passer_til as string[]).includes(passerTil));
  if (candidates.length === 0) return null;

  let best: ReturnType<typeof priceSalatIngredients> | null = null;
  for (const salat of candidates) {
    const result = priceSalatIngredients(salat, products, persons, prisLogik);
    if (!best || result.totalPris < best.totalPris) best = result;
  }

  return best ? { matchede: best.matchede, manglerMatch: best.manglerMatch, sparPris: best.sparPris } : null;
}

// Normalize package size to base unit (g or ml)
function normalizeSize(maengde: number, enhed: string): number {
  if (enhed === "kg") return maengde * 1000;
  if (enhed === "l") return maengde * 1000;
  return maengde;
}

// Find the cheapest product+quantity to cover a needed amount (minimise total upfront cost).
// Returns spar > 0 when a tilbud product wins over the best regular price.
export function findBestOption(
  products: Product[],
  maengdeBehoevet: number,
): { produkt: Product; pakker: number; pris: number; spar: number } | null {
  const valid = products.filter((p) => p.maengde != null && p.maengde > 0);
  if (valid.length === 0) return null;

  type Candidate = { produkt: Product; pakker: number; pris: number };
  let best: Candidate | null = null;
  let bestRegular: Candidate | null = null;

  for (const p of valid) {
    const pkgSize = normalizeSize(p.maengde, p.maengdeEnhed);
    const pakker = Math.ceil(maengdeBehoevet / pkgSize);
    const pris = pakker * p.normalPris;
    const candidate: Candidate = { produkt: p, pakker, pris };

    if (!best || pris < best.pris) best = candidate;
    if (!p.paTilbud && (!bestRegular || pris < bestRegular.pris)) bestRegular = candidate;
  }

  if (!best) return null;

  const spar =
    best.produkt.paTilbud && bestRegular
      ? Math.max(0, bestRegular.pris - best.pris)
      : 0;

  return { ...best, spar };
}

export function calcRecipePrice(
  recipe: Recipe,
  products: Product[],
  persons: number,
  selectedChains: string[],
  prisLogik: PrisLogik,
  fridgeItems: FridgeItem[] = []
): RecipePrice {
  const matchede: MatchedIngredient[] = [];
  const manglerMatch: string[] = [];
  let sparPris = 0;

  const activeProducts =
    selectedChains.length === 0
      ? products
      : products.filter((p) => selectedChains.includes(p.butik));

  for (const ing of recipe.ingredienser) {
    if ("placeholder" in ing) {
      const ph = ing as RecipePlaceholder;
      if (ph.placeholder in SALAT_TYPE_MAP) {
        const result = resolveSalatPlaceholder(ph.placeholder as SalatType, activeProducts, persons, prisLogik);
        if (result) {
          matchede.push(...result.matchede);
          manglerMatch.push(...result.manglerMatch);
          sparPris += result.sparPris;
        }
      }
      continue;
    }

    const ingDef = ing as RecipeIngredientDef;

    // Scale amount — respect minTotal
    const maengdeBehoevet = Math.max(
      ingDef.maengde * persons,
      ingDef.minTotal ?? 0
    );

    // Fridge: check if ingredient is (partially) covered by fridge items
    const fridgeItem = fridgeItems.find(
      (f) => f.canonical.toUpperCase() === ingDef.canonical.toUpperCase()
    );
    if (fridgeItem) {
      // Try to compare in grams first
      const fridgeG = toGrams(fridgeItem.maengde, fridgeItem.enhed, fridgeItem.canonical);
      const needG = toGrams(maengdeBehoevet, ingDef.enhed, ingDef.canonical);

      // Try to compare in ml if grams failed
      const fridgeMl = fridgeG === null ? toMl(fridgeItem.maengde, fridgeItem.enhed) : null;
      const needMl = needG === null ? toMl(maengdeBehoevet, ingDef.enhed) : null;

      const fridgeComparable = fridgeG ?? fridgeMl;
      const needComparable = needG ?? needMl;

      if (fridgeComparable !== null && needComparable !== null) {
        if (fridgeComparable >= needComparable) {
          // Fridge covers 100% — free
          matchede.push({
            canonical: ingDef.canonical,
            maengdeBehoevet,
            enhed: ingDef.enhed,
            produkt: { butik: "", kategori: ingDef.canonical, produktnavn: "Har du allerede", normalPris: 0, maengde: 0, maengdeEnhed: ingDef.enhed, vegetar: true, paTilbud: false },
            pakker: 0,
            pris: 0,
            spar: 0,
          });
          continue;
        } else {
          // Partial coverage: compute remaining in original recipe unit
          const coveredFraction = fridgeComparable / needComparable;
          const remainingNeeded = maengdeBehoevet * (1 - coveredFraction);

          const canonicals = ingDef.kandidater ?? [ingDef.canonical];
          const kandidater = activeProducts.filter((p) =>
            canonicals.map((c) => c.toUpperCase()).includes(p.kategori.toUpperCase())
          );

          if (kandidater.length === 0) {
            manglerMatch.push(ingDef.canonical);
            continue;
          }
          const match = findBestOption(kandidater, remainingNeeded);
          if (!match) {
            manglerMatch.push(ingDef.canonical);
            continue;
          }
          sparPris += match.spar;
          matchede.push({
            canonical: ingDef.canonical,
            maengdeBehoevet,
            enhed: ingDef.enhed,
            produkt: match.produkt,
            pakker: match.pakker,
            pris: match.pris,
            spar: match.spar,
          });
          continue;
        }
      } else {
        // Units can't be compared — fall back: treat as fully free
        matchede.push({
          canonical: ingDef.canonical,
          maengdeBehoevet,
          enhed: ingDef.enhed,
          produkt: { butik: "", kategori: ingDef.canonical, produktnavn: "Har du allerede", normalPris: 0, maengde: 0, maengdeEnhed: ingDef.enhed, vegetar: true, paTilbud: false },
          pakker: 0,
          pris: 0,
          spar: 0,
        });
        continue;
      }
    }

    // Support kandidater: try all listed canonicals, pick cheapest across all
    const canonicals = ingDef.kandidater ?? [ingDef.canonical];
    const kandidater = activeProducts.filter((p) =>
      canonicals.map((c) => c.toUpperCase()).includes(p.kategori.toUpperCase())
    );

    if (kandidater.length === 0) {
      manglerMatch.push(ingDef.canonical);
      continue;
    }

    const match = findBestOption(kandidater, maengdeBehoevet);
    if (!match) {
      manglerMatch.push(ingDef.canonical);
      continue;
    }

    sparPris += match.spar;
    matchede.push({
      canonical: ingDef.canonical,
      maengdeBehoevet,
      enhed: ingDef.enhed,
      produkt: match.produkt,
      pakker: match.pakker,
      pris: match.pris,
      spar: match.spar,
    });
  }

  const totalPris = matchede.reduce((sum, m) => sum + m.pris, 0);

  return {
    totalPris,
    prPerPerson: persons > 0 ? totalPris / persons : totalPris,
    matchede,
    manglerMatch,
    sparPris,
  };
}

// Prisberegning for brugerens egne opskrifter (Profil → Tilføj opskrift).
// Ingrediensmængder er indtastet som TOTAL for opskriftens personantal — ikke per person
// som i recipes.json — så der skaleres ikke yderligere, i modsætning til calcRecipePrice().
export function calcUserRecipePrice(
  recipe: UserRecipe,
  products: Product[],
  selectedChains: string[]
): RecipePrice {
  const matchede: MatchedIngredient[] = [];
  const manglerMatch: string[] = [];
  let sparPris = 0;

  const activeProducts =
    selectedChains.length === 0
      ? products
      : products.filter((p) => selectedChains.includes(p.butik));

  for (const ing of recipe.ingredienser) {
    const kandidater = activeProducts.filter(
      (p) => p.kategori.toUpperCase() === ing.canonical.toUpperCase()
    );

    if (kandidater.length === 0) {
      manglerMatch.push(ing.canonical);
      continue;
    }

    const match = findBestOption(kandidater, ing.maengde);
    if (!match) {
      manglerMatch.push(ing.canonical);
      continue;
    }

    sparPris += match.spar;
    matchede.push({
      canonical: ing.canonical,
      maengdeBehoevet: ing.maengde,
      enhed: ing.enhed,
      produkt: match.produkt,
      pakker: match.pakker,
      pris: match.pris,
      spar: match.spar,
    });
  }

  const totalPris = matchede.reduce((sum, m) => sum + m.pris, 0);

  return {
    totalPris,
    prPerPerson: recipe.personer > 0 ? totalPris / recipe.personer : totalPris,
    matchede,
    manglerMatch,
    sparPris,
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
export function erLøs(canonical: string, maengde: number, enhed: string): boolean {
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
