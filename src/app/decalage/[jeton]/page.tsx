import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatHeure, formatJour } from "@/lib/creneaux";
import Vagues from "@/components/Vagues";
import ReponseDecalage from "@/components/ReponseDecalage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Proposition d'horaire · Zelart Nails",
  robots: { index: false },
};

/**
 * La page du lien envoyé à la cliente. Une page plutôt que deux liens
 * « accepter » / « refuser » dans l'e-mail : les messageries ouvrent les liens
 * d'un e-mail pour les analyser, et un lien qui accepte tout seul aurait
 * déplacé des rendez-vous sans que personne n'ait cliqué.
 */
export default async function Decalage({ params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params;
  const p = await prisma.propositionDecalage.findUnique({
    where: { jeton },
    include: { rendezVous: { select: { debut: true, cliente: { select: { prenom: true } } } } },
  });
  if (!p) notFound();

  const quand = (d: Date) => `${formatJour(d)} à ${formatHeure(d)}`;
  const enAttente = p.statut === "EN_ATTENTE" && p.debut > new Date();

  return (
    <section className="relative isolate overflow-hidden">
      <Vagues />
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-pink-100 bg-white p-8 shadow-sm sm:p-10">
          <h1 className="font-display text-3xl font-bold">
            Bonjour {p.rendezVous.cliente.prenom}
          </h1>

          {enAttente ? (
            <>
              <p className="mt-3 text-foreground/75">
                Je vous propose de déplacer votre rendez-vous.
              </p>
              <dl className="mt-6 space-y-3 rounded-2xl bg-pink-50 p-5 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-foreground/60">Prévu</dt>
                  <dd className="font-medium capitalize">{quand(p.rendezVous.debut)}</dd>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-foreground/60">Proposé</dt>
                  <dd className="font-semibold capitalize text-pink-700">{quand(p.debut)}</dd>
                </div>
              </dl>
              {p.message && (
                <blockquote className="mt-5 border-l-4 border-pink-300 pl-4 text-sm text-foreground/80">
                  {p.message}
                </blockquote>
              )}
              <ReponseDecalage jeton={jeton} />
              <p className="mt-6 text-xs text-foreground/55">
                Tant que vous n&rsquo;avez pas répondu, votre rendez-vous reste le{" "}
                {quand(p.rendezVous.debut)}.
              </p>
            </>
          ) : (
            <p className="mt-4 text-foreground/75">
              {p.statut === "ACCEPTEE"
                ? `C'est noté : votre rendez-vous est le ${quand(p.rendezVous.debut)}.`
                : `Cette proposition n'est plus en cours. Votre rendez-vous est le ${quand(p.rendezVous.debut)}.`}{" "}
              Pour toute question, un SMS au 06 45 29 20 01 suffit.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
