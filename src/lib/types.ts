export type Tag = "vegetar" | "kød" | "fisk" | "kylling";
export type PrisLogik = "pris" | "tilbud";

export interface FridgeItem {
  canonical: string;
  maengde: number;   // amount stored by user
  enhed: string;     // "g" | "kg" | "ml" | "l" | "stk"
}

// Product from CSV data (after processing)
export interface Product {
  butik: string;          // "REMA 1000" | "FØTEX" | "NETTO"
  kategori: string;       // canonical word — matches RecipeIngredientDef.canonical
  produktnavn: string;
  normalPris: number;     // kr — primary price for calculations
  maengde: number;        // numeric package size
  maengdeEnhed: string;   // "g" | "kg" | "ml" | "l" | "stk"
  kilopris?: number;
  stkPris?: number;
  maerke?: string;
  vegetar: boolean;
  paTilbud: boolean;      // metadata only — not the backbone price
}

// One ingredient line in a recipe (as written in JSON)
export interface RecipeIngredientDef {
  canonical: string;      // uppercase canonical, matches Product.kategori
  kandidater?: string[];  // if set, pick cheapest product from any of these canonicals
  maengde: number;        // amount per person
  enhed: string;          // "g" | "kg" | "ml" | "l" | "stk"
  minTotal?: number;      // minimum total amount regardless of persons (e.g. 5g = 1 fed hvidløg)
}

// Placeholder — resolved at runtime, never shown to user as-is
export type SalatType = "salat_fisk" | "salat_okse" | "salat_svin" | "salat_kylling";

export interface RecipePlaceholder {
  placeholder: SalatType | "blandede grøntsager";
  kandidater?: string[];  // required for "blandede grøntsager" — canonical categories to pick from
  antal?: number;         // how many to pick for "blandede grøntsager" (default: 2)
}

export type RecipeIngredient = RecipeIngredientDef | RecipePlaceholder;

// Salad from salater.json — mini-recipe used as side dish
export interface Salat {
  id: string;
  navn: string;
  passer_til: Array<"fisk" | "okse" | "svin" | "kylling" | "vegetar">;
  ingredienser: RecipeIngredientDef[];
  basisvarer?: string[];
}

// Recipe as stored in src/data/recipes.json
export interface Recipe {
  slug: string;
  titel: string;
  beskrivelse: string;
  personer: number;
  tags: Tag[];
  tilberedningstid?: number;  // minutes
  imageUrl?: string;
  ingredienser: RecipeIngredient[];
  basisvarer: string[];       // shown on page without price, not in calculations
  fremgangsmaade?: string[];  // cooking steps
}

// A computed match: one recipe ingredient resolved to a product
export interface MatchedIngredient {
  canonical: string;
  maengdeBehoevet: number;  // total needed (scaled to persons)
  enhed: string;
  produkt: Product;
  pakker: number;           // number of packages to buy
  pris: number;             // total cost (pakker × normalPris)
  spar: number;             // savings vs. best non-tilbud option (0 if none)
}

// Result of pricing a recipe
export interface RecipePrice {
  totalPris: number;
  prPerPerson: number;
  matchede: MatchedIngredient[];
  manglerMatch: string[];   // canonicals with no product found in selected chains
  sparPris: number;         // total savings from tilbud products (0 if none)
}

// Item in shopping list
export interface ShoppingItem {
  id: string;
  navn: string;
  pakker: number;
  maengde: number;
  maengdeEnhed: string;
  pris: number;
  butik: string;
  opskriftTitel: string;
}

// Weekly plan
export interface WeeklyPlan {
  days: Array<{
    day: string;
    recipe: Recipe | null;
  }>;
  totalPris: number;
  prPerPerson: number;
  indkoebsliste: ShoppingItem[];
}

export interface SavedRecipe {
  slug: string;
  persons: number;
}

export interface SavedPlan {
  id: string;
  date: string;    // "DD-MM-YYYY"
  persons: number;
  slugs: string[];
}

export interface UserRecipeIngredient {
  canonical: string;
  maengde: number;
  enhed: string;
}

export interface UserRecipe {
  id: string;
  name: string;
  ingredienser: UserRecipeIngredient[];
  fremgangsmaade?: string;
}

// App-wide state
export interface AppState {
  persons: number;
  selectedChains: string[];  // [] = all chains; ["REMA 1000"] = only Rema etc.
  prisLogik: PrisLogik;
  weekDays: number;
  tagFilters: Tag[];          // [] = no filter (all shown)
  searchQuery: string;
  searchType: "retter" | "varer";
  fridgeItems: FridgeItem[];  // ingredients with amounts already at home
  savedRecipes: SavedRecipe[];
  savedPlans: SavedPlan[];
  userRecipes: UserRecipe[];
  completedPlanIds: string[];
  completedRecipeSlugs: string[];
}
