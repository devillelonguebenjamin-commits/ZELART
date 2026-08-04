import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { clienteConnectee } from "@/lib/cliente-auth";
import { formatHeure, formatJour } from "@/lib/creneaux";
import { formatPrix, totalTarifs } from "@/lib/format";
import { deconnexionCliente } from "@/actions/espace-cliente";
import FormulaireLienConnexion from "@/components/FormulaireLienConnexion";
import BoutonAccordOffres from "@/components/BoutonAccordOffres";
import BoutonAnnulation from "@/components/BoutonAnnulation";
import { annulationPossible, DELAI_ANNULATION_H } from "@/lib/annulation";
import RoueFidelite from "@/components/RoueFidelite";
import { reglagesRoue } from "@/lib/parametres";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mon espace — Zelart Nails",
  description:
    "Retrouvez vos rendez-vous, l'historique de vos poses et votre code de parrainage Zelart Nails.",
};

const LIBELLES_STATUT: Record<string, { texte: string; classes: string }> = {
  EN_ATTENTE: { texte: "En attente de confirmation", classes: "bg-amber-100 text-amber-800" },
  CONFIRME: { texte: "Confirmé", classes: "bg-emerald-100 text-emerald-800" },
  ANNULE: { texte: "Annulé", classes: "bg-stone-200 text-stone-600" },
  TERMINE: { texte: "Réalisé", classes: "bg-sky-100 text-sky-800" },
  NO_SHOW: { texte: "Non honoré", classes: "bg-red-100 text-red-700" },
};

