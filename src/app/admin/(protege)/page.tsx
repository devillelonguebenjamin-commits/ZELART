import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatHeure, formatJour } from "@/lib/creneaux";
import { formatPrix, totalTarifs } from "@/lib/format";
import { changerStatutRendezVous, marquerAcompteRegle, renvoyerLienAcompte } from "@/actions/admin";
import { supprimerListeAttente } from "@/actions/liste-attente";
import { reglagesAcompte } from "@/lib/parametres";
import type { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

type RdvComplet = Prisma.RendezVousGetPayload<{
  include: {
    cliente: true;
    inspirations: true;
    lignes: { include: { prestation: true } };
  };
}>;

const LIBELLE_ETAT: Record<string, string> = {
  NATUREL: "ongles nus",
  POSE_ZELART: "pose Zelart",
  POSE_EXTERIEURE: "pose faite ailleurs",
};

const LIBELLE_POSE: Record<string, string> = {
  VSP: "vernis semi-permanent",
  GAINAGE: "gainage",
  GEL_X: "Gel X",
  POP_IT: "Pop-it",
};

const BADGES: Record<string, { label: string; classes: string }> = {
  EN_ATTENTE: { label: "En attente", classes: "bg-amber-100 text-amber-800" },
  CONFIRME: { label: "Confirmé", classes: "bg-emerald-100 text-emerald-800" },
  ANNULE: { label: "Annulé", classes: "bg-stone-200 text-stone-600" },
  TERMINE: { label: "Terminé", classes: "bg-sky-100 text-sky-800" },
  NO_SHOW: { label: "Absente", classes: "bg-red-100 text-red-700" },
};

function BoutonStatut({ id, statut, label }: { id: string; statut: string; label: string }) {
  return (
    <form action={changerStatutRendezVous.bind(null, id, statut)}>
      <button
        type="submit"
        className="rounded-full border border-pink-200 px-3 py-1 text-xs font-medium text-pink-600 transition hover:bg-pink-50"
      >
        {label}
      </button>
    </form>
  );
}

function CarteRdv({
  rdv,
  nouvelle,
  lienAcompteConfigure,
}: {
  rdv: RdvComplet;
  nouvelle: boolean;
  lienAcompteConfigure: boolean;
}) {
  const badge = BADGES[rdv.statut] ?? BADGES.EN_ATTENTE;
  const totalRdv = totalTarifs(rdv.lignes.map((l) => l.prestation));
  return (
    <div className="rounded-2xl border border-pink-100 bg-white px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold capitalize">
          {formatJour(rdv.debut)} · {formatHeure(rdv.debut)}
        </p>
        <span className="flex flex-wrap items-center gap-2">
          {nouvelle && (
            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-800">
              Nouvelle cliente
            </span>
          )}
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.classes}`}>
            {badge.label}
          </span>
        </span>
      </div>
      <ul className="mt-1 text-sm">
        {rdv.lignes.map((ligne) => (
          <li key={ligne.id}>
            {ligne.prestation.nom}
            {ligne.automatique && <span className="text-foreground/50"> (dépose ajoutée)</span>} —{" "}
            <span className="font-medium text-pink-600">
              {formatPrix(ligne.prestation.prixCents, ligne.prestation.aPartirDe)}
            </span>
          </li>
        ))}
        {rdv.lignes.length > 1 && (
          <li className="mt-0.5 font-semibold">
            Total —{" "}
            <span className="text-pink-600">
              {formatPrix(totalRdv.prixCents, totalRdv.aPartirDe)}
            </span>
          </li>
        )}
      </ul>
      {rdv.etatOngles && (
        <p className="mt-1 text-xs text-foreground/60">
          Ongles à l&rsquo;arrivée : {LIBELLE_ETAT[rdv.etatOngles]}
          {rdv.typePoseActuel ? ` (${LIBELLE_POSE[rdv.typePoseActuel]})` : ""}
        </p>
      )}
      <p className="mt-1 text-sm text-foreground/70">
        <Link href={`/admin/clientes/${rdv.cliente.id}`} className="font-medium text-pink-600 hover:underline">
          {rdv.cliente.prenom} {rdv.cliente.nom}
        </Link>{" "}
        · <a href={`tel:${rdv.cliente.telephone}`} className="hover:underline">{rdv.cliente.telephone}</a>{" "}
        · <a href={`mailto:${rdv.cliente.email}`} className="hover:underline">{rdv.cliente.email}</a>
      </p>
      {rdv.noteCliente && (
        <p className="mt-2 rounded-xl bg-pink-50 px-4 py-2 text-sm text-foreground/80">
          💬 {rdv.noteCliente}
        </p>
      )}
      {(rdv.inspiration || rdv.inspirations.length > 0) && (
        <div className="mt-2 rounded-xl bg-pink-50 px-4 py-3 text-sm text-foreground/80">
          <p className="text-xs font-semibold uppercase tracking-wide text-pink-500">Inspiration</p>
          {rdv.inspiration && <p className="mt-1">{rdv.inspiration}</p>}
          {rdv.inspirations.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {rdv.inspirations.map((image) => (
                <a key={image.id} href={image.url} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.url}
                    alt="Inspiration de la cliente"
                    className="h-24 w-24 rounded-xl border border-pink-200 object-cover transition hover:opacity-90"
                  />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
      {nouvelle && rdv.statut !== "ANNULE" && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-violet-50 px-4 py-2 text-sm">
          {rdv.acompteRegleLe ? (
            <span className="font-medium text-violet-900">
              💳 Acompte reçu le {formatJour(rdv.acompteRegleLe)}
            </span>
          ) : (
            <>
              <span className="text-violet-900">
                {rdv.acompteDemandeLe
                  ? `💳 Lien d'acompte envoyé le ${formatJour(rdv.acompteDemandeLe)} — en attente de paiement`
                  : "💳 Acompte à demander"}
              </span>
              <form action={marquerAcompteRegle.bind(null, rdv.id, true)}>
                <button
                  type="submit"
                  className="rounded-full border border-violet-300 bg-white px-3 py-1 text-xs font-medium text-violet-700 transition hover:bg-violet-100"
                >
                  Acompte reçu
                </button>
              </form>
              {lienAcompteConfigure && (
                <form action={renvoyerLienAcompte.bind(null, rdv.id)}>
                  <button
                    type="submit"
                    className="rounded-full border border-violet-300 bg-white px-3 py-1 text-xs font-medium text-violet-700 transition hover:bg-violet-100"
                  >
                    {rdv.acompteDemandeLe ? "Renvoyer le lien" : "Envoyer le lien"}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {rdv.statut === "EN_ATTENTE" && (
          <>
            <BoutonStatut id={rdv.id} statut="CONFIRME" label="✓ Confirmer" />
            <BoutonStatut id={rdv.id} statut="ANNULE" label="✕ Annuler" />
          </>
        )}
        {rdv.statut === "CONFIRME" && (
          <>
            <BoutonStatut id={rdv.id} statut="TERMINE" label="Terminé" />
            <BoutonStatut id={rdv.id} statut="NO_SHOW" label="Absente" />
            <BoutonStatut id={rdv.id} statut="ANNULE" label="✕ Annuler" />
          </>
        )}
        {(rdv.statut === "ANNULE" || rdv.statut === "NO_SHOW") && (
          <BoutonStatut id={rdv.id} statut="CONFIRME" label="Réactiver" />
        )}
      </div>
    </div>
  );
}

export default async function Agenda() {
  const maintenant = new Date();
  const ilYa14Jours = new Date(maintenant.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [rdvs, acompte, listeAttente] = await Promise.all([
    prisma.rendezVous.findMany({
      where: { debut: { gte: ilYa14Jours } },
      include: {
        cliente: true,
        inspirations: true,
        lignes: { include: { prestation: true }, orderBy: { ordre: "asc" } },
      },
      orderBy: { debut: "asc" },
    }),
    reglagesAcompte(),
    prisma.listeAttente.findMany({ where: { notifieeLe: null }, orderBy: { creeLe: "asc" } }),
  ]);

  // Une cliente est nouvelle si elle n'a aucun autre rendez-vous actif.
  const comptes = await prisma.rendezVous.groupBy({
    by: ["clienteId"],
    where: { statut: { not: "ANNULE" } },
    _count: { _all: true },
  });
  const nbParCliente = new Map(comptes.map((c) => [c.clienteId, c._count._all]));
  const estNouvelle = (rdv: RdvComplet) =>
    rdv.statut !== "ANNULE" && (nbParCliente.get(rdv.clienteId) ?? 0) <= 1;

  const enAttente = rdvs.filter((r) => r.statut === "EN_ATTENTE" && r.fin >= maintenant);
  const aVenir = rdvs.filter((r) => r.statut === "CONFIRME" && r.fin >= maintenant);
  const passes = rdvs.filter((r) => r.fin < maintenant).reverse();

  return (
    <div className="space-y-10">
      <section>
        <h1 className="font-display text-2xl font-bold">
          Demandes à confirmer{" "}
          {enAttente.length > 0 && (
            <span className="ml-1 rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800 align-middle">
              {enAttente.length}
            </span>
          )}
        </h1>
        <p className="mt-1 text-sm text-foreground/60">
          Pensez à envoyer le lien SumUp de l&rsquo;acompte aux nouvelles clientes avant de confirmer.
        </p>
        <div className="mt-4 grid gap-3">
          {enAttente.length === 0 ? (
            <p className="rounded-2xl bg-pink-50 px-5 py-4 text-sm text-foreground/70">
              Aucune demande en attente 🤍
            </p>
          ) : (
            enAttente.map((rdv) => <CarteRdv
                key={rdv.id}
                rdv={rdv}
                nouvelle={estNouvelle(rdv)}
                lienAcompteConfigure={Boolean(acompte.lien)}
              />)
          )}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl font-bold">
          Liste d&rsquo;attente{" "}
          {listeAttente.length > 0 && (
            <span className="ml-1 rounded-full bg-pink-100 px-3 py-1 text-sm font-semibold text-pink-800 align-middle">
              {listeAttente.length}
            </span>
          )}
        </h2>
        <p className="mt-1 text-sm text-foreground/60">
          Prévenues automatiquement par e-mail dès qu&rsquo;un rendez-vous est annulé.
        </p>
        <div className="mt-4 grid gap-3">
          {listeAttente.length === 0 ? (
            <p className="rounded-2xl bg-pink-50 px-5 py-4 text-sm text-foreground/70">
              Personne en attente pour le moment.
            </p>
          ) : (
            listeAttente.map((personne) => (
              <div
                key={personne.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-pink-100 bg-white px-5 py-3"
              >
                <div className="text-sm">
                  <p className="font-medium">
                    {personne.prenom} ·{" "}
                    <a href={`mailto:${personne.email}`} className="hover:underline">
                      {personne.email}
                    </a>
                    {personne.telephone && (
                      <>
                        {" "}
                        ·{" "}
                        <a href={`tel:${personne.telephone}`} className="hover:underline">
                          {personne.telephone}
                        </a>
                      </>
                    )}
                  </p>
                  {personne.note && <p className="mt-0.5 text-foreground/70">{personne.note}</p>}
                  <p className="mt-0.5 text-xs text-foreground/50">
                    Depuis le {formatJour(personne.creeLe)}
                  </p>
                </div>
                <form action={supprimerListeAttente.bind(null, personne.id)}>
                  <button
                    type="submit"
                    className="rounded-full border border-pink-200 px-3 py-1 text-xs font-medium text-pink-600 transition hover:bg-pink-50"
                  >
                    Retirer
                  </button>
                </form>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl font-bold">Rendez-vous confirmés à venir</h2>
        <div className="mt-4 grid gap-3">
          {aVenir.length === 0 ? (
            <p className="rounded-2xl bg-pink-50 px-5 py-4 text-sm text-foreground/70">
              Aucun rendez-vous confirmé à venir.
            </p>
          ) : (
            aVenir.map((rdv) => <CarteRdv
                key={rdv.id}
                rdv={rdv}
                nouvelle={estNouvelle(rdv)}
                lienAcompteConfigure={Boolean(acompte.lien)}
              />)
          )}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl font-bold">Passés récents (14 jours)</h2>
        <div className="mt-4 grid gap-3">
          {passes.length === 0 ? (
            <p className="rounded-2xl bg-pink-50 px-5 py-4 text-sm text-foreground/70">
              Rien sur les 14 derniers jours.
            </p>
          ) : (
            passes.map((rdv) => <CarteRdv
                key={rdv.id}
                rdv={rdv}
                nouvelle={estNouvelle(rdv)}
                lienAcompteConfigure={Boolean(acompte.lien)}
              />)
          )}
        </div>
      </section>
    </div>
  );
}
