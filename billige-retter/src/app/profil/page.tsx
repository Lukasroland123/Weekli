"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { useShopping } from "@/context/ShoppingContext";
import { supabase } from "@/lib/supabase";
import { formatPrice } from "@/lib/pricing";

const CHAINS = ["REMA 1000", "FØTEX", "NETTO"];

export default function ProfilPage() {
  const router = useRouter();
  const { state, setPersons, setSelectedChains, setPrisLogik } = useApp();
  const { items } = useShopping();
  const [email, setEmail] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const guest = localStorage.getItem("weekli_guest") === "true";
      setIsGuest(guest);
      if (!guest) {
        const { data } = await supabase.auth.getUser();
        setEmail(data.user?.email ?? null);
      }
    }
    loadUser();
  }, []);

  async function handleSignOut() {
    if (isGuest) {
      localStorage.removeItem("weekli_guest");
    } else {
      await supabase.auth.signOut();
    }
    router.replace("/login");
  }

  function toggleChain(chain: string) {
    const current = state.selectedChains;
    const next = current.includes(chain)
      ? current.filter((c) => c !== chain)
      : [...current, chain];
    setSelectedChains(next);
  }

  const totalIndkoeb = items.reduce((sum, i) => sum + i.pris, 0);

  return (
    <div className="px-4 py-4 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Profil</h1>

      {/* Konto */}
      <section className="bg-white border border-gray-100 rounded-2xl p-4">
        <h2 className="font-semibold text-gray-800 mb-3">Konto</h2>
        <div className="flex items-center justify-between">
          <div>
            {isGuest ? (
              <>
                <p className="font-medium text-gray-900">Gæst</p>
                <p className="text-sm text-gray-400">Ikke logget ind</p>
              </>
            ) : (
              <>
                <p className="font-medium text-gray-900">{email ?? "Ukendt"}</p>
                <p className="text-sm text-gray-400">Logget ind</p>
              </>
            )}
          </div>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-xl"
          >
            Log ud
          </button>
        </div>
      </section>

      {/* Antal personer */}
      <section className="bg-white border border-gray-100 rounded-2xl p-4">
        <h2 className="font-semibold text-gray-800 mb-3">Antal personer</h2>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              onClick={() => setPersons(n)}
              className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${
                state.persons === n ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </section>

      {/* Kæder */}
      <section className="bg-white border border-gray-100 rounded-2xl p-4">
        <h2 className="font-semibold text-gray-800 mb-1">Kæder</h2>
        <p className="text-xs text-gray-400 mb-3">Ingen valgt = alle kæder aktive</p>
        <div className="flex flex-col gap-2">
          {CHAINS.map((chain) => {
            const isOn = state.selectedChains.includes(chain);
            return (
              <button
                key={chain}
                onClick={() => toggleChain(chain)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium border transition-colors ${
                  isOn ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-700 border-gray-100"
                }`}
              >
                <span>{chain}</span>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  isOn ? "bg-green-600 border-green-600" : "border-gray-300"
                }`}>
                  {isOn && (
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Prislogik */}
      <section className="bg-white border border-gray-100 rounded-2xl p-4">
        <h2 className="font-semibold text-gray-800 mb-3">Prislogik</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setPrisLogik("pris")}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${
              state.prisLogik === "pris" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            Pris
          </button>
          <button
            onClick={() => setPrisLogik("kilopris")}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${
              state.prisLogik === "kilopris" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            Kilopris
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {state.prisLogik === "pris"
            ? "Vælger den billigste upfront-pris pr. ret."
            : "Vælger den bedste pris pr. kg/enhed."}
        </p>
      </section>

      {/* Indkøbsliste oversigt */}
      <section className="bg-white border border-gray-100 rounded-2xl p-4">
        <h2 className="font-semibold text-gray-800 mb-3">Indkøbsliste</h2>
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">Varer i listen</p>
          <p className="font-semibold text-gray-900">{items.length} stk</p>
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-sm text-gray-600">Samlet beløb</p>
          <p className="font-semibold text-green-600">{formatPrice(totalIndkoeb)}</p>
        </div>
      </section>
    </div>
  );
}
