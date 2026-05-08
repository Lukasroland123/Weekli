"use client";

import { usePathname } from "next/navigation";
import BottomNav from "@/components/BottomNav";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="max-w-[430px] mx-auto relative min-h-screen bg-white">
      <main className="pb-14">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
