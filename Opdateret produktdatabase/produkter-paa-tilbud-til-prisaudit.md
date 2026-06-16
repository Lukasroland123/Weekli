# Produkter der skal have standardpris fundet (prisaudit før launch)

Disse 24 produkter havde `paTilbud: true` i `products.json`, fordi de var på tilbud
i den uge prisen blev noteret i Excel. De er nulstillet til `paTilbud: false` i koden
(2026-06-16), men prisen i `products.json` er stadig den **tilbudspris** der blev noteret —
ikke en bekræftet standardpris.

Når den fulde prisaudit laves, skal disse 24 varer have deres rigtige standardpris
fundet og indtastet i Excel-filen (kolonnen "På tilbud" sættes til false/tom for dem,
og "Normal pris" opdateres til den faktiske standardpris). Kør derefter
`weekli/scripts/convert-excel.py` igen for at regenerere `products.json`.

| Butik | Kategori | Produktnavn | Noteret pris (var tilbud) | Mængde |
|---|---|---|---|---|
| FØTEX | REJER | rejer i lage | 75 kr | 600 g |
| FØTEX | FETA OST | salatost i blok 17% fedt | 16 kr | 200 g |
| FØTEX | FETA OST | salatost i blok 17% fedt | 32 kr | 500 g |
| FØTEX | HYTTEOST | hytteost neutral 1,5% fedt | 20 kr | 450 g |
| FØTEX | FLØDEALTERNATIV | ama madlavning 4% fedt | 8 kr | 330 ml |
| FØTEX | GRÆSK YOGHURT | græsk yoghurt 10% fedt | 25 kr | 1000 g |
| FØTEX | GRÆSK YOGHURT | græsk yoghurt 10% fedt laktosefri | 17.95 kr | 400 g |
| FØTEX | PARMA/SERRANOSKINE | serranoskinke | 14 kr | 75 g |
| FØTEX | PEPPERONI | pepperoni i skiver | 10 kr | 150 g |
| NETTO | ÆBLER | æbler løse | 2.5 kr | 1 stk |
| NETTO | KYLLINGEFILET | kyllingebrystfilet | 34.95 kr | 450 g |
| NETTO | KYLLINGELÅR | kyllingeunderlår | 15 kr | 300 g |
| NETTO | KYLLINGELÅR | kyllingeoverlår m. rygben | 15 kr | 400 g |
| NETTO | HAKKET GRISEKØD | hakket grisekød 8-12% | 24.95 kr | 500 g |
| NETTO | FLÆSK | flæsk | 69.96 kr | 700 g |
| NETTO | KOTELETTER | danske nakkekoteletter | 29.95 kr | 400 g |
| NETTO | BACON SKIVER | bacon i skiver | 12 kr | 100 g |
| NETTO | MEDISTER | medister | 10 kr | 400 g |
| NETTO | LAKSEFILET | lakseside | 85 kr | 600 g |
| NETTO | PARMESANOST | revet grana padano 28% fedt | 25 kr | 150 g |
| NETTO | GRÆSK YOGHURT | græsk yoghurt 10% fedt | 29 kr | 1000 g |
| NETTO | TÆRTEDEJ | tærtedej | 14.01 kr | 275 g |
| NETTO | FISKEFILET | panerede fiskefileter | 29.56 kr | 400 g |
| REMA 1000 | FROSNE BØNNER | haricots verts | 10 kr | 600 g |

**Status:** Afventer prisaudit. Ingen af disse er bekræftet som standardpris endnu.
