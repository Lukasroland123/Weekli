"use client";

import { useState, useRef, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { Tag, PrisLogik } from "@/lib/types";

const CHAINS = ["REMA 1000", "FØTEX", "NETTO"];

const TAG_OPTIONS: { value: Tag; label: string }[] = [
  { value: "kylling", label: "Kylling" },
  { value: "kød", label: "Kød" },
  { value: "fisk", label: "Fisk" },
  { value: "vegetar", label: "Vegetar" },
];

type OpenBox = "chains" | "persons" | null;

export default function TopBar() {
  const { state, setPersons, setSelectedChains, setPrisLogik, toggleTagFilter, clearTagFilters, setSearchQuery, setSearchType } = useApp();
  const [openBox, setOpenBox] = useState<OpenBox>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenBox(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggleBox(box: OpenBox) {
    setOpenBox((prev) => (prev === box ? null : box));
  }

  function toggleChain(chain: string) {
    const current = state.selectedChains;
    const next = current.includes(chain)
      ? current.filter((c) => c !== chain)
      : [...current, chain];
    setSelectedChains(next);
  }

  const chainSummary =
    state.selectedChains.length === 0
      ? "Alle kæder"
      : state.selectedChains.join(", ");

  const personsSummary = `${state.persons} ${state.persons === 1 ? "person" : "personer"}`;
  const chainsActive = state.selectedChains.length > 0;
  const personsActive = state.persons !== 2;

  return (
    <div ref={containerRef} className="bg-white border-b border-gray-100 px-4 pt-3 sticky top-12 z-40">
      {/* Search row */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1">
          <input
            type="text"
            value={state.searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={state.searchType === "retter" ? "Søg efter retter..." : "Søg efter varer..."}
            className="w-full bg-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="flex bg-gray-100 rounded-xl overflow-hidden shrink-0">
          <button
            onClick={() => setSearchType("retter")}
            className={`px-3 py-2 text-xs font-medium transition-colors ${
              state.searchType === "retter" ? "bg-green-600 text-white" : "text-gray-500"
            }`}
          >
            Retter
          </button>
          <button
            onClick={() => setSearchType("varer")}
            className={`px-3 py-2 text-xs font-medium transition-colors ${
              state.searchType === "varer" ? "bg-green-600 text-white" : "text-gray-500"
            }`}
          >
            Varer
          </button>
        </div>
      </div>

      {/* Filter boxes */}
      <div className="grid grid-cols-3 gap-2">
        {/* Kæder */}
        <FilterBox
          label="Butik"
          summary={chainSummary}
          isOpen={openBox === "chains"}
          isActive={chainsActive}
          onClick={() => toggleBox("chains")}
        />
        {/* Antal personer */}
        <FilterBox
          label="Antal personer"
          summary={personsSummary}
          isOpen={openBox === "persons"}
          isActive={personsActive}
          onClick={() => toggleBox("persons")}
        />
        {/* Pris / Kilopris */}
        <div className="flex bg-gray-50 border border-gray-100 rounded-xl overflow-hidden">
          <button
            onClick={() => setPrisLogik("pris")}
            className={`flex-1 py-2 text-xs font-semibold transition-colors ${
              state.prisLogik === "pris" ? "bg-green-600 text-white" : "text-gray-500"
            }`}
          >
            Pris
          </button>
          <button
            onClick={() => setPrisLogik("tilbud")}
            className={`flex-1 py-2 text-xs font-semibold transition-colors ${
              state.prisLogik === "tilbud" ? "bg-green-600 text-white" : "text-gray-500"
            }`}
          >
            Tilbud
          </button>
        </div>
      </div>

      {/* Expanded: Kæder */}
      {openBox === "chains" && (
        <div className="pt-2 pb-3 flex flex-col gap-2">
          {CHAINS.map((chain) => {
            const isOn = state.selectedChains.includes(chain);
            return (
              <button
                key={chain}
                onClick={() => toggleChain(chain)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors border ${
                  isOn
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-gray-50 text-gray-700 border-gray-100"
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
          <p className="text-xs text-gray-400 px-1">Ingen valgt = alle kæder aktive</p>
        </div>
      )}

      {/* Expanded: Antal personer */}
      {openBox === "persons" && (
        <div className="pt-2 pb-3">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                onClick={() => { setPersons(n); setOpenBox(null); }}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${
                  state.persons === n ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tag filter row */}
      <div className="flex gap-2 py-2 overflow-x-auto scrollbar-none">
        <TagChip label="Alle" active={state.tagFilters.length === 0} onClick={clearTagFilters} />
        {TAG_OPTIONS.map(({ value, label }) => (
          <TagChip
            key={value}
            label={label}
            active={state.tagFilters.includes(value)}
            onClick={() => toggleTagFilter(value)}
          />
        ))}
      </div>
    </div>
  );
}

function FilterBox({
  label, summary, isOpen, isActive, onClick,
}: {
  label: string; summary: string; isOpen: boolean; isActive: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-start px-3 py-2 rounded-xl text-left transition-colors border ${
        isOpen || isActive ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-100"
      }`}
    >
      <div className="flex items-center justify-between w-full gap-1">
        <span className={`text-xs font-semibold leading-tight ${isOpen || isActive ? "text-green-700" : "text-gray-500"}`}>
          {label}
        </span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
          stroke={isOpen || isActive ? "#16a34a" : "#9ca3af"} strokeWidth="2.5"
          className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      <span className={`text-xs truncate w-full mt-0.5 ${isOpen || isActive ? "text-green-600" : "text-gray-400"}`}>
        {summary}
      </span>
    </button>
  );
}

function TagChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
        active ? "bg-green-600 text-white" : "bg-gray-100 text-gray-500"
      }`}
    >
      {label}
    </button>
  );
}
