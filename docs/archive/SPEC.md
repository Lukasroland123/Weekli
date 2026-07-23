## MVP: Hvad kan brugeren i v1?

- **Forside: Ugens billigste retter**
  - Brugeren lander på en enkel liste over "ugens billigste retter".
  - Hver ret viser:
    - Titel på opskrift.
    - Kort beskrivelse (1–2 linjer).
    - Totalpris pr. person (standard: ekskl. basisvarer).
    - Hvilket supermarked/tilbuds-kombination der ligger til grund (fx "Billigst i Netto + Føtex").
    - Badges for relevante tags (fx "hurtig", "vegetar", "børnevenlig").
  - Listen er som udgangspunkt sorteret efter **laveste pris pr. person**.

- **Filtre**
  - **Butik/kæde**:
    - Brugeren kan filtrere på én eller flere kæder (fx Netto, Bilka, Føtex, Rema 1000, Lidl).
    - Hvis ingen kæde er valgt, vises alle kendte kæder.
  - **Antal personer**:
    - Brugeren kan vælge antal personer (fx 1, 2, 3, 4, 5, 6).
    - Prisberegningen skaleres lineært i forhold til antal personer (vi antager ingen mængderabatter i v1).
  - **Tags/kategorier**:
    - Brugeren kan filtrere på ét eller flere tags (se afsnit om tags).
  - **Toggle "inkludér basisvarer"**:
    - Standard: slået fra (vis pris uden basisvarer).
    - Når togglen slås til, udregnes og vises pris **inkl. basisvarer** (se prisregler).

- **Opskrift-detaljeside**
  - Når brugeren klikker på en ret, ser de:
    - Titel, beskrivelse og tilberedningstid (hvis tilgængelig).
    - Ingrediensliste med mængder og enheder.
    - For hver ingrediens:
      - Markering om den aktuelt er på tilbud (ja/nej) samt i hvilken butik.
      - Markering om ingrediensen er en basisvare (fx olie, salt, peber).
    - Pris-breakdown (se næste afsnit).
  - Det er ikke et krav i v1 at vise fuld tilberedningsvejledning – fokus er på pris og indkøb.

## Prisregler

- **Standardvisning (basisvarer ekskluderet)**
  - Basisvarer/krydderier tæller **ikke** med i den viste pris som standard.
  - Basisvarer defineres som:
    - Typiske ting man "forventer" i et standardkøkken (fx olie, smør, mel, salt, peber, krydderiblandinger, bouillonterninger mv.).
    - Den præcise liste er defineret i data-modellen (felt `is_pantry` eller lignende).

- **Når "inkludér basisvarer" er slået til**
  - Systemet forsøger at beregne en omtrentlig pris også for basisvarer, baseret på normalpris eller skøn.
  - Den samlede pris bliver da: pris for ikke-basisvarer + pris for basisvarer.

- **Pris-breakdown (visning på opskrift-detalje)**
  - Pris-breakdown skal **tydeligt** vise:
    - **Pris uden basisvarer** (obligatorisk).
    - **Basisvarer-del** (vises kun når "inkludér basisvarer" er slået til).
    - **Total** (uden basisvarer som standard; med basisvarer når togglen er slået til).
  - Eksempel på struktur:
    - "Ingredienser på tilbud: 42 kr"
    - "Øvrige ingredienser (ikke basisvarer): 20 kr"
    - "Basisvarer (skønnet): 8 kr" (kun når togglen er slået til)
    - "Total: 62 kr (uden basisvarer: 54 kr)"
  - Beregning for tilbudsvarer tager udgangspunkt i tilbudsprisen, ikke normalprisen.

## Tags / kategorier

- **Formål**
  - Tags bruges både til:
    - Filtrering på forsiden.
    - Hurtig scanning af opskrifter i lister.

- **Tags pr. opskrift**
  - En opskrift kan have **flere tags**.
  - Tags er fritekst-kategorier fra en kontrolleret liste (ikke bruger-genererede i v1).

- **Foreslået simpelt tagsystem**
  - Kategorier kan fx omfatte:
    - Kosttype (vegetar, vegansk, kød, fisk).
    - Tidsforbrug (hurtig, simreret).
    - Målgruppe (børnevenlig, gæstemad).
    - Type (pasta, suppe, gryde, salat, ovnret).

- **Startliste med 20 tags (dansk hverdagsmad)**
  - vegetar
  - vegansk
  - kylling
  - oksekød
  - svinekød
  - fisk
  - pasta
  - suppe
  - gryderet
  - ovnret
  - salat
  - hurtig (≤ 30 min)
  - simreret (≥ 60 min)
  - børnevenlig
  - billig
  - proteinrig
  - one-pot
  - meal prep
  - komfortmad
  - hverdagsmad

## Open Questions (bevidst ubesvarede beslutninger)

- **Pakker vs. forbrug**
  - Skal brugeren "betale" for hele pakken (fx 500 g pasta) eller kun for det estimerede forbrug (fx 200 g brugt i retten)?
  - Mulige løsninger:
    - a) Altid hele pakken (enklest at implementere, men kan overestimere pris).
    - b) Proportionalt forbrug baseret på mængde (mere retvisende, men kræver bedre enhedshåndtering).
    - c) Hybrid: hele pakken for meget billige basisvarer, proportionalt for dyrere varer.
  - **Status**: ikke besluttet i MVP – skal afklares før vi låser prislogikken endeligt.

- **Definition af basisvarer**
  - Udover krydderier (salt, peber, oregano, karry osv.): hvilke ting tæller som basisvarer?
  - Mulige kandidater:
    - Olie, smør, mel, sukker, eddike, bouillon, bagepulver, ris, pasta.
  - Spørgsmål:
    - Hvor "generøs" skal vi være for at matche virkeligt hverdagskøkken?
    - Skal basisvare-listen være global, eller per husholdning/profil på sigt?
  - **Status**: ikke besluttet – vi skal definere en første liste centralt i data-modellen.

- **Geografi og kædedækning**
  - I v1 er fokus Aarhus, men:
    - Skal vi filtrere på konkrete butikker (fx "Netto Thorvaldsensgade") eller kun kæder?
    - Hvordan håndterer vi kæder, der ikke har offentlige API’er?
  - **Status**: Ikke låst – MVP antager kæde-niveau og "repræsentative" tilbud for byen.

- **Brugeroplevelse omkring mængderest**
  - Skal brugeren se, hvor meget der er "til overs" af en vare, når kun en del bruges i retten (fx "du har 300 g pasta tilbage")?
  - Det påvirker ikke første MVP-beregning direkte, men kan have betydning for UI og datamodel.
  - **Status**: ude af scope i første iteration, men bør nævnes som mulig v2-funktion.
