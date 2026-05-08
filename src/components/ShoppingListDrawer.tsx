"use client";

import { ShoppingItem } from "@/lib/types";
import { formatPrice } from "@/lib/pricing";

interface Props {
  items: ShoppingItem[];
  onRemove: (id: string) => void;
  onClose: () => void;
}

export default function ShoppingListDrawer({ items, onRemove, onClose }: Props) {
  const total = items.reduce((sum, i) => sum + i.pris, 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white h-full shadow-xl flex flex-col">
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold">Indkøbsliste</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {items.length === 0 ? (
            <p className="text-gray-400 text-center mt-10">
              Ingen varer endnu.<br />Tilføj en opskrift til listen.
            </p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{item.navn}</p>
                    <p className="text-gray-400 text-xs">
                      {item.pakker}× {item.maengde} {item.maengdeEnhed} · {item.butik}
                    </p>
                    <p className="text-gray-400 text-xs">{item.opskriftTitel}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-gray-600 font-medium">{formatPrice(item.pris)}</span>
                    <button
                      onClick={() => onRemove(item.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none"
                    >
                      &times;
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="p-5 border-t bg-gray-50">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Total</span>
              <span className="font-semibold text-gray-900">{formatPrice(total)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
