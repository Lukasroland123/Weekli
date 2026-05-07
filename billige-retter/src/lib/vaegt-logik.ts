import vaegtLogikJson from "@/data/vaegt-logik.json";

export type VaegtLogikMap = Record<string, { stkVaegt: number; enhed: string }>;

export function useVaegtLogik(): VaegtLogikMap {
  const map: VaegtLogikMap = {};
  for (const entry of vaegtLogikJson as Array<{ kategori: string; stkVaegt: number; enhed: string }>) {
    map[entry.kategori] = { stkVaegt: entry.stkVaegt, enhed: entry.enhed };
  }
  return map;
}
