import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatPrix } from "@/lib/format";
import { formatJour } from "@/lib/creneaux";
import {
  COULEUR_STATUT,
  ETAPES,
  LIBELLE_REMISE,
  LIBELLE_STATUT,
  totalCommande,
} from "@/lib/press-on";
import {
  changerStatutCommande,
  enregistrerFraisPort,
  enregistrerNoteCommande,
} from "@/actions/admin-press-on";
import BoutonDemandePaiement from "@/components/BoutonDemandePaiement";

export const dynamic = "force-dynamic";

export default async function CommandePressOnDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const commande = await prisma.commandePressOn.findUnique({
    where: { id },
    include: { cliente: true, modele: true, images: true },
  });
  if (!commande) notFound();

  const total = totalCommande(commande);
  const postal = commande.modeRemise === "POSTAL";

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/press-on" className="text-sm text-pink-600 hover:underline">
          ← Toutes les commandes
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl font-bold">{commande.modele.nom}</h1>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${COULEUR_STATUT[commande.statut]}`}
          >
            {LIBELLE_STATUT[commande.statut]}
          </span>
        </div>
        <p className="mt-1 text-sm text-foreground/60">
          Commande reçue le {formatJour(commande.creeLe)}
        </p>
      </div>

      {/* La cliente */}
      <section className="rounded-2xl border border-pink-100 bg-white p-5">
        <h2 className="font-semibold">La cliente</h2>
        <p className="mt-2 text-sm">
          <Link
            href={`/admin/clientes/${commande.clienteId}`}
            className="font-medium text-pink-600 hover:underline"
          >
            {commande.cliente.prenom} {commande.cliente.nom}
          </Link>
          <br />
          {commande.cliente.telephone} · {commande.cliente.email}
        </p>
      </section>

      {/* Le set */}
      <section className="rounded-2xl border border-pink-100 bg-white p-5">
        <h2 className="font-semibold">Le set</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-foreground/60">Modèle</dt>
            <dd className="text-right font-medium">
              {commande.modele.nom}
              <span className="ml-2 font-normal text-foreground/60">
                {formatPrix(commande.prixCents, commande.aPartirDe)}
              </span>
            </dd>
          </div>
          {(commande.forme || commande.longueur) && (
            <div className="flex justify-between gap-4">
              <dt className="text-foreground/60">Forme · longueur</dt>
              <dd className="text-right">
                {commande.forme ?? "—"} · {commande.longueur ?? "—"}
              </dd>
            </div>
          )}
          {commande.mesures && (
            <div className="flex justify-between gap-4">
              <dt className="text-foreground/60">Mesures</dt>
              <dd className="max-w-xs text-right whitespace-pre-line">{commande.mesures}</dd>
            </div>
          )}
        </dl>

        {commande.inspiration && (
          <div className="mt-4 rounded-xl bg-pink-50 px-4 py-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-pink-500">
              Ses envies
            </p>
            <p className="mt-1 whitespace-pre-line text-foreground/85">{commande.inspiration}</p>
          </div>
        )}

        {commande.images.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {commande.images.map((image) => (
              <a key={image.id} href={image.url} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt="Inspiration de la cliente"
                  className="h-28 w-28 rounded-xl border border-pink-200 object-cover"
                />
              </a>
            ))}
          </div>
        )}
      </section>

      {/* Remise et règlement */}
      <section className="rounded-2xl border border-pink-100 bg-white p-5">
        <h2 className="font-semibold">Remise et règlement</h2>
        <p className="mt-2 text-sm text-foreground/70">{LIBELLE_REMISE[commande.modeRemise]}</p>
        {commande.adresse && (
          <p className="mt-2 whitespace-pre-line rounded-xl bg-pink-50 px-4 py-3 text-sm">
            {commande.adresse}
          </p>
        )}

        {postal && (
          <form action={enregistrerFraisPort} className="mt-4 flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={commande.id} />
            <label className="block text-sm">
              <span className="text-xs text-foreground/60">Frais d&rsquo;envoi (€)</span>
              <input
                name="fraisPortEuros"
                type="number"
                min={0}
                step="0.01"
                defaultValue={
                  commande.fraisPortCents === null ? "" : (commande.fraisPortCents / 100).toFixed(2)
                }
                placeholder="—"
                className="mt-1 w-28 rounded-xl border border-pink-200 px-3 py-2 text-right outline-none focus:border-pink-500"
              />
            </label>
            <button
              type="submit"
              className="rounded-full border border-pink-300 px-5 py-2 text-sm font-medium text-pink-600 transition hover:bg-pink-50"
            >
              Enregistrer
            </button>
            <span className="text-xs text-foreground/60">
              À annoncer avant la validation de la commande.
            </span>
          </form>
        )}

        <p className="mt-4 border-t border-pink-100 pt-4 text-sm">
          <span className="text-foreground/60">Total à régler : </span>
          <strong className="text-pink-600">
            {formatPrix(total.prixCents, total.aPartirDe)}
          </strong>
          {postal && commande.fraisPortCents === null && (
            <span className="ml-2 text-xs text-amber-700">(frais d&rsquo;envoi non chiffrés)</span>
          )}
        </p>
        <p className="mt-1 text-xs text-foreground/60">
          {commande.paiementDemandeLe
            ? `Demande de règlement envoyée le ${formatJour(commande.paiementDemandeLe)}.`
            : "Aucune demande de règlement envoyée."}
          {commande.paiementRecuLe && ` Réglée le ${formatJour(commande.paiementRecuLe)}.`}
        </p>

        <div className="mt-4">
          <BoutonDemandePaiement
            commandeId={commande.id}
            dejaEnvoye={commande.paiementDemandeLe !== null}
          />
        </div>
      </section>

      {/* Avancement */}
      <section className="rounded-2xl border border-pink-100 bg-white p-5">
        <h2 className="font-semibold">Avancement</h2>
        <p className="mt-1 text-xs text-foreground/60">
          Les press-on étant personnalisés, la fabrication commence une fois le règlement reçu. En
          passant à « Prête », la cliente reçoit un e-mail.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {ETAPES.map((etape) => (
            <form key={etape} action={changerStatutCommande.bind(null, commande.id, etape)}>
              <button
                type="submit"
                disabled={commande.statut === etape}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                  commande.statut === etape
                    ? "bg-pink-500 text-white"
                    : "border border-pink-200 text-pink-600 hover:bg-pink-50"
                }`}
              >
                {LIBELLE_STATUT[etape]}
              </button>
            </form>
          ))}
          <form action={changerStatutCommande.bind(null, commande.id, "ANNULEE")}>
            <button
              type="submit"
              disabled={commande.statut === "ANNULEE"}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                commande.statut === "ANNULEE"
                  ? "bg-neutral-300 text-white"
                  : "border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              Annuler
            </button>
          </form>
        </div>
      </section>

      {/* Note interne */}
      <section className="rounded-2xl border border-pink-100 bg-white p-5">
        <h2 className="font-semibold">Ma note</h2>
        <p className="mt-1 text-xs text-foreground/60">
          Visible de vous seule : références utilisées, ajustements, retours de la cliente.
        </p>
        <form action={enregistrerNoteCommande.bind(null, commande.id)} className="mt-3">
          <textarea
            name="note"
            rows={4}
            defaultValue={commande.note ?? ""}
            maxLength={2000}
            className="w-full rounded-xl border border-pink-200 px-4 py-2.5 text-sm outline-none focus:border-pink-500"
          />
          <button
            type="submit"
            className="mt-2 rounded-full bg-pink-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-pink-600"
          >
            Enregistrer
          </button>
        </form>
      </section>
    </div>
  );
}
