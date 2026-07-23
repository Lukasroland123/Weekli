#!/usr/bin/env node
// Datavalidering for Weekli.
// Tjekker at opskrifter og salater kobler korrekt til produktdatabasen, så en
// forkert canonical, enhed eller manglende salat fanges FØR deploy — ikke af brugeren.
//
// Kør: npm run validate
// Exit 0 = alt OK (advarsler tilladt). Exit 1 = mindst én hård fejl.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

const products = read("src/data/products.json");
const recipes = read("src/data/recipes.json");
const salater = read("src/data/salater.json");

// --- Opslag ---
const kategorier = new Set(
  products.map((p) => String(p.kategori ?? "").trim().toUpperCase()).filter(Boolean)
);
const salatIds = new Set(salater.map((s) => String(s.id).toLowerCase()));

const GYLDIGE_ENHEDER = new Set(["g", "kg", "ml", "l", "stk"]);
const GYLDIGE_TAGS = new Set(["vegetar", "kød", "fisk", "kylling"]);
const SALAT_TYPER = new Set(["salat_fisk", "salat_okse", "salat_svin", "salat_kylling"]);
const SALAT_PROTEIN = {
  salat_fisk: "fisk", salat_okse: "okse", salat_svin: "svin", salat_kylling: "kylling",
};

const errors = [];
const warnings = [];
const E = (hvor, msg) => errors.push(`${hvor}: ${msg}`);
const W = (hvor, msg) => warnings.push(`${hvor}: ${msg}`);

// Tjek én almindelig ingrediens (RecipeIngredientDef) — bruges af både opskrifter og salater.
function tjekIngrediens(hvor, ing) {
  // pricing.ts bruger `kandidater ?? [canonical]` som opslagsnøgler
  const nøgler = (ing.kandidater ?? [ing.canonical]).map((c) => String(c).toUpperCase());
  const findes = nøgler.filter((k) => kategorier.has(k));
  if (findes.length === 0) {
    E(hvor, `ingen af canonical/kandidater findes i products.json: [${nøgler.join(", ")}]`);
  } else if (ing.kandidater) {
    const mangler = nøgler.filter((k) => !kategorier.has(k));
    if (mangler.length > 0) W(hvor, `kandidat(er) findes ikke (ignoreres): [${mangler.join(", ")}]`);
  }
  if (!GYLDIGE_ENHEDER.has(ing.enhed)) E(hvor, `ugyldig enhed "${ing.enhed}"`);
  if (typeof ing.maengde !== "number" || ing.maengde <= 0 || Number.isNaN(ing.maengde)) {
    E(hvor, `ugyldig maengde: ${JSON.stringify(ing.maengde)}`);
  }
  if (ing.minTotal !== undefined && (typeof ing.minTotal !== "number" || ing.minTotal < 0)) {
    E(hvor, `ugyldig minTotal: ${JSON.stringify(ing.minTotal)}`);
  }
}

// Hvilke salat-typer bruges reelt af opskrifter (til dækningstjek)
const brugteSalatTyper = new Set();

// --- Opskrifter ---
const sluglisten = new Set();
for (const r of recipes) {
  const hvor = `recipe "${r.slug ?? "?"}"`;
  if (!r.slug) E(hvor, "mangler slug");
  else if (sluglisten.has(r.slug)) E(hvor, "duplikeret slug");
  else sluglisten.add(r.slug);

  if (!Array.isArray(r.tags)) E(hvor, "tags mangler eller er ikke et array");
  else for (const t of r.tags) if (!GYLDIGE_TAGS.has(t)) W(hvor, `ukendt tag "${t}"`);

  if (typeof r.personer !== "number" || r.personer <= 0) E(hvor, `ugyldigt personer: ${r.personer}`);

  if (!Array.isArray(r.ingredienser) || r.ingredienser.length === 0) {
    E(hvor, "ingredienser mangler eller er tom");
    continue;
  }
  r.ingredienser.forEach((ing, i) => {
    const iHvor = `${hvor} ing[${i}]`;
    if (ing && "placeholder" in ing) {
      const ph = ing.placeholder;
      if (SALAT_TYPER.has(ph)) {
        brugteSalatTyper.add(ph);
        if (Array.isArray(ing.kandidater)) {
          const ukendte = ing.kandidater.filter((id) => !salatIds.has(String(id).toLowerCase()));
          if (ukendte.length) E(iHvor, `salat-kandidat-id findes ikke i salater.json: [${ukendte.join(", ")}]`);
        }
      } else if (ph === "blandede grøntsager") {
        W(iHvor, `placeholder "blandede grøntsager" resolves ikke i pricing.ts endnu`);
        if (Array.isArray(ing.kandidater)) {
          const ukendte = ing.kandidater.map((c) => String(c).toUpperCase()).filter((k) => !kategorier.has(k));
          if (ukendte.length) E(iHvor, `kandidat-kategori(er) findes ikke: [${ukendte.join(", ")}]`);
        }
      } else {
        E(iHvor, `ukendt placeholder "${ph}"`);
      }
    } else if (ing && "canonical" in ing) {
      tjekIngrediens(iHvor, ing);
    } else {
      E(iHvor, `hverken canonical eller placeholder: ${JSON.stringify(ing)}`);
    }
  });
}

// --- Salater ---
for (const s of salater) {
  const hvor = `salat "${s.id ?? "?"}"`;
  if (!Array.isArray(s.passer_til) || s.passer_til.length === 0) E(hvor, "passer_til mangler/tom");
  else for (const p of s.passer_til)
    if (!["fisk", "okse", "svin", "kylling", "vegetar"].includes(p)) W(hvor, `ukendt passer_til "${p}"`);
  if (!Array.isArray(s.ingredienser) || s.ingredienser.length === 0) E(hvor, "ingredienser mangler/tom");
  else s.ingredienser.forEach((ing, i) => tjekIngrediens(`${hvor} ing[${i}]`, ing));
}

// --- Salat-dækning: hver brugt salat-type skal have mindst én matchende salat ---
for (const type of brugteSalatTyper) {
  const protein = SALAT_PROTEIN[type];
  const antal = salater.filter((s) => (s.passer_til ?? []).includes(protein)).length;
  if (antal === 0) E(`salat-dækning`, `placeholder "${type}" bruges, men ingen salat i salater.json har passer_til "${protein}"`);
}

// --- Rapport ---
const linje = "─".repeat(60);
console.log(linje);
console.log(`Weekli datavalidering`);
console.log(`  ${products.length} produkter · ${kategorier.size} kategorier · ${recipes.length} opskrifter · ${salater.length} salater`);
console.log(linje);

if (warnings.length) {
  console.log(`\n⚠  ${warnings.length} advarsel(er):`);
  for (const w of warnings) console.log(`   - ${w}`);
}

if (errors.length) {
  console.log(`\n✗  ${errors.length} FEJL:`);
  for (const e of errors) console.log(`   - ${e}`);
  console.log(`\nValidering FEJLEDE.`);
  process.exit(1);
} else {
  console.log(`\n✓  Ingen fejl. Alle canonicals kobler til produktdatabasen.`);
  process.exit(0);
}
