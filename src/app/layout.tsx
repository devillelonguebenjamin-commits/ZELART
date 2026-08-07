import type { Metadata } from "next";
import { Geist, Playfair_Display } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { reglagesReseaux } from "@/lib/parametres";
import LiensReseaux from "@/components/LiensReseaux";
import { CreteVagues } from "@/components/Vagues";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const reseaux = await reglagesReseaux();

  return (
    <html lang="fr" className={`${geistSans.variable} ${playfair.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-10 border-b border-pink-100 bg-white/85 backdrop-blur">
          {/* Cinq entrées ne tiennent pas sur la largeur d'un téléphone. Plutôt
              que de laisser « Press-on » se couper en deux ou la barre déborder
              latéralement, on interdit la coupure au sein d'un lien et on
              autorise le passage à la ligne entre eux. */}
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-3 gap-y-2 px-4 py-3 sm:justify-between sm:gap-x-4 sm:px-6 lg:flex-nowrap">
            <Link
              href="/"
              className="font-display whitespace-nowrap text-xl font-bold text-pink-500 sm:text-2xl"
            >
              Zelart{" "}
              <span className="text-sm font-normal tracking-widest text-pink-300 sm:text-base">
                Nails
              </span>
            </Link>
            <nav className="flex items-center gap-3 text-sm sm:gap-6">
              {/* Une seule entrée « Prestations » plutôt que deux : la page
                  d'explications porte les tarifs en lien, alors que l'inverse
                  n'était pas vrai. Le nombre d'entrées ne bouge donc pas, et la
                  barre ne redéborde pas sur téléphone. */}
              <Link
                href="/prestations"
                className="hidden whitespace-nowrap text-foreground/80 hover:text-pink-500 lg:block"
              >
                Prestations
              </Link>
              <Link
                href="/#infos"
                className="hidden whitespace-nowrap text-foreground/80 hover:text-pink-500 lg:block"
              >
                Infos pratiques
              </Link>
              <Link
                href="/press-on"
                className="whitespace-nowrap text-foreground/80 hover:text-pink-500"
              >
                Press-on
              </Link>
              <Link
                href="/mon-espace"
                className="whitespace-nowrap text-foreground/80 hover:text-pink-500"
              >
                Mon espace
              </Link>
              <Link
                href="/reserver"
                className="whitespace-nowrap rounded-full bg-pink-500 px-4 py-2 font-medium text-white shadow-sm transition hover:bg-pink-600"
              >
                {/* Le libellé complet ne tient pas sur un téléphone. */}
                <span className="sm:hidden">Réserver</span>
                <span className="hidden sm:inline">Prendre rendez-vous</span>
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        {/* La vague tient lieu de séparation : un filet droit en plus ferait double. */}
        <footer className="mt-16 bg-white/60">
          <CreteVagues />
          <div className="mx-auto grid max-w-5xl gap-6 px-4 pb-8 text-sm text-foreground/70 sm:grid-cols-3 sm:px-6">
            <div>
              <p className="font-display text-lg font-bold text-pink-500">Zelart Nails</p>
              <p className="mt-1">Zélia — prothésiste ongulaire &amp; nail artist certifiée</p>
              <p className="mt-1">SIRET 903 178 101 00015</p>
              {reseaux.length > 0 && (
                <div className="mt-4">
                  <LiensReseaux reseaux={reseaux} />
                </div>
              )}
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
                <Link href="/prestations" className="hover:text-pink-500">
                  Les prestations
                </Link>
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
