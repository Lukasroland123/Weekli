"use client";

import { useEffect } from "react";
import SettingsContent from "@/components/SettingsContent";

export default function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Sheet */}
      <div className="relative mt-auto w-full max-w-[430px] bg-gray-50 rounded-t-3xl shadow-xl max-h-[88vh] flex flex-col animate-[slideup_0.2s_ease-out]">
        <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Indstillinger</h2>
          <button
            onClick={onClose}
            aria-label="Luk"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-500 hover:text-gray-800 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto px-4 pb-8">
          <SettingsContent />
        </div>
      </div>
    </div>
  );
}
