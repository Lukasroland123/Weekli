# MASTER SPEC V2 — Gældende source of truth

> Oprettet: 2026-03-31
> Sidst opdateret: 2026-07-23
> Erstatter: SPEC.md, DATA_MODEL.md, DECISIONS.md (disse er nu arkiv, se `docs/archive/`)

> **Rolle:** Dette dokument beskriver produktvisionen og de låste designbeslutninger (*hvad* og
> *hvorfor*). For konkrete filstier, dataformater og kodekonventioner (*hvordan*), se
> `CONVENTIONS.md`.

---

## 1. Projektets nuværende formål

### Hvad appen gør nu
- Beregner hvad en konkret ret koster, ud fra et kurateret sæt af ~130 udvalgte produkter pr. kæde
- Lader brugeren vælge kæder og se priser på retter beregnet ud fra de valgte kæder
- Giver brugeren valg mellem to prislogikker: billigste upfront-pris ("Pris") eller billigste kilopris ("Kilopris")
- Tilbyder to beregningsscenarier: Daily (én ret ad gangen) og Planner (billigst mulige ugeplan)

### Hvad den ikke længere gør
- Arbejder ikke med hele butikkers sortiment (OCR-pipeline til Netto/Rema/Føtex er arkiveret som datakilde til denne app)
- Bruger ikke radius/geografi — vi arbejder udelukkende på kædeniveau
- Inkluderer ikke basisvarer (salt, peber, olie osv.) i prisberegningen i denne fase
- Bruger ikke Salling API eller eTilbudsavis som primær datakilde

### Den nye kerne
Fundamentet er et manuelt kurateret Excel-datasæt med standardpriser og tilbudspriser.
Opskrifter kobles til produkter via canonical ord (`Kategori`-kolonnen), ikke via konkrete produktnavne eller mærker.

---

## 2. Datamodel — source of truth

> **Altitude-note:** Dette afsnit beskriver den *konceptuelle* datamodel og Excel-arkene, som er
> den redaktionelle kilde ejeren vedligeholder. Den kørende app læser **ikke** Excel direkte — den
> læser `src/data/products.json` (auto-genereret fra arkene via `scripts/convert-excel.py`) og
> tilbudsoverlayet `src/data/tilbud.json`. Excel er altså kilden *bag* generatoren; JSON-filerne er
> det appen faktisk kører på. De konkrete felt- og filformater er dokumenteret i `CONVENTIONS.md`.

### Backbone: Standard-arkene
De primære ark i Excel-filen er:
- `Rema1000 Standard`
- `Standard Føtex`
- `Netto Standard`

Disse ark indeholder de permanente standardpriser og udgør den bærende datastruktur.

### Sekundære lag: Tilbuds-arkene
- `Tilbud Rema1000`
- `Tilbud Netto`
- `Tilbud Føtex`
- `Tilbud` (generisk)

Tilbudsarkene er et **midlertidigt overlay** oven på backbone-datasættet.
- De kan overrule standardpriser i en given uge, hvis et tilbud er aktivt og billigere
- Når tilbuddet udløber, falder systemet automatisk tilbage til standardprisen
- Tilbudsdata er ikke et selvstændigt system — det er koblet til de samme canonical ord som standarddata

### Tilbudsvarighed — LÅST
- Tilbud er ugebaserede
- Et tilbud løber én uge fra det lægges ind
- Når et nyt tilbudsark indlæses, erstatter det det forrige — gamle tilbud fjernes automatisk
- Der er ingen per-produkt `valid_to`-dato — opdatering styres manuelt af ejeren

### Vigtig nuance om `På tilbud = true` i standardarkene
Enkelte produkter i standardarkene har `På tilbud = true`, fordi standardprisen endnu ikke er kendt.
Dette er en **midlertidig datastatus**, ikke en permanent designbeslutning.
Systemet må ikke behandle standardarkene som tilbudsark på baggrund af dette.

