import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatHeure, formatJour } from "@/lib/creneaux";
import { formatPrix } from "@/lib/format";
import { enregistrerNotesCliente } from "@/actions/admin";
import { basculerConsentement, supprimerCliente } from "@/actions/clientes";

export const dynamic = "force-dynamic";

const LIBELLES_STATUT: Record<string, string> = {
  EN_ATTENTE: "En attente",
  CONFIRME: "Confirmé",
  ANNULE: "Annulé",
  TERMINE: "Terminé",
  NO_SHOW: "Absente",
};

export default async function FicheCliente({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
      rendezVous: { include: { prestation: true }, orderBy: { debut: "desc" } },
    },
  });
  if (!cliente) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/clientes" className="text-sm text-pink-600 hover:underline">
          ← Toutes les clientes
        </Link>
        <h1 className="font-display mt-2 text-2xl font-bold">
          {cliente.prenom} {cliente.nom}
        </h1>
        <p className="mt-1 text-sm text-foreground/70">
          <a href={`tel:${cliente.telephone}`} className="hover:underline">{cliente.telephone}</a> ·{" "}
          <a href={`mailto:${cliente.email}`} className="hover:underline">{cliente.email}</a>
        </p>
      </div>

      <section className="rounded-2xl border border-pink-100 bg-white p-5">
        <h2 className="font-semibold">Offres et actualités</h2>
        {cliente.desabonneLe ? (
          <p className="mt-1 text-sm text-foreground/70">
            Elle s&rsquo;est désinscrite le {formatJour(cliente.desabonneLe)}. Ne la réinscrivez que
            si elle vous le demande expressément.
          </p>
        ) : cliente.consentementMarketing ? (
          <p className="mt-1 text-sm text-foreground/70">
            Elle reçoit vos campagnes
            {cliente.consentementLe && ` — accord donné le ${formatJour(cliente.consentementLe)}`}.
          </p>
        ) : (
          <p className="mt-1 text-sm text-foreground/70">
            Elle ne reçoit aucune campagne. Cochez ci-dessous uniquement si elle vous a donné son
            accord, par exemple de vive voix au salon.
          </p>
        )}
        <form
          action={basculerConsentement.bind(
            null,
            cliente.id,
            !(cliente.consentementMarketing && !cliente.desabonneLe)
          )}
          className="mt-3"
        >
          <button
            type="submit"
            className="rounded-full border border-pink-200 px-5 py-2 text-sm font-medium text-pink-600 transition hover:bg-pink-50"
          >
            {cliente.consentementMarketing && !cliente.desabonneLe
              ? "Retirer son accord"
              : "Enregistrer son accord"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-pink-100 bg-white p-5">
        <h2 className="font-semibold">Notes de suivi</h2>
        <p className="mt-1 text-xs text-foreground/60">
          Allergies, préférences, particularités des ongles… visibles uniquement par vous.
        </p>
        <form action={enregistrerNotesCliente.bind(null, cliente.id)} className="mt-3">
          <textarea
            name="notes"
            rows={4}
            maxLength={2000}
            defaultValue={cliente.notes ?? ""}
            className="w-full rounded-xl border border-pink-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
          />
          <button
            type="submit"
            className="mt-2 rounded-full bg-pink-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-pink-600"
          >
            Enregistrer les notes
          </button>
        </form>
      </section>

      <section>
        <h2 className="font-display text-xl font-bold">
          Historique ({cliente.rendezVous.length} rendez-vous)
        </h2>
        <div className="mt-3 grid gap-2">
          {cliente.rendezVous.map((rdv) => (
            <div
              key={rdv.id}
              className="flex flex-wrap items-baseline justify-between gap-2 rounded-2xl border border-pink-100 bg-white px-5 py-3 text-sm"
            >
              <span className="capitalize">
                {formatJour(rdv.debut)} · {formatHeure(rdv.debut)}
              </span>
              <span>{rdv.prestation.nom}</span>
              <span className="font-medium text-pink-600">
                {formatPrix(rdv.prestation.prixCents, rdv.prestation.aPartirDe)}
              </span>
              <span className="text-foreground/60">{LIBELLES_STATUT[rdv.statut] ?? rdv.statut}</span>
            </div>
          ))}
          {cliente.rendezVous.length === 0 && (
            <p className="rounded-2xl bg-pink-50 px-5 py-4 text-sm text-foreground/70">
              Aucun rendez-vous.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-red-100 bg-red-50/50 p-5">
        <h2 className="font-semibold text-red-900">Effacer cette fiche</h2>
        <p className="mt-1 text-sm text-red-900/80">
          Supprime définitivement {cliente.prenom} {cliente.nom}, ses coordonnées, ses notes et ses{" "}
          {cliente.rendezVous.length} rendez-vous. Cette action est irréversible et répond aux
          demandes de suppression de données.
        </p>
        <form action={supprimerCliente.bind(null, cliente.id)} className="mt-3">
          <button
            type="submit"
            className="rounded-full border border-red-300 bg-white px-5 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
          >
            Supprimer définitivement
          </button>
        </form>
      </section>
    </div>
  );
}
