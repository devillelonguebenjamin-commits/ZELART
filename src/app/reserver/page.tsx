import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCreneauxDisponibles } from "@/lib/creneaux";
import { stockageConfigure } from "@/lib/blob";
import ReservationWizard from "@/components/ReservationWizard";
import AvisRassurance from "@/components/AvisRassurance";
import { avisGoogle } from "@/lib/avis";
import { niveauxNailArt } from "@/lib/explications";
import { niveauxExpliques } from "@/lib/nail-art";
import { clienteConnectee } from "@/lib/cliente-auth";
import Vagues from "@/components/Vagues";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Prendre rendez-vous · Zelart Nails",
};

export default async function Reserver() {
  // Une cliente déjà connectée n'a pas à retaper ce que le site sait d'elle.
  const clienteId = await clienteConnectee();
  const connue = clienteId
    ? await prisma.cliente.findUnique({
        where: { id: clienteId },
        select: { prenom: true, nom: true, email: true, telephone: true },
      })
    : null;

  const [prestations, creneaux, avis] = await Promise.all([
    prisma.prestation.findMany({
      where: { active: true },
      orderBy: { ordre: "asc" },
      select: {
        id: true,
        nom: true,
        categorie: true,
        description: true,
        dureeMin: true,
        prixCents: true,
        aPartirDe: true,
        typeActe: true,
        typePose: true,
      },
    }),
    getCreneauxDisponibles(),
    avisGoogle(),
  ]);

  // Le supplément de chaque niveau se mesure sur le catalogue complet, dépose
  // et remplissages compris : la sélection affichée, elle, est filtrée.
  const catalogue = await prisma.prestation.findMany({ where: { active: true } });
  const niveaux = await niveauxExpliques(niveauxNailArt(catalogue));

  return (
    <>
      <section className="relative isolate overflow-hidden">
        <Vagues variante="bandeau" />
        <div className="mx-auto max-w-5xl px-4 py-14 text-center sm:px-6">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">
            Prendre un rendez-vous ✨
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-foreground/70">
            Quelques questions sur vos ongles, puis le choix de votre prestation et de votre
            créneau. Une fois votre demande envoyée, je vous réponds par message pour la
            confirmer 🤍
          </p>
          {/* L'hésitation se produit ici, pas sur l'accueil : le lien s'ouvre à
              côté pour ne pas faire perdre la sélection en cours. */}
          <p className="mt-3 text-sm">
            <Link
              href="/prestations"
              target="_blank"
              className="font-medium text-pink-600 hover:underline"
            >
              Vous hésitez entre deux prestations ? Voir ce que chacune veut dire
            </Link>
          </p>
        </div>
      </section>
      <div className="mx-auto max-w-5xl px-4 pb-12 sm:px-6">
        {/* La réassurance appartient à l'endroit où l'on hésite à laisser ses
            coordonnées, pas au bas de la page d'accueil. */}
        <AvisRassurance fiche={avis} />
        <div className="mt-8">
          <ReservationWizard
            prestations={prestations}
            creneaux={creneaux}
            envoiImagesActif={stockageConfigure()}
            niveauxNailArt={niveaux}
            cliente={connue}
          />
        </div>
      </div>
    </>
  );
}
