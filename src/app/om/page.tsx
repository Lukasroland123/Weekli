import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Om Weekli",
  description:
    "Om Weekli — hvordan priser beregnes, hvordan dine data håndteres, og hvordan du kontakter os.",
  alternates: { canonical: "/om" },
};

export default function OmPage() {
  return (
    <div className="px-5 py-6 max-w-prose">
      <div className="mb-6">
        <Link href="/" className="flex items-center gap-1 text-green-600 text-sm font-medium">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Tilbage
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-4">Om Weekli</h1>

      <p className="text-sm text-gray-600 leading-relaxed mb-6">
        Weekli hjælper dig med at finde billige aftensmadsretter og lave en ugentlig madplan
        med indkøbsliste, baseret på priser i REMA 1000, Netto og Føtex.
      </p>

      <section className="mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-2">Priser er vejledende</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          Priserne i Weekli er vejledende og opdateres løbende. Butikkerne kan ændre priser og
          tilbud fra dag til dag, så den faktiske pris i butikken kan afvige. Brug priserne som
          en rettesnor til at finde de billigste retter — ikke som en garanti.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-2">Dine data & privatliv</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          Weekli kræver ingen login eller konto. Dine valg — gemte retter, madplaner og
          præferencer — gemmes udelukkende lokalt i din browser og sendes ikke til os. Rydder du
          din browserdata, forsvinder de igen.
        </p>
        <p className="text-sm text-gray-600 leading-relaxed mt-2">
          Hvis du selv indsender en opskrift via appen, sendes den til Weekli som en e-mail, så
          vi kan se og eventuelt tilføje den. Ud over det indsamler vi ikke personlige
          oplysninger.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-2">Kontakt</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          Spørgsmål, fejl eller forslag? Skriv til{" "}
          <a href="mailto:opskrifter@getweekli.com" className="text-green-600 font-medium">
            opskrifter@getweekli.com
          </a>
          .
        </p>
      </section>

      <p className="text-xs text-gray-400">© {new Date().getFullYear()} Weekli</p>
    </div>
  );
}
