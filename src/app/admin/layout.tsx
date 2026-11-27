import type { Metadata, Viewport } from "next";

// Ce qui fait de l'espace gérante une application installable : le manifeste,
// l'icône d'écran d'accueil d'iPhone et l'ouverture en plein écran.
export const metadata: Metadata = {
  manifest: "/admin/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Zelart Pro", statusBarStyle: "default" },
  icons: { apple: "/gerante/apple-touch-icon.png" },
};

export const viewport: Viewport = { themeColor: "#ec4899" };

export default function AdminRacine({ children }: { children: React.ReactNode }) {
  return children;
}
