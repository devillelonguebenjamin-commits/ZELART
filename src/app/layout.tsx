import type { Metadata } from "next";
import { Geist, Playfair_Display } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zelart Nails — Prothésiste ongulaire à Saint-Nazaire",
  description:
    "Zélia, prothésiste ongulaire et nail artist certifiée à Saint-Nazaire. Prenez rendez-vous en ligne : vernis semi-permanent, gainage, pose Gel X, pose Pop-it et nail art.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${playfair.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-10 border-b border-pink-100 bg-white/85 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <Link href="/" className="font-display text-2xl font-bold text-pink-500">
              Zelart <span className="text-base font-normal tracking-widest text-pink-300">Nails</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm sm:gap-6">
              <Link href="/#prestations" className="hidden text-foreground/80 hover:text-pink-500 sm:block">
                Prestations &amp; tarifs
              </Link>
              <Link href="/#infos" className="hidden text-foreground/80 hover:text-pink-500 sm:block">
                Infos pratiques
              </Link>
              <Link href="/press-on" className="text-foreground/80 hover:text-pink-500">
                Press-on
              </Link>
              <Link href="/mon-espace" className="text-foreground/80 hover:text-pink-500">
                Mon espace
              </Link>
              <Link
                href="/reserver"
                className="rounded-full bg-pink-500 px-4 py-2 font-medium text-white shadow-sm transition hover:bg-pink-600"
              >
                Prendre rendez-vous
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="mt-16 border-t border-pink-100 bg-white/60">
          <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 text-sm text-foreground/70 sm:grid-cols-3 sm:px-6">
            <div>
              <p className="font-display text-lg font-bold text-pink-500">Zelart Nails</p>
              <p className="mt-1">Zélia — prothésiste ongulaire &amp; nail artist certifiée</p>
              <p className="mt-1">SIRET 903 178 101 00015</p>
            </div>
            <div>
              <p className="font-semibold text-foreground/90">L&rsquo;institut</p>
              <p className="mt-1">
                L&rsquo;Atelier du Regard
                <br />
                108 avenue de la République
                <br />
                44600 Saint-Nazaire
              </p>
            </div>
            <div>
              <p className="font-semibold text-foreground/90">Contact</p>
              <p className="mt-1">Zelia.barreteaupro@outlook.fr</p>
              <p>06 45 29 20 01 (SMS uniquement)</p>
              <p className="mt-1">Paiement en espèces ou par carte (SumUp)</p>
              <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
                <Link href="/mentions-legales" className="hover:text-pink-500">
                  Mentions légales
                </Link>
                <Link href="/confidentialite" className="hover:text-pink-500">
                  Protection des données
                </Link>
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
