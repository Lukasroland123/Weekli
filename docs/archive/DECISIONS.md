## Formål

Dette dokument samler centrale beslutninger og åbne spørgsmål for MVP’en, så udviklere kan bygge backend og frontend uden at gætte – og så vi kan ændre enkelte valg senere uden at omskrive hele systemet.

---

## Fastlagte beslutninger (MVP)

### Domæne & scope

- **Geografi**: Fokus er Aarhus (by-niveau), ikke nødvendigvis specifikke butikker.
- **Brugsscenarie**: En anonym bruger der vil finde ugens billigste retter baseret på aktuelle tilbud.
- **Sprog**: UI er kun på dansk i v1.

### Frontend (MVP-funktionalitet)

- **Forside**:
  - Viser en liste over "ugens billigste retter", sorteret efter pris pr. person.
  - Hver ret viser titel, kort beskrivelse, pris pr. person (standard ekskl. basisvarer), tilhørende butik/kædekombination og relevante tags.
- **Filtre**:
  - Filtrering på butik/kæde (flere kan vælges).
  - Filtrering på antal personer (skalere opskriften lineært).
  - Filtrering på tags (flere kan vælges).
  - Toggle "inkludér basisvarer" styrer prisberegningen og visningen.
- **Opskrift-detalje**:
  - Viser ingrediensliste med mængder, enheder og markering af:
    - Om ingrediensen er på tilbud.
    - Om ingrediensen er en basisvare.
  - Viser et pris-breakdown med klar opdeling af:
    - Pris uden basisvarer.
    - Evt. basisvare-del (når togglen er slået til).
    - Totalpris.

### Prislogik (grundprincipper)

- Standardvisning er **uden basisvarer**.
- Basisvarer er markeret på ingrediensniveau med et boolean-felt (`is_pantry`).
- Pris for en opskrift beregnes ved at:
  - Matche hver ikke-basis-ingredienst til et eller flere relevante tilbud.
  - Vælge det (kombinerede) tilbud der giver laveste pris pr. opskrift.
  - Skalere mængder lineært med antal personer.
- Pris for basisvarer kan i v1 beregnes som:
  - Enten et simpelt, hårdkodet estimat i kode.
  - Eller ved at behandle dem som almindelige ingredienser (beslutning står åben, se nedenfor).

### Datamodel (struktur)

- Vi bruger en klassisk relationel model med:
  - `recipes` (opskrifter)
  - `ingredients` (ingredienser, inkl. `is_pantry` og `normalized_name`)
  - `stores` (butikker/kæder)
  - `offers` (tilbud/produktlinjer, med `normalized_name`, periode og pris)
  - `recipe_ingredients` (join-tabel med mængde + enhed)
  - `tags` og `recipe_tags` (join-tabel til opskrift-tags)
- Tags implementeres som **egen tabel + join-tabel**, ikke som arrayfelt, så vi kan:
  - Håndtere metadata pr. tag.
  - Søge effektivt og udvide til flere sprog senere.

### Teknologi (overordnet)

- **Backend**: Python + FastAPI.
- **Database**: PostgreSQL.
- **Frontend**: Next.js.
- **Tilbuds-kilder**: Salling API + eTilbudsavis + evt. andre scrapers på sigt.

---

## Åbne spørgsmål (Open Questions)

Disse punkter er bevidst **ikke** besluttet endnu og skal ikke håndimplementeres med gæt. De bør stå synligt, så vi kan træffe valg senere.

### 1. Pakker vs. forbrug

- Spørgsmål:
  - Skal brugeren "betale" for hele pakken (fx 500 g pasta) eller kun for den del, der bruges (fx 200 g)?
- Mulige modeller:
  - **Hele pakken**:
    - Simpelt: pris = tilbudspris for pakken.
    - Ulempe: overestimerer pris, men passer måske bedre til virkeligt indkøbsmønster.
  - **Proportionalt forbrug**:
    - Pris = tilbudspris * (forbrug / pakningsstørrelse).
    - Kræver robust enhedshåndtering (g, kg, stk, ml, osv.).
  - **Hybrid**:
    - Hele pakken for billige/typiske basisvarer, proportionalt for dyre ingredienser.
