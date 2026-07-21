import { NextResponse } from "next/server";

// Modtager (din indbakke via Cloudflare-videresendelse) og afsender.
// Kan overstyres med env-variabler i Vercel uden kodeændring.
const TO_EMAIL = process.env.WEEKLI_RECIPE_TO ?? "opskrifter@getweekli.com";
const FROM_EMAIL = process.env.WEEKLI_RECIPE_FROM ?? "Weekli <opskrifter@getweekli.com>";

interface IncomingIngredient {
  canonical: string;
  maengde: number;
  enhed: string;
}

interface RecipePayload {
  name?: string;
  personer?: number;
  ingredienser?: IncomingIngredient[];
  basisvarer?: string[];
  fremgangsmaade?: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "E-mail er ikke konfigureret på serveren." },
      { status: 503 }
    );
  }

  let payload: RecipePayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig forespørgsel." }, { status: 400 });
  }

  const name = payload.name?.trim();
  const personer = payload.personer;
  const ingredienser = payload.ingredienser ?? [];

  if (!name || !personer || ingredienser.length === 0) {
    return NextResponse.json(
      { error: "Opskrift mangler navn, personantal eller ingredienser." },
      { status: 400 }
    );
  }

  const ingredientLines = ingredienser
    .map((i) => `<li>${escapeHtml(i.canonical.toLowerCase())}: ${i.maengde} ${escapeHtml(i.enhed)}</li>`)
    .join("");

  const basisvarer = (payload.basisvarer ?? []).map((b) => b.trim()).filter(Boolean);
  const basisvarerLines = basisvarer
    .map((b) => `<li>${escapeHtml(b.toLowerCase())}</li>`)
    .join("");

  const fremgang = payload.fremgangsmaade?.trim();

  const html = `
    <h2>Ny brugeropskrift: ${escapeHtml(name)}</h2>
    <p><strong>Antal personer:</strong> ${personer}</p>
    <h3>Ingredienser</h3>
    <ul>${ingredientLines}</ul>
    ${basisvarerLines ? `<h3>Basisvarer &amp; krydderier</h3><ul>${basisvarerLines}</ul>` : ""}
    ${fremgang ? `<h3>Fremgangsmåde</h3><p>${escapeHtml(fremgang).replace(/\n/g, "<br>")}</p>` : ""}
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: TO_EMAIL,
        subject: `Ny brugeropskrift: ${name}`,
        html,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("Resend-fejl:", res.status, detail);
      return NextResponse.json(
        { error: "Kunne ikke sende opskriften. Prøv igen senere." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Send-recipe fejl:", err);
    return NextResponse.json(
      { error: "Kunne ikke sende opskriften. Prøv igen senere." },
      { status: 500 }
    );
  }
}
