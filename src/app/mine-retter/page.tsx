"use client";

import AddRecipeSection from "@/components/AddRecipeSection";

export default function MineRetterPage() {
  return (
    <div className="pb-24 px-4 pt-5">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Mine retter</h1>
      <p className="text-sm text-gray-400 mb-4">Tilføj dine egne opskrifter og se hvor de er billigst.</p>
      <AddRecipeSection />
    </div>
  );
}