### Priskonflikt: standard vs. tilbud — LÅST
Hvis det samme produkt optræder i både et standard-ark og det tilsvarende tilbuds-ark:
- **Tilbudsarket vinder** — tilbudsprisen bruges i beregningen
- Reglen gælder pr. kæde: Tilbud Rema1000 vinder over Rema1000 Standard, Tilbud Føtex vinder over Standard Føtex osv.
- En kædes tilbud påvirker aldrig en anden kædes standardpris

### Canonical mapping via `Kategori`
Opskrifter kobles **altid** til produkter via kolonnen `Kategori` — ikke til konkrete produktnavne eller mærker.

Opskrifter skrives manuelt med canonical ord. Det er ikke et automatisk matching-problem. Eksempel:
- Opskriften kræver kyllingefilet → opskriften indeholder canonical ord `KYLLINGEFILET`
- Systemet finder herefter det relevante konkrete produkt i de valgte kæder under det canonical ord

### Basisvarer i opskrifter
Basisvarer (fx oregano, salt, peber, olie) optræder i ingredienslisten på opskriften, men uden pris.
De er synlige for brugeren, men indgår ikke i prisberegningen.
De har intet canonical ord der matcher databasen — det er bevidst.

---

## 3. Kolonner i standard-arkene — betydning

| Kolonne | Betydning |
|---|---|
| `Butik` | Kædenavn: REMA 1000, FØTEX, NETTO. Kædeniveau, ikke individuel butik |
| `Kategori` | **Canonical ord / fælles nøgle på tværs af kæder.** Fundamentet for mapping |
| `Produktnavn` | Det konkrete produktnavn i den specifikke kæde |
| `Normal pris i kr.` | **Standardprisen — den primære pris til beregning** |
| `Mængde` | Pakningsstørrelse |
| `Kilopris` | Pris pr. kilo, når relevant |
| `Stk pris` | Pris pr. styk, når relevant |
| `Mærke/land` | Mærke eller oprindelsesland |
| `Vegetar` | Boolean: om produktet er vegetarisk |
| `På tilbud` | Metadata/statusfelt — ikke backbone-prisen i modellen |

---

## 4. Prislogik

### To betydninger af "billigst"

**Pris (upfront)**
- Den laveste direkte købspris her og nu
- Fx 32 kr for 300 g

**Kilopris**
- Den bedste pris pr. kilo eller mængdeenhed
- Fx 45 kr for 500 g = 90 kr/kg vs. 32 kr for 300 g = 107 kr/kg

Systemet må **ikke** vælge den laveste pris blindt. Valget afhænger af, hvad opskriften kræver efter skalering til antal personer.

### Brugerens valg
Brugeren vælger aktivt via en knap eller valgboks:
- **Pris** — billigste upfront-pris
- **Kilopris** — billigste pris pr. kilo/mængdeenhed

### Pakkelogik — LÅST
Brugeren betaler **altid for hele pakken**. Aldrig proportionalt forbrug.

- Opskrift kræver 400 g kylling → systemet vælger den pakke (eller kombination af pakker) der dækker 400 g til lavest mulig pris → brugeren betaler for den fulde pakkepris
- Prisen der vises er præcis hvad det koster i butikken

### Skalering til antal personer — LÅST
Skalering er **lineær**: mængdebehov × antal personer = samlet mængdebehov.

- 1 person kræver 200 g kylling → 3 personer kræver 600 g → systemet finder billigste pakke(kombination) til 600 g
- Der bruges ingen sub-lineær kurve eller kunstige rabatter

### Enhedslogik
Prisberegning skal tage højde for, at produkter kan være angivet i gram, kilo, ml, liter eller stk.
Systemet skal bruge den relevante logik afhængigt af om varen er:
- Vægtbaseret (g/kg)
- Volumenbaseret (ml/l)
- Stykbaseret (stk)

Hvis en vare ikke kan beregnes korrekt pga. uklar enhed eller manglende data, skal det markeres som et åbent problem — ikke antages væk.

### Flere pakker / kombinationer
Systemet må gerne:
- Vælge flere pakker af samme produkt, hvis det er den billigste samlede løsning
- Kombinere produkter inden for samme canonical ord
- Fx: opskrift kræver 700 g, der findes 300 g + 500 g pakker → systemet vælger den kombination, hvis det er billigst

