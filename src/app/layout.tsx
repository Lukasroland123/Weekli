import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { ShoppingProvider } from "@/context/ShoppingContext";
import { AppProvider } from "@/context/AppContext";
import ClientLayout from "@/components/ClientLayout";

const geist = Geist({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://getweekli.com"),
  title: {
    default: "Weekli | Billige madplaner og opskrifter",
    template: "%s | Weekli",
  },
  description:
    "Find de billigste retter baseret på aktuelle priser og tilbud i REMA 1000, Netto og Føtex. Lav en billig ugentlig madplan med indkøbsliste.",
  applicationName: "Weekli",
  keywords: ["madplan", "billige opskrifter", "tilbud", "indkøbsliste", "aftensmad", "REMA 1000", "Netto", "Føtex"],
  alternates: { canonical: "/" },
  appleWebApp: { capable: true, title: "Weekli", statusBarStyle: "default" },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "Weekli",
    locale: "da_DK",
    url: "/",
    title: "Weekli | Billige madplaner og opskrifter",
    description:
      "Find de billigste retter baseret på aktuelle priser og tilbud. Lav en billig ugentlig madplan med indkøbsliste.",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: "Weekli — billige madplaner & opskrifter" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Weekli | Billige madplaner og opskrifter",
    description: "Find de billigste retter baseret på aktuelle priser og tilbud.",
    images: ["/opengraph-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="da">
      <body className={`${geist.className} min-h-screen`}>
        <ShoppingProvider>
          <AppProvider>
            <ClientLayout>
              {children}
            </ClientLayout>
          </AppProvider>
        </ShoppingProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
