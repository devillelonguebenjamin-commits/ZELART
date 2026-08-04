import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatHeure, formatJour } from "@/lib/creneaux";
import { formatPrix, totalRendezVous } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Demande envoyée — Zelart Nails",
};

export default async function Confirmation({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rendezVous = await prisma.rendezVous.findUnique({
    where: { id },
    include: { cliente: true, prestation: true, depose: true },
  });
  if (!rendezVous) notFound();

  const total = totalRendezVous(rendezVous.prestation, rendezVous.depose);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <div className="rounded-3xl border border-pink-100 bg-white p-8 text-center shadow-sm sm:p-10">
        <p className="text-5xl">🤍</p>
        <h1 className="font-display mt-4 text-3xl font-bold">Demande envoyée !</h1>
        <p className="mt-3 text-foreground/70">
          Merci {rendezVous.cliente.prenom}, votre demande de rendez-vous a bien été enregistrée.
        </p>

        <div className="mt-8 rounded-2xl bg-pink-50 p-6 text-left">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-foreground/60">Prestation</dt>
              <dd className="text-right font-medium">
                {rendezVous.prestation.nom}
                <span className="ml-2 font-normal text-foreground/60">
                  {formatPrix(rendezVous.prestation.prixCents, rendezVous.prestation.aPartirDe)}
                </span>
              </dd>
            </div>
            {rendezVous.depose && (
              <div className="flex justify-between gap-4">
                <dt className="text-foreground/60">Dépose</dt>
                <dd className="text-right font-medium">
                  {rendezVous.depose.nom}
                  <span className="ml-2 font-normal text-foreground/60">
                    {formatPrix(rendezVous.depose.prixCents, rendezVous.depose.aPartirDe)}
                  </span>
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-foreground/60">Date</dt>
              <dd className="text-right font-medium capitalize">{formatJour(rendezVous.debut)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-foreground/60">Heure</dt>
              <dd className="text-right font-medium">{formatHeure(rendezVous.debut)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-pink-200 pt-3">
              <dt className="font-semibold">Total</dt>
              <dd className="text-right text-base font-bold text-pink-600">
                {formatPrix(total.prixCents, total.aPartirDe)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-foreground/60">Statut</dt>
              <dd className="text-right">
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                  En attente de confirmation
                </span>
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-8 space-y-3 text-left text-sm leading-relaxed text-foreground/75">
          <p>
            📱 Zélia va vous envoyer un <strong>message de confirmation</strong> au numéro indiqué
            (elle ne répond pas aux appels).
          </p>
          <p>
            💳 S&rsquo;il s&rsquo;agit de votre premier rendez-vous, un <strong>acompte de 15 €</strong>{" "}
            vous sera demandé via un lien de paiement SumUp pour valider la réservation — il sera
            déduit du montant final.
          </p>
          <p>🌸 Le règlement se fait sur place, en espèces ou par carte bancaire.</p>
        </div>

        <Link
          href="/"
          className="mt-10 inline-block rounded-full bg-pink-500 px-8 py-3 font-medium text-white shadow-sm transition hover:bg-pink-600"
        >
          Retour à l&rsquo;accueil
        </Link>
      </div>
    </div>
  );
}
