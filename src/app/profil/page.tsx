"use client";

import SettingsContent from "@/components/SettingsContent";

export default function ProfilPage() {
  return (
    <div className="pb-24 px-4 pt-5 space-y-3 min-h-screen bg-gray-50">
      <div className="mb-1">
        <h1 className="text-2xl font-bold text-gray-900">Indstillinger</h1>
        <p className="text-sm text-gray-400 mt-0.5">Præferencer og din besparelse</p>
      </div>
      <SettingsContent />
    </div>
  );
}
