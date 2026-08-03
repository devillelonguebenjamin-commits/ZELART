import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getCreneauxDisponibles } from "@/lib/creneaux";
import { formatPrix, grouperParCategorie } from "@/lib/format";
import ReservationWizard from "@/components/ReservationWizard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Prendre rendez-vous — Zelart Nails",
};

export default async function Reserver() {
  const [prestations, creneaux] = await Promise.all([
    prisma.prestation.findMany({ where: { active: true }, orderBy: { ordre: "asc" } }),
    getCreneauxDisponibles(),
  ]);

  const categories = grouperParCategorie(
    prestations.map((p) => ({
      id: p.id,
      nom: p.nom,
      categorie: p.categorie,
      description: p.description,
      dureeMin: p.dureeMin,
      prixLabel: formatPrix(p.prixCents, p.aPartirDe),
    }))
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="mb-10 text-center">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">
          Prendre un rendez-vous ✨
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-foreground/70">
          Choisissez votre prestation puis un créneau disponible. Une fois votre demande envoyée,
          Zélia vous répondra par message pour la confirmer 🤍
        </p>
      </div>
      <ReservationWizard categories={categories} creneaux={creneaux} />
    </div>
  );
}