---

## 5. Daily vs. Planner

### Daily
- Beregner én ret ad gangen
- Respekterer brugerens valgte prislogik direkte og konsekvent
  - `Pris`: vælg altid billigste upfront-pris — også hvis det giver mere rest/spild
  - `Kilopris`: vælg altid bedste pris pr. kilo/mængdeenhed
- Optimerer **ikke** på tværs af flere retter
- Tænker **ikke** ugekurv
- Er ikke "smart" ud over den valgte prislogik

### Planner
- Laver den billigste ugeplan i samlet upfront-pris for hele ugen
- Tænker på tværs af retter og dage
- Optimerer den samlede kurv for ugen
- Må vælge produkter med bedre kilopris og større mængder, hvis det gør ugeplanen samlet billigere
- Målet er ikke laveste enkeltpris på hvert produkt — målet er laveste samlede ugepris

**Eksempel:** Tre retter i ugen bruger kylling → Planner kan vælge én stor pakke med bedre kilopris frem for tre små pakker, fordi det giver lavest samlet kostpris.

---

## 6. Gældende produktregler

- Vi arbejder med **kæder**, ikke individuelle butikker
- Område og radius er **helt fjernet**
- Basisvarer (salt, peber, olie osv.) indgår **ikke** i prisberegningen i denne fase
- Standardpriser hentes fra `Normal pris i kr.` i standard-arkene
- Tilbud er et midlertidigt overlay — standardarkene er altid den egentlige base

### Kædelogik
- Vælger brugeren flere kæder → systemet kan frit kombinere produkter på tværs af de valgte kæder
- Vælger brugeren kun én kæde → alle produkter i beregningen skal komme fra den kæde

### No-match regel
Hvis et canonical ord fra en opskrift **ikke** findes i de valgte kæder:
- Systemet gætter ikke
- Systemet substituerer ikke
- Retten er ikke gyldig under de valgte filtre — det markeres tydeligt

---

## 7. Opskriftsformat — LÅST

Opskrifter gemmes som **JSON-filer direkte i kodebasen** (versionsstyret med git).

Fordele: Next.js læser dem direkte uden konverteringstrin, ingen ekstern afhængighed, jeg kan læse og skrive dem uden fejl.

### Struktur pr. opskrift

```json
{
  "slug": "kylling-karry",
  "titel": "Kylling i karry",
  "beskrivelse": "Nem hverdagsret med ris",
  "personer": 4,
  "tags": ["kylling", "hurtig"],
  "ingredienser": [
    { "canonical": "KYLLINGEFILET", "maengde": 200, "enhed": "g" },
    { "canonical": "RIS", "maengde": 80, "enhed": "g" },
    { "canonical": "KOKOSMÆLK", "maengde": 200, "enhed": "ml" }
  ],
  "basisvarer": ["karry", "salt", "olie"]
}
```

- `ingredienser` kobles til databasen via `canonical` → `Kategori`-kolonnen
- `maengde` er pr. person (skaleres lineært med antal personer)
- `basisvarer` vises i ingredienslisten på siden uden pris — indgår ikke i beregningen

---

## 8. Åbne spørgsmål

1. **Opdateringsfrekvens for standardark**
   Er Excel-filen kilden i al fremtid, eller skal der på et tidspunkt bygges et admin-interface til at opdatere standardpriser?

---

## 9. Status på gamle dokumenter

Følgende dokumenter er **arkiv** (flyttet til `docs/archive/`) og må ikke bruges som primær reference:

| Dokument | Status |
|---|---|
| `docs/archive/SPEC.md` | Arkiv — beskriver en forældet model med basisvarer-toggle, eTilbudsavis og lineær skalering |
| `docs/archive/DATA_MODEL.md` | Arkiv — beskriver en PostgreSQL-model der ikke længere er gældende |
| `docs/archive/DECISIONS.md` | Arkiv — beslutninger er enten forældede eller overtaget af dette dokument |
| `docs/archive/PLAN.md` | Arkiv |

**Gældende source of truth: dette dokument (`MASTER_SPEC_V2.md`)**