export default async function MonEspace({
  searchParams,
}: {
  searchParams: Promise<{ lien?: string }>;
}) {
  const clienteId = await clienteConnectee();
  const { lien } = await searchParams;

  if (!clienteId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <h1 className="font-display text-3xl font-bold">Mon espace ✨</h1>
        <p className="mt-3 text-foreground/70">
          Retrouvez vos rendez-vous, l&rsquo;historique de vos poses et votre code de parrainage.
        </p>

        {lien === "expire" && (
          <p className="mt-6 rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-900">
            Ce lien de connexion n&rsquo;est plus valable — les liens expirent au bout de 30 minutes
            et ne servent qu&rsquo;une fois. Demandez-en un nouveau ci-dessous, c&rsquo;est immédiat.
          </p>
        )}

        <div className="mt-8 rounded-3xl border border-pink-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-foreground/70">
            Pas de mot de passe à créer : indiquez l&rsquo;adresse utilisée lors de votre
            réservation, vous recevrez un lien pour vous connecter.
          </p>
          <div className="mt-4">
            <FormulaireLienConnexion />
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-foreground/60">
          Pas encore venue chez Zelart ?{" "}
          <Link href="/reserver" className="font-medium text-pink-600 hover:underline">
            Prendre un premier rendez-vous
          </Link>
        </p>
      </div>
    );
  }

  const roue = await reglagesRoue();
  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
    include: {
      rendezVous: {
        include: { lignes: { include: { prestation: true }, orderBy: { ordre: "asc" } } },
        orderBy: { debut: "desc" },
      },
      filleules: { select: { id: true, prenom: true, creeLe: true } },
      recompenses: { include: { lot: true }, orderBy: { gagneLe: "desc" } },
    },
  });
  if (!cliente) return null;

  const maintenant = new Date();
  const aVenir = cliente.rendezVous
    .filter((r) => r.fin >= maintenant && r.statut !== "ANNULE")
    .reverse();
  const passes = cliente.rendezVous.filter((r) => r.fin < maintenant || r.statut === "ANNULE");
  const realises = cliente.rendezVous.filter((r) => r.statut === "TERMINE");

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Bonjour {cliente.prenom} ✨</h1>
          <p className="mt-1 text-sm text-foreground/60">
            {realises.length > 0
              ? `${realises.length} pose${realises.length > 1 ? "s" : ""} réalisée${realises.length > 1 ? "s" : ""} chez Zelart`
              : "Bienvenue dans votre espace"}
          </p>
        </div>
        <form action={deconnexionCliente}>
          <button
            type="submit"
            className="rounded-full border border-pink-200 px-4 py-1.5 text-sm text-pink-600 transition hover:bg-pink-50"
          >
            Se déconnecter
          </button>
        </form>
      </div>

      {/* Rendez-vous à venir */}
      <section>
        <h2 className="font-display text-xl font-bold">Mes prochains rendez-vous</h2>
        <div className="mt-3 grid gap-3">
          {aVenir.map((rdv) => {
            const total = totalTarifs(rdv.lignes.map((l) => l.prestation));
            const statut = LIBELLES_STATUT[rdv.statut] ?? LIBELLES_STATUT.EN_ATTENTE;
            return (
              <div key={rdv.id} className="rounded-2xl border border-pink-100 bg-white px-5 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold capitalize">
                    {formatJour(rdv.debut)} · {formatHeure(rdv.debut)}
                  </p>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statut.classes}`}>
                    {statut.texte}
                  </span>
                </div>
                <ul className="mt-2 space-y-0.5 text-sm text-foreground/80">
                  {rdv.lignes.map((ligne) => (
                    <li key={ligne.id} className="flex justify-between gap-4">
                      <span>{ligne.prestation.nom}</span>
                      <span>{formatPrix(ligne.prestation.prixCents, ligne.prestation.aPartirDe)}</span>
                    </li>
                  ))}
                  <li className="flex justify-between gap-4 border-t border-pink-100 pt-1 font-semibold">
                    <span>Total</span>
                    <span className="text-pink-600">
                      {formatPrix(total.prixCents, total.aPartirDe)}
                    </span>
                  </li>
                </ul>
                {annulationPossible(rdv.debut) ? (
                  <BoutonAnnulation rendezVousId={rdv.id} />
                ) : (
                  <p className="mt-3 text-xs text-foreground/50">
                    À moins de {DELAI_ANNULATION_H} h du rendez-vous, prévenez Zélia par SMS au
                    06 45 29 20 01.
                  </p>
                )}
              </div>
            );
          })}
          {aVenir.length === 0 && (
            <div className="rounded-2xl bg-pink-50 px-5 py-6 text-center">
              <p className="text-sm text-foreground/70">Aucun rendez-vous à venir pour l&rsquo;instant.</p>
              <Link
                href="/reserver"
                className="mt-3 inline-block rounded-full bg-pink-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-pink-600"
              >
                Prendre rendez-vous
              </Link>
            </div>
          )}
        </div>
      </section>

      <RoueFidelite
        lots={roue.lots}
        posesParTour={roue.posesParTour}
        posesRealisees={realises.length}
        toursJoues={cliente.recompenses.length}
      />

      {/* Récompenses gagnées */}
      {cliente.recompenses.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-bold">Mes récompenses</h2>
          <div className="mt-3 grid gap-2">
            {cliente.recompenses.map((recompense) => (
              <div
                key={recompense.id}
                className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-2xl border px-5 py-3 text-sm ${
                  recompense.utiliseLe
                    ? "border-pink-100 bg-pink-50/50 text-foreground/50"
                    : "border-pink-200 bg-white"
                }`}
              >
                <span className="font-medium">{recompense.lot.libelle}</span>
                <span className="font-mono text-xs tracking-wider">{recompense.code}</span>
                <span className="text-xs">
                  {recompense.utiliseLe
                    ? `utilisée le ${formatJour(recompense.utiliseLe)}`
                    : `gagnée le ${formatJour(recompense.gagneLe)}`}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Parrainage */}
      <section className="rounded-3xl bg-pink-50 p-6 sm:p-8">
        <h2 className="font-display text-xl font-bold">Parrainez vos proches 💕</h2>
        <p className="mt-2 text-sm text-foreground/75">
          Partagez votre code personnel : la personne le saisit lors de sa première réservation, et
          Zélia vous remercie toutes les deux à votre prochain rendez-vous.
        </p>
        <p className="mt-4 inline-block rounded-2xl border-2 border-dashed border-pink-300 bg-white px-6 py-3 font-display text-2xl font-bold tracking-wider text-pink-600">
          {cliente.codeParrainage}
        </p>
        {cliente.filleules.length > 0 && (
          <p className="mt-3 text-sm font-medium text-foreground/80">
            🎉 {cliente.filleules.length} personne{cliente.filleules.length > 1 ? "s" : ""} déjà
            venue{cliente.filleules.length > 1 ? "s" : ""} grâce à vous :{" "}
            {cliente.filleules.map((f) => f.prenom).join(", ")}
          </p>
        )}
      </section>

      {/* Historique */}
      <section>
        <h2 className="font-display text-xl font-bold">L&rsquo;historique de mes poses</h2>
        <div className="mt-3 grid gap-2">
          {passes.map((rdv) => {
            const total = totalTarifs(rdv.lignes.map((l) => l.prestation));
            const statut = LIBELLES_STATUT[rdv.statut] ?? LIBELLES_STATUT.TERMINE;
            return (
              <div
                key={rdv.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-2xl border border-pink-100 bg-white px-5 py-3 text-sm"
              >
                <span className="capitalize">{formatJour(rdv.debut)}</span>
                <span className="flex-1 text-foreground/80">
                  {rdv.lignes.map((l) => l.prestation.nom).join(" + ")}
                </span>
                <span className="font-medium text-pink-600">
                  {formatPrix(total.prixCents, total.aPartirDe)}
                </span>
                <span className="text-xs text-foreground/50">{statut.texte}</span>
              </div>
            );
          })}
          {passes.length === 0 && (
            <p className="rounded-2xl bg-pink-50 px-5 py-4 text-sm text-foreground/70">
              Votre historique apparaîtra ici après votre première pose.
            </p>
          )}
        </div>
      </section>

      {/* Préférences */}
      <section className="rounded-2xl border border-pink-100 bg-white p-6">
        <h2 className="font-semibold">Offres et actualités</h2>
        <p className="mt-1 text-sm text-foreground/70">
          {cliente.consentementMarketing && !cliente.desabonneLe
            ? "Vous recevez les nouveautés et offres de fidélité de Zelart par e-mail."
            : "Vous ne recevez aucune offre. Vous pouvez changer d'avis quand vous le souhaitez."}
        </p>
        <div className="mt-3">
          <BoutonAccordOffres
            accepte={cliente.consentementMarketing && !cliente.desabonneLe}
          />
        </div>
        <p className="mt-4 text-xs text-foreground/60">
          Vos coordonnées : {cliente.email} · {cliente.telephone}. Pour toute correction ou
          suppression, écrivez à Zelia.barreteaupro@outlook.fr.
        </p>
      </section>
    </div>
  );
}
