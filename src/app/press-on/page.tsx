import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { stockageConfigure } from "@/lib/blob";
import FormulaireCommandePressOn from "@/components/FormulaireCommandePressOn";
import Vagues from "@/components/Vagues";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Press-on nails — Zelart Nails",
  description:
    "Commandez vos press-on nails : sets sur-mesure dessinés selon vos envies ou collections déjà prêtes. Remise en main propre à Saint-Nazaire ou envoi postal.",
};

export default async function PressOn() {
  const modeles = await prisma.modelePressOn.findMany({
    where: { actif: true },
    orderBy: { ordre: "asc" },
    select: {
      id: true,
      nom: true,
      collection: true,
      description: true,
      prixCents: true,
      aPartirDe: true,
      surMesure: true,
      photoUrl: true,
    },
  });

  return (
    <>
      <section className="relative isolate overflow-hidden">
        <Vagues variante="bandeau" />
        <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6">
          <p className="text-sm uppercase tracking-[0.3em] text-pink-400">Sur-mesure</p>
          <h1 className="font-display mt-3 text-3xl font-bold sm:text-4xl">Press-on nails 💅</h1>
          <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-foreground/75">
            Des faux ongles réutilisables, faits main et taillés à votre morphologie : vous les
            posez vous-même en quelques minutes, chez vous, et vous les gardez pour une prochaine
            fois. Choisissez un set d&rsquo;une collection ou faites-en dessiner un rien que pour
            vous.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 pb-12 sm:px-6">
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          {[
            { titre: "Sur-mesure", texte: "Chaque set est taillé d'après vos mesures." },
            {
              titre: "Réglé avant fabrication",
              texte:
                "En envoi postal : la totalité d'avance, par lien SumUp. En retrait au salon : un acompte, le solde en espèces ou par carte à la remise.",
            },
            {
              titre: "Remise ou envoi",
              texte: "En main propre à Saint-Nazaire, ou par la poste à vos frais.",
            },
          ].map((point) => (
            <div key={point.titre} className="rounded-2xl border border-pink-100 bg-white px-5 py-4">
              <p className="font-medium text-pink-500">{point.titre}</p>
              <p className="mt-1 text-foreground/70">{point.texte}</p>
            </div>
          ))}
        </div>

        {modeles.length === 0 ? (
          <p className="mt-12 rounded-2xl bg-pink-50 px-6 py-8 text-center text-foreground/70">
            Les commandes de press-on sont momentanément fermées. Écrivez à Zélia par SMS au
            06 45 29 20 01 pour en savoir plus.
          </p>
        ) : (
          <div className="mt-12">
            <FormulaireCommandePressOn
              modeles={modeles}
              envoiImagesActif={stockageConfigure()}
            />
          </div>
        )}
      </div>
    </>
  );
}
