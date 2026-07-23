# Tilbudsbaseret Opskriftsberegner for Aarhus

## Projektbeskrivelse
Et website der henter ugens tilbudsaviser fra supermarkeder i Aarhus,
sammenholder dem med en opskriftsdatabase, og beregner hvilke retter
der er billigst at lave for borgerne.

---

## Overordnet Arkitektur

```
┌─────────────────────────────────────────────────┐
│                  FRONTEND (Next.js)              │
│  - Ugens billigste retter                        │
│  - Opskriftsoversigt med priser                  │
│  - Filter på supermarked / antal personer        │
└──────────────────┬──────────────────────────────┘
                   │ REST API
┌──────────────────▼──────────────────────────────┐
│                BACKEND (Python/FastAPI)          │
│  - Opskrifts-API                                 │
│  - Prisberegning                                 │
│  - Ingrediens-matching                           │
└──────┬───────────────────────┬───────────────────┘
       │                       │
┌──────▼──────┐      ┌─────────▼──────────┐
│  Database   │      │  Offer Scrapers    │
│ (PostgreSQL)│      │  (kører ugentligt) │
│ - Opskrifter│      │  - Salling API     │
│ - Ingrediens│      │  - eTilbudsavis    │
│ - Tilbud    │      │  - Rema 1000       │
└─────────────┘      └────────────────────┘
```

---

## Mappestruktur

```
tilbudsopskrifter/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── models/
│   │   ├── recipe.py            # Opskrift model
│   │   ├── ingredient.py        # Ingrediens model
│   │   └── offer.py             # Tilbud model
│   ├── scrapers/
│   │   ├── salling.py           # Netto, Bilka, Føtex (gratis API!)
│   │   ├── rema.py              # Rema 1000
│   │   └── etilbudsavis.py      # Aggregeret scraper
│   ├── services/
│   │   ├── price_calculator.py  # Beregn billigste retter
│   │   └── ingredient_matcher.py# Match ingredienser til tilbud
│   ├── data/
│   │   └── recipes.json         # Startdata med opskrifter
│   └── scheduler.py             # Ugentlig opdatering af tilbud
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js App Router
│   │   ├── components/
│   │   │   ├── RecipeCard.tsx
│   │   │   ├── PriceBreakdown.tsx
│   │   │   └── SupermarketFilter.tsx
│   │   └── lib/
│   │       └── api.ts           # API kald til backend
└── docker-compose.yml           # Kør alt med én kommando
```

---

## Fase-plan

### Fase 1 — Backend fundament
- Sæt PostgreSQL database op med tabeller for opskrifter, ingredienser og tilbud
- Lav 10-15 basis opskrifter med ingredienslister og mængder
- Implementer Salling Group API (gratis, officiel API for Netto/Bilka/Føtex)

### Fase 2 — Scrapers & Dataindsamling
- Integrer Salling API (officiel, pålidelig)
- Tilføj eTilbudsavis scraper (dækker Rema 1000, Aldi, Lidl m.fl.)
- Ugentlig cronjob der opdaterer tilbud automatisk

### Fase 3 — Prisberegningsmotor
- Ingrediens-matching: "løg" matcher "løg 1 kg (tilbud 5 kr)"
- Beregn samlet pris per opskrift baseret på aktuelle tilbud
- Ranger opskrifter fra billigste til dyreste

### Fase 4 — Frontend
- Next.js website med liste over ugens billigste retter
- Vis hvilke ingredienser der er på tilbud
- Filter: antal personer, supermarked, kosttype

---

## Teknologivalg

| Komponent | Valg | Hvorfor |
|---|---|---|
| Backend | Python + FastAPI | God til databehandling, hurtig API |
| Database | PostgreSQL | Relationer mellem opskrifter/ingredienser |
| Frontend | Next.js | SEO-venlig, nem at deploye |
| Offers | Salling API + scraping | Salling er gratis og officiel |
| Hosting | Railway / Render | Gratis tier, simpel deploy |

---

## Største tekniske udfordring

**Ingrediens-matching** er det sværeste: at koble "2 fed hvidløg" i en
opskrift til "Hvidløg løs 500g - 12 kr" i et tilbud. Løses med:
1. Normaliseret ingrediensdatabase (kanoniske navne)
2. Fuzzy string matching (rapidfuzz biblioteket)
3. Enhedskonvertering (gram → styk, liter → dl)

---

## Afklarede beslutninger
- [ ] Skal projektet bruge Docker?
- [ ] Kun dansk-sproget frontend?
- [ ] Antal startopskrifter (forslag: 20 klassiske danske retter)

---

## Status
- [x] Plan skrevet
- [ ] Fase 1 startet
