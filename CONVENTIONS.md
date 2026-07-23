# Weekli — Konventioner og logik

> **Rolle:** Dette er *implementerings*-referencen — konkrete filstier, JSON-strukturer, enheder og
> funktioner i koden (*hvordan*). For den overordnede produktvision og de låste designbeslutninger
> (*hvad* og *hvorfor*), se `MASTER_SPEC_V2.md`. Ved konflikt om konkret dataformat/kode vinder
> dette dokument; om produktadfærd vinder MASTER_SPEC.

Dette dokument beskriver alle de regler og konventioner der gælder for data og logik i projektet.
Læs dette inden du tilføjer opskrifter, produkter eller ændrer prisberegningslogik.

---

## 1. Produktdatabasen (`src/data/products.json`)

- **Genereres automatisk** via `scripts/convert-excel.py` fra Excel-filerne i `Opdateret produktdatabase/` (i projektets rod)
- **Redigeres aldrig manuelt** — kør scriptet igen hvis data skal opdateres
- 3 kæder: `REMA 1000`, `NETTO`, `FØTEX`
- Ca. 388 produkter (126 FØTEX, 133 NETTO, 126+ REMA 1000)

### Feltstruktur (Product)
```ts
{
  butik: "REMA 1000" | "NETTO" | "FØTEX"
  kategori: string          // UPPERCASE — primær nøgle til opskrift-matching
  produktnavn: string
  normalPris: number        // kr — bruges til prisberegning
  maengde: number           // pakkestørrelse (numerisk)
  maengdeEnhed: string      // "g" | "kg" | "ml" | "l" | "stk"
  kilopris?: number
  stkPris?: number
  maerke?: string
  vegetar: boolean
  paTilbud: boolean         // metadata — bruges ikke til prisberegning
}
```

### Regel: stk-varer
Hvis en vare sælges pr. stk og `normalPris` er null men `stkPris` er sat → brug `stkPris` som `normalPris`.
Logik: for stk-varer gælder altid `1 stk = stkPris`.

### Regel: tomme rækker i Excel
Hvis en butik ikke fører en vare, er rækken tom (kun `kategori` er udfyldt).
Sådanne rækker springes over ved import — butikken har simpelthen ikke varen.

---

## 2. Opskriftsdatabasen (`src/data/recipes.json`)

### Feltstruktur (Recipe)
```json
{
  "slug": "kebab-rulle",
  "titel": "Kebab rulle",
  "beskrivelse": "Kort beskrivelse af retten",
  "personer": 4,
  "tags": ["kød"],
  "tilberedningstid": 25,
  "ingredienser": [...],
  "basisvarer": ["salt", "peber", "olie"],
  "fremgangsmaade": ["Trin 1...", "Trin 2..."]
}
```

### Tags
`"vegetar"` | `"kød"` | `"fisk"` | `"kylling"`

### `maengde` er ALTID per person
Alle mængder i `ingredienser` er per person, skaleres lineært.
- 4 personer × 80g = 320g ris total
- Aldrig afrund i opskriften — gem råtal (fx 0.25 stk)

### `canonical` matcher `kategori` i products.json (UPPERCASE)
```json
{ "canonical": "BASMATI RIS", "maengde": 80, "enhed": "g" }
```
Canonical skal matche præcis én kategori i produktdatabasen.

### `basisvarer`
Varer som salt, peber, olie, mel, krydderier — vises i UI men indgår IKKE i prisberegning.
Skriv med lille begyndelsesbogstav, kommasepareret liste.

### `minTotal`
Minimum total mængde uanset antal personer.
Eksempel: `{ "canonical": "HVIDLØG", "maengde": 3.75, "enhed": "g", "minTotal": 5 }`
→ Selv for 1 person bruges mindst 5g (= 1 fed hvidløg).

---

## 3. Enheder og konverteringer

### Enheder i opskrifter
| Enhed | Bruges til |
|-------|-----------|
| `g`   | Kød, ost, pasta, ris, konserves osv. |
| `ml`  | Væsker, creme fraiche, fløde, mælk |
| `stk` | Frugt, grønt der sælges enkeltvis, tortillas |
| `kg`  | Bruges ikke i opskrifter (kun i produktdata) |
| `l`   | Bruges ikke i opskrifter (kun i produktdata) |

### g ≈ ml for mejeriprodukter
Creme fraiche, fløde, skyr m.m.: behandl g og ml som ækkvivalente ved prisberegning.

### dl → ml
1 dl = 100 ml. Konverter altid til ml i opskriften.
- "2 dl creme fraiche" → `maengde: 50, enhed: "ml"` (per person for 4 pers.)

### Typiske dåsestørrelser i databasen
| Kategori | Standardpakke |
|----------|--------------|
| HAKKEDE TOMATER | 400 g |
| KIDNEYBØNNER | 240 g (drænet) |
| TOMATPURE | 140 g |

---

## 4. Vægtlogik (`src/data/vaegt-logik.json`)

