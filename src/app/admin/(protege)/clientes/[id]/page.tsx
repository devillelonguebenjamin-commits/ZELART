import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatHeure, formatJour } from "@/lib/creneaux";
import { formatPrix, totalTarifs } from "@/lib/format";
import { stockageConfigure } from "@/lib/blob";
import {
  COULEUR_STATUT,
  LIBELLE_REMISE,
  LIBELLE_STATUT,
  totalCommande,
} from "@/lib/press-on";
import FicheTechnique from "@/components/FicheTechnique";
import { enregistrerNotesCliente } from "@/actions/admin";
import {
  basculerConsentement,
  marquerRecompenseUtilisee,
  supprimerCliente,
} from "@/actions/clientes";

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
      parraine: { select: { id: true, prenom: true, nom: true } },
      recompenses: { include: { lot: true }, orderBy: { gagneLe: "desc" } },
      filleules: { select: { id: true, prenom: true, nom: true } },
      commandes: { include: { modele: true }, orderBy: { creeLe: "desc" } },
      rendezVous: {
        include: {
          lignes: { include: { prestation: true }, orderBy: { ordre: "asc" } },
          realisations: { orderBy: { creeLe: "asc" } },
        },
        orderBy: { debut: "desc" },
      },
    },
  });
  if (!cliente) notFound();

  const stockagePret = stockageConfigure();

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

      {cliente.recompenses.length > 0 && (
        <section className="rounded-2xl border border-pink-100 bg-white p-5">
          <h2 className="font-semibold">Récompenses gagnées à la roue</h2>
          <p className="mt-1 text-xs text-foreground/60">
            La cliente présente son code ; marquez la récompense comme utilisée une fois honorée.
          </p>
          <div className="mt-3 grid gap-2">
            {cliente.recompenses.map((recompense) => (
              <div
                key={recompense.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-pink-50 px-4 py-2.5 text-sm"
              >
                <span className={recompense.utiliseLe ? "text-foreground/50 line-through" : "font-medium"}>
                  {recompense.lot.libelle}
                </span>
                <span className="font-mono text-xs">{recompense.code}</span>
                <span className="text-xs text-foreground/60">
                  {recompense.utiliseLe
                    ? `utilisée le ${formatJour(recompense.utiliseLe)}`
                    : `gagnée le ${formatJour(recompense.gagneLe)}`}
                </span>
                <form action={marquerRecompenseUtilisee.bind(null, recompense.id, !recompense.utiliseLe)}>
                  <button
                    type="submit"
                    className="rounded-full border border-pink-300 bg-white px-3 py-1 text-xs font-medium text-pink-600 transition hover:bg-pink-100"
                  >
                    {recompense.utiliseLe ? "Annuler" : "Marquer utilisée"}
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      {cliente.commandes.length > 0 && (
        <section className="rounded-2xl border border-pink-100 bg-white p-5">
          <h2 className="font-semibold">Commandes de press-on</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {cliente.commandes.map((commande) => {
              const total = totalCommande(commande);
              return (
                <li key={commande.id}>
                  <Link
                    href={`/admin/press-on/${commande.id}`}
                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-xl border border-pink-50 px-4 py-2 transition hover:border-pink-200"
                  >
                    <span className="font-medium">{commande.modele.nom}</span>
                    <span className="text-xs text-foreground/60">
                      {formatJour(commande.creeLe)} · {LIBELLE_REMISE[commande.modeRemise]}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${COULEUR_STATUT[commande.statut]}`}
                    >
                      {LIBELLE_STATUT[commande.statut]}
                    </span>
                    <span className="font-medium text-pink-600">
                      {formatPrix(total.prixCents, total.aPartirDe)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="rounded-2xl border border-pink-100 bg-white p-5">
        <h2 className="font-semibold">Parrainage</h2>
        <p className="mt-1 text-sm text-foreground/70">
          Son code : <code className="font-semibold text-pink-600">{cliente.codeParrainage}</code>
          {cliente.parraine && (
            <>
              {" · "}Parrainée par{" "}
              <Link
                href={`/admin/clientes/${cliente.parraine.id}`}
                className="font-medium text-pink-600 hover:underline"
              >
                {cliente.parraine.prenom} {cliente.parraine.nom}
              </Link>
            </>
          )}
        </p>
        {cliente.filleules.length > 0 && (
          <p className="mt-2 text-sm text-foreground/70">
            A fait venir {cliente.filleules.length} personne
            {cliente.filleules.length > 1 ? "s" : ""} :{" "}
            {cliente.filleules.map((f, i) => (
              <span key={f.id}>
                {i > 0 && ", "}
                <Link
                  href={`/admin/clientes/${f.id}`}
                  className="font-medium text-pink-600 hover:underline"
                >
                  {f.prenom} {f.nom}
                </Link>
              </span>
            ))}
          </p>
        )}
      </section>

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
        <h2 className="font-semibold">Commentaire</h2>
        <p className="mt-1 text-xs text-foreground/60">
          Allergies, préférences, particularités des ongles… visibles uniquement par vous. Ce
          commentaire est aussi modifiable directement depuis la liste des clientes.
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
            <div key={rdv.id} className="rounded-2xl border border-pink-100 bg-white px-5 py-3 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="capitalize">
                  {formatJour(rdv.debut)} · {formatHeure(rdv.debut)}
                </span>
                <span>{rdv.lignes.map((l) => l.prestation.nom).join(" + ")}</span>
                <span className="font-medium text-pink-600">
                  {(() => {
                    const t = totalTarifs(rdv.lignes.map((l) => l.prestation));
                    return formatPrix(t.prixCents, t.aPartirDe);
                  })()}
                </span>
                <span className="text-foreground/60">
                  {LIBELLES_STATUT[rdv.statut] ?? rdv.statut}
                </span>
              </div>
              <FicheTechnique
                rendezVousId={rdv.id}
                forme={rdv.forme}
                longueur={rdv.longueur}
                produits={rdv.produits}
                noteTechnique={rdv.noteTechnique}
                realisations={rdv.realisations.map((r) => ({
                  id: r.id,
                  url: r.url,
                  publiee: r.publiee,
                }))}
                stockagePret={stockagePret}
              />
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
          Supprime définitivement {cliente.prenom} {cliente.nom}, ses coordonnées, ses notes, ses{" "}
          {cliente.rendezVous.length} rendez-vous
          {cliente.commandes.length > 0 &&
            ` et ses ${cliente.commandes.length} commande${cliente.commandes.length > 1 ? "s" : ""} de press-on`}
          . Cette action est irréversible et répond aux demandes de suppression de données.
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
