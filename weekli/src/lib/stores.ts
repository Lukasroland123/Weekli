// Individuelle butikker og radius er fjernet fra modellen.
// Vi arbejder udelukkende på kædeniveau: REMA 1000, FØTEX, NETTO.
export const CHAINS = ["REMA 1000", "FØTEX", "NETTO"] as const;
export type Chain = typeof CHAINS[number];