**Frontend-visning kun** — bruges til at vise "2 løg" i stedet for "240 g løg".
Prisberegningen bruger altid gram.

| Kategori | g pr. stk |
|----------|-----------|
| CITRON | 100 g |
| ÆBLER | 115 g |
| GULERØDDER | 80 g |
| KARTOFLER | 100 g |
| TOMATER | 80 g |
| PEBERFRUGT | 200 g |
| SNACK PEBER | 65 g |
| KNOLDSELLERI | 900 g |
| SØDE KARTOFLER | 160 g |
| RØDLØG | 120 g |
| LØG | 120 g |
| HVIDLØG | 5 g (= 1 fed) |
| TORTILLAS | 46 g (= 1 tortilla) |

**Stk-varer i databasen** (ingen vægtlogik nødvendig — sælges pr. stk):
AGURK, AVOCADO, LIME, CITRON, ANANAS, og andre frugt/grønt-varer.

---

## 5. Prisberegningslogik

### Algoritme: billigste total — ikke billigste per gram
For hver ingrediens beregnes `ceil(behov / pakkestørrelse) × pris` for ALLE produkter i valgte kæder.
Det produkt med **laveste total** vælges — ikke det med laveste kilopris.

**Eksempel — 250g kylling:**
- 450g pakke @ 25 kr → 1 pakke = **25 kr** ← vælges
- 1000g pakke @ 45 kr → 1 pakke = 45 kr
- 200g pakke @ 14 kr → 2 pakker = 28 kr

`kilopris`-mode vælger stadig billigste per gram (bruges som alternativ prislogik).

### Afrunding: KUN ved indkøb
Råmængder holdes som decimaltal hele vejen.
Afrunding til hele pakker sker **én gang** på det aggregerede niveau (shopping list).

- Daily: summer råmængder for én ret → rund op → pakker
- Planner: summer råmængder på tværs af hele ugen → rund op → pakker

**Eksempel:** 0.5 peberfrugt mandag + 0.5 peberfrugt onsdag = 1 stk købt (ikke 2×1).

### Visning: opskrift vs. indkøbsliste
To separate visninger af samme data:

**Opskrift** — vis råmængden som brøk:
- `formatStk(0.25)` → "¼"
- `formatStk(0.5)` → "½"
- `formatStk(1.25)` → "1¼"
- `formatStk(2.0)` → "2"

**Indkøbsliste** — vis hele pakker der skal købes:
- 0.25 stk behov → køb 1 stk
- 1.25 stk behov → køb 2 stk

Funktionerne `formatStk()` og `formatShoppingAmount()` findes i `pricing.ts`.

### Løse varer
Visse varer sælges løse (vejes af i butikken) og må aldrig vises som "X pakker".
I stedet vises den samlede vægt + "(løse)".

**Regel for TOMATER:** Hvis pakke-størrelsen er under 150g og enheden er g → løs.
- 120g produkt: vis "240g (løse)" (ikke "2×120g")
- 720g total: vis "720g (løse)" uanset antal interne "pakker"
- 500g produkt: vis "500g" som normal pakke (≥ 150g = ikke løs)

Implementeret i `erLøs()` i `pricing.ts`. Tilføj nye løse kategorier der.

### Kokosmælk — hele dåser
Kokosmælk (400ml pr. dåse) må kun sættes til hele dåser for basispersonantallet (4 pers.):

| Niveau | ml/person | 4 pers. total | Dåser |
|---|---|---|---|
| Let | 100ml | 400ml | 1 dåse |
| Rig/cremet | 200ml | 800ml | 2 dåser |

Aldrig mellemværdier som 125ml/pers. (= 1,25 dåser for 4 pers.) — det giver unødigt spild.

### Butikkonsolidering — tie-breaker
Når to eller flere butikker har **samme laveste pris** for en ingrediens, vælges den butik der allerede er valgt til flest andre ingredienser i den samme indkøbsliste.

**Formål:** Minimere antal butikker brugeren skal besøge.

**Algoritme:**
1. Find alle produkter med laveste total-pris for ingrediensen
2. Tæl hvor mange gange hver butik allerede er valgt i den hidtil sammensatte liste
3. Vælg butikken med højest antal — ved fortsat uafgjort vælges alfabetisk

### Pakkeberegning
```
pakker = ceil(maengdeBehoevet / produktPakkestørrelse)
pris = pakker × normalPris
```

### Tilbuds-overlay (`src/data/tilbud.json`)
Ugens aktive tilbud ligger i en separat overlay-fil — **rører aldrig** `products.json`.
Hentes/kobles ind af `useProducts()` i `src/lib/products.ts`.

```json
[
  { "butik": "REMA 1000", "kategori": "KOTELETTER", "produktnavn": "nakke koteletter",
    "tilbudsPris": 29, "maengde": 300, "maengdeEnhed": "g", "vegetar": false, "maerke": "rema1000" }
]
```

