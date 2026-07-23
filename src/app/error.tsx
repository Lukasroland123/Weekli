"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-24">
      <h1 className="text-xl font-bold text-gray-900 mb-2">Noget gik galt</h1>
      <p className="text-sm text-gray-500 mb-6 max-w-xs">
        Der opstod en uventet fejl. Prøv igen — hvis det bliver ved, så genindlæs siden.
      </p>
      <button
        onClick={reset}
        className="bg-green-600 text-white font-semibold px-6 py-3 rounded-2xl hover:bg-green-700 transition-colors"
      >
        Prøv igen
      </button>
    </div>
  );
}
