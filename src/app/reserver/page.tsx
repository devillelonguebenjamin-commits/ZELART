import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getCreneauxDisponibles } from "@/lib/creneaux";
import { stockageConfigure } from "@/lib/blob";
import ReservationWizard from "@/components/ReservationWizard";
import { clienteConnectee } from "@/lib/cliente-auth";
import Vagues from "@/components/Vagues";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Prendre rendez-vous — Zelart Nails",
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

  const [prestations, creneaux] = await Promise.all([
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
  ]);

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
            créneau. Une fois votre demande envoyée, Zélia vous répondra par message pour la
            confirmer 🤍
          </p>
        </div>
      </section>
      <div className="mx-auto max-w-5xl px-4 pb-12 sm:px-6">
        <ReservationWizard
          prestations={prestations}
          creneaux={creneaux}
          envoiImagesActif={stockageConfigure()}
          cliente={connue}
        />
      </div>
    </>
  );
}