- **Tilbud matches på KATEGORI, ikke på produktnavn.** Hvert tilbud tilføjes som en
  *kandidat-vare* i sin kategori (`paTilbud: true`, `normalPris = tilbudsPris`). Tilbudsvaren
  behøver altså IKKE matche en eksisterende vare — den kan være en ny variant.
- `findBestOption()` vælger billigste total i kategorien, så tilbudsvaren vinder hvis den er
  billigere end de normale varer, og "Spar X kr" udregnes mod billigste ikke-tilbudsvare.
- `butik` skal være præcis `"REMA 1000"`, `"NETTO"` eller `"FØTEX"`. `kategori` skal matche en
  kategori i `products.json` (UPPERCASE). `maengde` + `maengdeEnhed` er nødvendige for total-
  prisberegningen (`ceil(behov / maengde) × tilbudsPris`).
- Tom liste (`[]`) = ingen aktive tilbud — det er udgangspunktet, brug aldrig fiktive testdata her.
- **Permanent nedsatte varer hører IKKE hjemme her.** Er `tilbudspris = normalpris` i avisen, er
  det en permanent ny normalpris → hører i produktdatabasen (Excel → `products.json`), ikke som
  ugentligt tilbud. Kun `tilbudspris < normalpris` lægges i `tilbud.json`.
- **Opdateres manuelt hver uge** lige nu (tjek tilbudsaviser/apps for REMA 1000, NETTO, FØTEX,
  og indtast). Kan genereres fra tilbuds-Excel i `Opdateret produktdatabase/Tilbud/`. Skal på
  sigt udskiftes med automatisk scraping — overlay-formatet er allerede designet til at kunne
  skiftes ud uden at røre prisberegningslogikken.
- Findes ingen aktiv tilbudsside i appen — tilbud regnes automatisk ind i alle priser
  (opskrifter, Planner, indkøbslister) via `findBestOption()` i `pricing.ts`, og vises som
  "Spar X kr"-badges hvor relevant.

---

## 6. Salat-placeholders (implementeret)

Salat-placeholders resolves ved runtime i `pricing.ts` — en ret kan bede om "en salat der
passer til svin", og systemet vælger den billigste passende salat i de valgte kæder.

```ts
// Salat-typer der resolves ved runtime (types.ts)
type SalatType = "salat_fisk" | "salat_okse" | "salat_svin" | "salat_kylling"

// Bruges i ingredienser-array i stedet for RecipeIngredientDef
interface RecipePlaceholder {
  placeholder: SalatType | "blandede grøntsager"
  kandidater?: string[]  // valgfrit: begræns til bestemte salat-id'er
  antal?: number         // antal kategorier at vælge (default: 2)
}
```

- Salaterne ligger i `src/data/salater.json` (`Salat[]`). Hver salat har et `passer_til`-array
  (`"fisk" | "okse" | "svin" | "kylling"`) og en egen ingrediensliste.
- `resolveSalatPlaceholder()` i `pricing.ts` filtrerer salater på `passer_til`, prisberegner hver
  kandidat med `priceSalatIngredients()`, og vælger den **billigste samlede** salat.
- Angiver placeholderen `kandidater` (salat-id'er), begrænses valget til dem — ellers overvejes
  alle salater der passer til proteinet.
- I `recipes.json` skrives placeholderen direkte i `ingredienser`-arrayet, fx
  `{ "placeholder": "salat_svin" }`, i stedet for en almindelig `{ "canonical": ... }`-post.

> `"blandede grøntsager"`-placeholderen er defineret i typerne, men resolves endnu ikke i
> `pricing.ts` — kun salat-typerne er aktive i dag.

---

## 7. Opskrift-tjekliste

Inden du gemmer en ny opskrift i `recipes.json`:

1. **Tjek canonical:** Findes kategorien i `products.json`? (kør grep på filen)
2. **Mængder er per person:** Divider altid den samlede mængde med `personer`
3. **Brug stk for stk-varer:** Avocado, lime, agurk osv. = stk, ikke gram
4. **Brug g for grønt der vejes:** Gulerødder, løg, spinat osv. = gram (vægtlogik håndterer visning)
5. **dl → ml:** Konverter inden du gemmer
6. **minTotal:** Overvej om der er en mindstegrænse (hvidløg, smørmængder osv.)
7. **basisvarer:** Salt, peber, krydderier, olie, smør — aldrig i `ingredienser`

---

## 8. Filer og placering

| Fil | Formål |
|-----|--------|
| `src/data/products.json` | Produktdatabase (auto-genereret) |
| `src/data/recipes.json` | Opskriftsdatabase |
| `src/data/vaegt-logik.json` | Stk-vægte til frontend-visning |
| `src/data/tilbud.json` | Ugens aktive tilbud (manuel overlay) |
| `src/lib/types.ts` | TypeScript-typer for alt data |
| `src/lib/pricing.ts` | Prisberegningslogik |
| `src/lib/weekly.ts` | Ugeplanlægningslogik |
| `scripts/convert-excel.py` | Import af Excel → products.json |
| `Opdateret produktdatabase/` | Kilde-Excel-filer (i projektets rod) |
