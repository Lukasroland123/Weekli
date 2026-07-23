## Overblik

Datamodellen er relationel (PostgreSQL) og skal være konkret nok til at kunne laves som migrations. Nedenfor er felter, typer og relationer for kerne-entiteterne.

Alle eksempler bruger PostgreSQL-typer; præcise længder kan justeres i implementationen.

---

## Tabel: `stores` (supermarkeder)

- `id` (PK, `uuid` eller `serial`)
- `name` (`varchar(100)`) – fx "Netto", "Rema 1000"
- `chain` (`varchar(100)`, nullable) – kan bruges hvis vi senere vil skelne mellem butik og kæde
- `city` (`varchar(100)`, nullable) – fx "Aarhus"
- `address` (`varchar(255)`, nullable)
- `external_id` (`varchar(100)`, nullable) – ID fra Salling API / eTilbudsavis
- `created_at` (`timestamptz`)
- `updated_at` (`timestamptz`)

**Relationer**
- Én `store` har mange `offers`.

---

## Tabel: `recipes`

- `id` (PK, `uuid` eller `serial`)
- `title` (`varchar(200)`)
- `slug` (`varchar(200)`, unik) – URL-venlig identifikator
- `description` (`text`, nullable)
- `servings` (`integer`) – standard antal personer (fx 4)
- `estimated_time_minutes` (`integer`, nullable)
- `instructions` (`text`, nullable) – kan være meget simpel i MVP
- `created_at` (`timestamptz`)
- `updated_at` (`timestamptz`)

**Relationer**
- Én `recipe` har mange `recipe_ingredients`.
- Én `recipe` har mange `recipe_tags` (hvis vi bruger join-tabel til tags).

---

## Tabel: `ingredients`

- `id` (PK, `uuid` eller `serial`)
- `name` (`varchar(200)`) – visningsnavn, fx "Hakket oksekød 8–12 %"
- `normalized_name` (`varchar(200)`) – normaliseret navn til matching, fx "oksehak"
- `category` (`varchar(100)`, nullable) – fx "kød", "grøntsag"
- `is_pantry` (`boolean` default `false`) – markerer basisvarer
- `unit_default` (`varchar(50)`, nullable) – typisk enhed (fx "g", "ml", "stk")
- `created_at` (`timestamptz`)
- `updated_at` (`timestamptz`)

**Relationer**
- Én `ingredient` kan indgå i mange `recipe_ingredients`.
- Én `ingredient` kan matches til mange `offers` via matchingfelter.

---

## Tabel: `offers` (tilbud/produktlinje)

- `id` (PK, `uuid` eller `serial`)
- `store_id` (FK → `stores.id`)
- `title` (`varchar(255)`) – fx "Hakket oksekød 8–12 % 500 g"
- `normalized_name` (`varchar(200)`) – bruges til matching mod `ingredients.normalized_name`
- `price` (`numeric(10,2)`) – pris for pakken/tilbuds-enheden
- `unit_size` (`numeric(10,3)`, nullable) – fx 0.5 (kg), 1.0 (stk), 0.75 (kg)
- `unit_type` (`varchar(50)`, nullable) – fx "kg", "stk", "l"
- `valid_from` (`date`)
- `valid_to` (`date`)
- `external_id` (`varchar(100)`, nullable) – ID fra kilde (Salling/eTilbudsavis)
- `raw_data` (`jsonb`, nullable) – originalt payload fra API/scraper til debugging
- `created_at` (`timestamptz`)
- `updated_at` (`timestamptz`)

**Relationer**
- Mange `offers` tilhører én `store`.
- Matching til `ingredients` sker via normaliserede felter, ikke nødvendigvis hårde FK’er.

---

## Tabel: `recipe_ingredients` (join mellem opskrift og ingrediens)

- `id` (PK, `uuid` eller `serial`)
- `recipe_id` (FK → `recipes.id`)
- `ingredient_id` (FK → `ingredients.id`)
- `amount` (`numeric(10,3)`) – mængde, skalerbar pr. person (fx 0.25, 1.0, 200)
- `unit` (`varchar(50)`) – enhed, fx "kg", "g", "stk", "dl"
- `notes` (`varchar(255)`, nullable) – fx "finthakket" (ren tekst, påvirker ikke pris)

**Relationer**
- Mange til én mod `recipes`.
- Mange til én mod `ingredients`.

---

## Tags på opskrifter

Vi anbefaler en separat tabel + join-tabel (frem for array), så tags kan genbruges, valideres og oversættes senere.

### Tabel: `tags`

- `id` (PK, `uuid` eller `serial`)
- `slug` (`varchar(100)`, unik) – fx "vegetar", "hurtig"
- `label` (`varchar(100)`) – visningsnavn
- `description` (`text`, nullable)

### Tabel: `recipe_tags` (join)

- `recipe_id` (FK → `recipes.id`, del af PK)
- `tag_id` (FK → `tags.id`, del af PK)

**Begrundelse for join-tabel frem for array**
- Sikrer konsistent sæt af tags.
- Gør det nemt at lave lokalisering og metadata på tags.
- Understøtter effektiv filtrering (JOIN/INDEX) på tværs af mange opskrifter.

---

## Felter til matching mellem ingredienser og tilbud

Matching er centralt for prisberegningen og bør understøttes direkte i modellen.

### Normaliserede navne

- `ingredients.normalized_name`
  - Genereres ved at normalisere rå ingrediensnavne (fx lowercase, fjern specialtegn, mappes til kanoniske strenge).
- `offers.normalized_name`
  - Tilsvarende normaliseret repræsentation af produktnavnet fra tilbud.

### Mulig hjælpe-tabel: `ingredient_offer_links`

Selve matching-algoritmen kan køre on-the-fly, men det kan være nyttigt at cache stærke matches.

- `id` (PK)
- `ingredient_id` (FK → `ingredients.id`)
- `offer_id` (FK → `offers.id`)
- `score` (`numeric(4,3)`) – matching-score (0–1) fra fx fuzzy matching
- `created_at` (`timestamptz`)

Denne tabel er valgfri i første migration, men anbefales for performance og mulighed for manuelt override senere.

---

## Andre overvejelser (v1 Scope)

- Vi antager én global valuta (DKK).
- Vi antager at pris pr. opskrift beregnes ud fra:
  - Sum af ingredienspriser (baseret på bedste matchende `offers` pr. ingrediens).
  - For basisvarer (`is_pantry = true`) kan vi i første omgang sætte en fast skønnet pris pr. enhed i kode/konfiguration, uden ekstra tabeller.
- Eventuelle brugerprofiler, favoritlister osv. er uden for v1 og er derfor ikke modelleret her.

