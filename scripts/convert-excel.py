"""
Konverterer de tre produktdatabase-Excel-filer til products.json.
Kør fra projektets rod: python scripts/convert-excel.py

Kilde:  Opdateret produktdatabase/ (i projektets rod)
Output: src/data/products.json
"""

import json
import openpyxl
from pathlib import Path

EXCEL_DIR = Path(__file__).parent.parent / "Opdateret produktdatabase"
OUTPUT = Path(__file__).parent.parent / "src" / "data" / "products.json"

FILES = [
    EXCEL_DIR / "Føtex produkt database(1).xlsx",
    EXCEL_DIR / "Netto produkt database(1).xlsx",
    EXCEL_DIR / "Rema1000 produkt database(1).xlsx",
]

# Kolonnenavne i Excel (i rækkefølge)
# Butik | Kategori | Produktnavn | Normal pris i kr. | Mængde | Enhed (g/ml/stk)
# | Kilopris/Literpris | Stk pris | Mærke/land | Vegetar | På tilbud

def parse_number(val):
    if val is None:
        return None
    try:
        return float(val)
    except (TypeError, ValueError):
        return None

def parse_bool(val):
    if isinstance(val, bool):
        return val
    if isinstance(val, str):
        return val.strip().lower() in ("true", "ja", "1", "x")
    return bool(val)

products = []

for filepath in FILES:
    wb = openpyxl.load_workbook(filepath, data_only=True)
    ws = wb.active

    for row in ws.iter_rows(min_row=2, values_only=True):
        butik, kategori, produktnavn, normal_pris, maengde, enhed, kilopris, stk_pris, maerke, vegetar, pa_tilbud = row[:11]

        # Skip rækker hvor butik ikke har varen (kun kategori udfyldt)
        if not kategori or not produktnavn:
            continue

        normal_pris_num = parse_number(normal_pris)
        stk_pris_num = parse_number(stk_pris)
        enhed_str = str(enhed).strip().lower() if enhed else ""

        # For stk-varer: stkPris = normalPris når normalPris mangler (1 stk = stkPris)
        if normal_pris_num is None and enhed_str == "stk" and stk_pris_num is not None:
            normal_pris_num = stk_pris_num

        # Skip hvis stadig ingen pris
        if normal_pris_num is None:
            continue

        product = {
            "butik": str(butik).strip() if butik else "",
            "kategori": str(kategori).strip().upper(),
            "produktnavn": str(produktnavn).strip(),
            "normalPris": normal_pris_num,
            "maengde": parse_number(maengde),
            "maengdeEnhed": enhed_str,
            "vegetar": parse_bool(vegetar),
            "paTilbud": parse_bool(pa_tilbud),
        }

        kp = parse_number(kilopris)
        if kp is not None:
            product["kilopris"] = kp

        if stk_pris_num is not None:
            product["stkPris"] = stk_pris_num

        if maerke:
            product["maerke"] = str(maerke).strip()

        products.append(product)

OUTPUT.write_text(json.dumps(products, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Færdig: {len(products)} produkter gemt i {OUTPUT}")

# Vis unikke kategorier
cats = sorted(set(p["kategori"] for p in products))
print(f"\n{len(cats)} unikke kategorier:")
for c in cats:
    print(f"  {c}")
