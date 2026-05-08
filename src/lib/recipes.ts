import { Recipe } from "./types";
import recipesJson from "@/data/recipes.json";

// Recipes are stored in src/data/recipes.json
// Add new recipes there — no Supabase, no API calls
export function useRecipes(): { recipes: Recipe[]; loading: false } {
  return { recipes: recipesJson as Recipe[], loading: false };
}
