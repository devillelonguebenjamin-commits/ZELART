import type { Metadata } from "next";
import Link from "next/link";
import FormulaireInscription from "@/components/FormulaireInscription";
import Vagues from "@/components/Vagues";

export const metadata: Metadata = {
  title: "Créer mon compte · Zelart Nails",
  description:
    "Ouvrez votre espace Zelart Nails sans prendre rendez-vous : vos informations, votre code de parrainage et vos avantages au même endroit.",
  // Une page de formulaire n'a rien à faire dans les résultats de recherche :
  // on y arrive depuis l'espace cliente, pas depuis Google.
  robots: { index: false },
};

export default function Inscription() {
  return (
    <>
      <section className="relative isolate overflow-hidden">
        <Vagues variante="bandeau" />
        <div className="mx-auto max-w-lg px-4 py-14 text-center sm:px-6">
          <h1 className="font-display text-3xl font-bold">Créer mon compte ✨</h1>
          <p className="mt-3 text-foreground/70">
            Sans prendre rendez-vous. Vous y retrouverez votre code de parrainage, vos avantages, et
            vos rendez-vous le jour où vous en prendrez un.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-lg px-4 pb-16 sm:px-6">
        <div className="rounded-3xl border border-pink-100 bg-white p-6 shadow-sm">
          <FormulaireInscription />
        </div>

        <p className="mt-6 text-center text-sm text-foreground/60">
          Vous avez déjà réservé chez moi ?{" "}
          <Link href="/mon-espace" className="font-medium text-pink-600 hover:underline">
            Votre espace existe déjà
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-foreground/50">
          Vos informations servent à vous reconnaître et à vous joindre, rien d&rsquo;autre. Le
          détail est dans la{" "}
          <Link href="/confidentialite" className="hover:underline">
            politique de confidentialité
          </Link>
          .
        </p>
      </div>
    </>
  );
}
