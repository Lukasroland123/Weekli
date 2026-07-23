import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-24">
      <div className="text-5xl font-extrabold text-green-600 mb-3">404</div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">Siden findes ikke</h1>
      <p className="text-sm text-gray-500 mb-6 max-w-xs">
        Vi kunne ikke finde den side du ledte efter. Måske er opskriften flyttet eller fjernet.
      </p>
      <Link
        href="/"
        className="bg-green-600 text-white font-semibold px-6 py-3 rounded-2xl hover:bg-green-700 transition-colors"
      >
        Til forsiden
      </Link>
    </div>
  );
}
