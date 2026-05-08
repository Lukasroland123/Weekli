"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "signup">("login");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      }
      router.replace("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Noget gik galt";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleGuest() {
    localStorage.setItem("weekli_guest", "true");
    router.replace("/");
  }

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center px-6 py-12">
      {/* Logo / title */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-green-600 mb-1">Weekli</h1>
        <p className="text-gray-500 text-sm">Din ugentlige madplan</p>
      </div>

      {/* Mode toggle */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
        <button
          onClick={() => setMode("login")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "login" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
          }`}
        >
          Log ind
        </button>
        <button
          onClick={() => setMode("signup")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === "signup" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
          }`}
        >
          Opret konto
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-green-500"
            placeholder="din@email.dk"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Adgangskode</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-green-500"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="text-red-500 text-sm bg-red-50 rounded-xl px-4 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-green-600 text-white rounded-2xl font-semibold text-base hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {loading ? "Arbejder..." : mode === "login" ? "Log ind" : "Opret konto"}
        </button>
      </form>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">eller</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <button
        onClick={handleGuest}
        className="w-full py-3.5 border border-gray-200 text-gray-600 rounded-2xl font-semibold text-base hover:bg-gray-50 transition-colors"
      >
        Fortsæt som gæst
      </button>
    </div>
  );
}
