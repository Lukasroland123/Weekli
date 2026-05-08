import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { ShoppingProvider } from "@/context/ShoppingContext";
import { AppProvider } from "@/context/AppContext";
import ClientLayout from "@/components/ClientLayout";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Weekli | Din ugentlige madplan",
  description: "Find de billigste retter baseret på aktuelle tilbud i Aarhus.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="da">
      <body className={`${geist.className} bg-white min-h-screen`}>
        <ShoppingProvider>
          <AppProvider>
            <ClientLayout>
              {children}
            </ClientLayout>
          </AppProvider>
        </ShoppingProvider>
      </body>
    </html>
  );
}