- **Status**: Ikke besluttet. Backend bør designes, så begge strategier kan understøttes bag et konfigurerbart "pricing strategy"-lag.

### 2. Endelig definition af basisvarer

- Spørgsmål:
  - Hvilke konkrete varer skal tælles som basisvarer udover klassiske krydderier?
- Kandidater:
  - Olie, smør, mel, sukker, eddike, bouillon, bagepulver, ris, pasta m.fl.
- Overvejelser:
  - Skal listen være:
    - Fast kodet i første omgang?
    - Lagring i database-tabel (fx `pantry_items`) for nem opdatering?
  - Skal basisvare-listen på sigt kunne personaliseres pr. bruger/husholdning?
- **Status**: Ikke besluttet. I v1 kan vi starte med en enkel, statisk liste, men den bør samles ét sted (kode eller konfiguration), så den er nem at ændre.

### 3. Geografiniveau og butikshåndtering

- Spørgsmål:
  - Arbejder vi på kæde-niveau (Netto generelt) eller butik-niveau (Netto, Thorvaldsensgade)?
  - Hvordan håndterer vi kæder uden offentlige API’er – ignoreres de, eller forsøger vi scraping?
- Mulige retninger:
  - **Kæde-niveau (MVP)**:
    - Simpel model for brugeren: "billigst i Netto".
    - Matcher godt med Salling API’s struktur.
  - **Butik-niveau (senere)**:
    - Kræver geolokation og lagerstatus pr. butik.
    - Giver mere præcis, men også mere kompleks oplevelse.
- **Status**: MVP antager kæde-niveau. Butik-niveau noteres som potentiel udvidelse.

### 4. Matching-strategi og kvalitet

- Spørgsmål:
  - Hvor aggressiv skal ingrediens-tilbud matching være?
  - Hvad gør vi, når der er mange mulige matches, eller ingen gode matches?
- Overvejelser:
  - Skal der være en minimum-score, før et tilbud bruges?
  - Skal der kunne laves manuelle overrides (låse et bestemt tilbud til en given ingrediens)?
  - Skal vi cache matches i en tabel (`ingredient_offer_links`) eller altid beregne on-the-fly?
- **Status**: Ikke endeligt besluttet, men datamodel er forberedt til at gemme links og scores.

### 5. Håndtering af rester og flerretsscenarier

- Spørgsmål:
  - Skal systemet på sigt hjælpe med at "bruge rester" på tværs af retter (fx hvis man køber 1 kg ris men kun bruger 300 g i første ret)?
- Overvejelser:
  - Det kræver et andet prisbillede end "pris pr. ret" – nærmere "pris for en plan med X retter".
  - Kan være en v2+ feature.
- **Status**: Ude af scope for MVP, men bør huskes som design-parameter (ikke binde os unødigt).

---

## Hvordan dokumenterne bruges sammen

- **SPEC.md** beskriver:
  - Hvad brugeren kan i v1 (UI og flow).
  - Prisregler set fra brugerens perspektiv.
  - Tags/kategorier og open questions.
- **DATA_MODEL.md** beskriver:
  - Konkrete tabeller, felter og relationer.
  - Hvordan vi understøtter tags, basisvarer og matching i databasen.
- **DECISIONS.md** (dette dokument) beskriver:
  - Hvilke valg der er taget.
  - Hvilke der **med vilje** er udskudt.

Målet er, at en udvikler kan:
- Læse `SPEC.md` + `DATA_MODEL.md` for at bygge backend og frontend uden at mangle centrale regler.
- Slå op i `DECISIONS.md`, når noget er uklart, for at se om det er:
  - Allerede besluttet.
  - Bevidst åbent og kræver et produkt/forretnings-valg, før det implementeres.

