import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatHeure, formatJour } from "@/lib/creneaux";
import { formatPrix, totalTarifs } from "@/lib/format";
import {
  changerStatutRendezVous,
  marquerAcompteRegle,
  renvoyerLienAcompte,
} from "@/actions/admin";
import { supprimerListeAttente } from "@/actions/liste-attente";
import { marquerAvantageUtilise } from "@/actions/avantages";
import { LIBELLE_AVANTAGE, REMISE_FILLEULE_POURCENT } from "@/lib/parrainage";
import ValidationVenue from "@/components/ValidationVenue";
import type { TypeAvantage } from "@/generated/prisma/client";
import { reglagesAcompte } from "@/lib/parametres";
import type { Prisma } from "@/generated/prisma/client";
import { bornesMois, grilleMois, moisDemande, type EvenementJour } from "@/lib/calendrier";
import { jourParis, ouvertureActive } from "@/lib/creneaux";
import CalendrierMois from "@/components/CalendrierMois";
import FormulaireRdvManuel from "@/components/FormulaireRdvManuel";
import FormulaireCreneauPerso from "@/components/FormulaireCreneauPerso";
import AnnulationAvecMessage from "@/components/AnnulationAvecMessage";
import { getCreneauxDisponibles, type Creneau } from "@/lib/creneaux";

const JOUR_MS = 24 * 60 * 60 * 1000;

/**
 * Un congé par journée qu'il recouvre.
 *
 * Un événement rangé sur son seul jour de départ laisserait le reste de la
 * semaine bloquée en apparence libre — exactement l'erreur qu'un calendrier est
 * censé empêcher.
 */
function joursCouverts(
  conge: { id: string; debut: Date; fin: Date; motif: string | null },
  bornes: { debut: Date; fin: Date }
): EvenementJour[] {
  const evenements: EvenementJour[] = [];
  const depart = new Date(Math.max(conge.debut.getTime(), bornes.debut.getTime()));
  const arrivee = new Date(Math.min(conge.fin.getTime(), bornes.fin.getTime()));

  // Ancre à midi : insensible aux changements d'heure, comme partout ailleurs.
  let curseur = new Date(depart.getTime());
  const vus = new Set<string>();
  while (curseur < arrivee && vus.size < 62) {
    const cle = jourParis(curseur);
    if (!vus.has(cle)) {
      vus.add(cle);
      evenements.push({
        id: `${conge.id}-${cle}`,
        debut: curseur,
        fin: conge.fin,
        titre: conge.motif ?? "Congé",
        statut: "ANNULE",
        indisponible: true,
        // Se retire depuis l'onglet Congés : autant y mener directement, plutôt
        // que de laisser chercher où l'on annule ce qu'on vient de poser.
        lien: "/admin/conges",
      });
    }
    curseur = new Date(curseur.getTime() + JOUR_MS);
  }
  return evenements;
}

export const dynamic = "force-dynamic";

type RdvComplet = Prisma.RendezVousGetPayload<{
  include: {
    cliente: { include: { parraine: { select: { prenom: true } } } };
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

type AvantageEnAttente = { id: string; type: TypeAvantage; code: string };

function CarteRdv({
  rdv,
  nouvelle,
  lienAcompteConfigure,
  avantages,
  creneauxLibres,
}: {
  rdv: RdvComplet;
  nouvelle: boolean;
  lienAcompteConfigure: boolean;
  avantages: AvantageEnAttente[];
  creneauxLibres: Creneau[];
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
          {rdv.creneauPropose && (
            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-900">
              Horaire proposé
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

      {(rdv.remiseFilleule || avantages.length > 0) && rdv.statut !== "ANNULE" && (
        <div className="mt-2 rounded-xl bg-pink-50 px-4 py-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-pink-500">
            À déduire à l&rsquo;encaissement
          </p>
          {rdv.remiseFilleule && (
            <p className="mt-1 font-medium text-pink-800">
              💕 −{rdv.remiseFilleulePourcent ?? REMISE_FILLEULE_POURCENT} % — première prestation d&rsquo;une filleule
            </p>
          )}
          {avantages.map((avantage) => (
            <div key={avantage.id} className="mt-1 flex flex-wrap items-center gap-2">
              <span className="font-medium text-pink-800">
                🎁 {LIBELLE_AVANTAGE[avantage.type]}
              </span>
              <code className="rounded bg-white px-2 py-0.5 text-xs text-pink-700">
                {avantage.code}
              </code>
              <form action={marquerAvantageUtilise.bind(null, avantage.id, true)}>
                <button
                  type="submit"
                  className="rounded-full border border-pink-300 bg-white px-3 py-1 text-xs font-medium text-pink-700 transition hover:bg-pink-100"
                >
                  Utilisé
                </button>
              </form>
            </div>
          ))}
        </div>
      )}

      {rdv.statut === "ANNULE" && (
        <p className="mt-2 text-xs text-foreground/60">
          {rdv.annulationNotifieeLe
            ? `✉️ Cliente prévenue le ${formatJour(rdv.annulationNotifieeLe)}`
            : "Annulé sans message à la cliente."}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {rdv.statut === "EN_ATTENTE" &&
          (rdv.creneauPropose ? (
            // Horaire proposé par la cliente : le refus lui répond, là où
            // l'annulation ordinaire se contente de libérer le créneau.
            <>
              <BoutonStatut id={rdv.id} statut="CONFIRME" label="✓ Accepter l’horaire" />
              <AnnulationAvecMessage
                rendezVousId={rdv.id}
                confirme={false}
                creneauxLibres={creneauxLibres}
              />
            </>
          ) : (
            <>
              <BoutonStatut id={rdv.id} statut="CONFIRME" label="✓ Confirmer" />
              <AnnulationAvecMessage
                rendezVousId={rdv.id}
                confirme={false}
                creneauxLibres={creneauxLibres}
              />
            </>
          ))}
        {/* Position unique, quel que soit le statut : la validation fait passer
            le rendez-vous de « confirmé » à « terminé », et un composant qui
            changerait de branche serait démonté puis remonté — le message
            annonçant le palier débloqué disparaîtrait avant d'être lu. */}
        {(rdv.statut === "CONFIRME" || rdv.statut === "TERMINE") && (
          <ValidationVenue
            rendezVousId={rdv.id}
            prenomMarraine={rdv.cliente.parraine?.prenom}
            dejaValide={rdv.statut === "TERMINE"}
            commentaire={rdv.commentaireVisite}
          />
        )}
        {rdv.statut === "CONFIRME" && (
          <>
            <BoutonStatut id={rdv.id} statut="NO_SHOW" label="Absente" />
            <AnnulationAvecMessage
              rendezVousId={rdv.id}
              confirme
              creneauxLibres={creneauxLibres}
            />
          </>
        )}
        {(rdv.statut === "ANNULE" || rdv.statut === "NO_SHOW") && (
          <BoutonStatut id={rdv.id} statut="CONFIRME" label="Réactiver" />
        )}
      </div>
    </div>
  );
}

export default async function Agenda({
  searchParams,
}: {
  searchParams: Promise<{ mois?: string }>;
}) {
  const maintenant = new Date();
  const ilYa14Jours = new Date(maintenant.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Le calendrier montre le mois demandé, les listes restent centrées sur
  // l'actualité : naviguer en juin ne doit pas vider « Demandes à confirmer ».
  const { mois: moisDemandeCle } = await searchParams;
  const { annee, mois } = moisDemande(moisDemandeCle);
  const bornes = bornesMois(annee, mois);

  const [rdvs, acompte, listeAttente, avantagesEnAttente, rdvsDuMois, congesDuMois, clientes, catalogue, ouvertures, creneauxLibres] =
    await Promise.all([
      prisma.rendezVous.findMany({
        where: { debut: { gte: ilYa14Jours } },
        include: {
          cliente: { include: { parraine: { select: { prenom: true } } } },
          inspirations: true,
          lignes: { include: { prestation: true }, orderBy: { ordre: "asc" } },
        },
        orderBy: { debut: "asc" },
      }),
      reglagesAcompte(),
      prisma.listeAttente.findMany({ where: { notifieeLe: null }, orderBy: { creeLe: "asc" } }),
      prisma.avantageParrainage.findMany({
        where: { utiliseLe: null },
        select: { id: true, clienteId: true, type: true, code: true },
      }),
      prisma.rendezVous.findMany({
        where: { debut: { gte: bornes.debut, lt: bornes.fin } },
        select: {
          id: true,
          debut: true,
          fin: true,
          statut: true,
          cliente: { select: { id: true, prenom: true, nom: true } },
          lignes: { select: { prestation: { select: { nom: true } } }, orderBy: { ordre: "asc" } },
        },
      }),
      prisma.indisponibilite.findMany({
        where: { debut: { lt: bornes.fin }, fin: { gt: bornes.debut } },
      }),
      prisma.cliente.findMany({
        where: { bloqueeLe: null },
        select: { id: true, prenom: true, nom: true, telephone: true },
        orderBy: [{ nom: "asc" }, { prenom: "asc" }],
      }),
      prisma.prestation.findMany({
        where: { active: true },
        select: { id: true, nom: true, categorie: true, dureeMin: true, prixCents: true, aPartirDe: true },
        orderBy: { ordre: "asc" },
      }),
      prisma.disponibilite.findMany(),
      getCreneauxDisponibles(),
    ]);

  // Jours de repos : aucune ouverture ne s'applique. Les hachures du calendrier
  // le disent d'un coup d'œil, là où l'absence de rendez-vous ne distingue pas
  // un jour fermé d'un jour creux.
  const ouvertLe = (cleJour: string) => {
    const [a, m, j] = cleJour.split("-").map(Number);
    const jourSemaine = ((new Date(Date.UTC(a, m - 1, j, 12)).getUTCDay() + 6) % 7) + 1;
    return ouvertures.some((o) => o.jourSemaine === jourSemaine && ouvertureActive(o, cleJour));
  };

  // Demain 9 h : la valeur qu'on corrige le moins souvent.
  const demain = new Date(maintenant.getTime() + JOUR_MS);
  const dateParDefaut = `${jourParis(demain)}T09:00`;

  const grille = grilleMois(annee, mois, [
    ...rdvsDuMois.map((r) => ({
      id: r.id,
      debut: r.debut,
      fin: r.fin,
      titre: `${r.cliente.prenom} ${r.cliente.nom.slice(0, 1)}.`,
      soustitre: r.lignes.map((l) => l.prestation.nom).join(" + ") || undefined,
      statut: r.statut,
      lien: `/admin/clientes/${r.cliente.id}`,
    })),
    // Les congés couvrent souvent plusieurs jours : on en pose un par journée
    // touchée, sinon une semaine bloquée n'apparaîtrait que dans sa case de
    // départ et le reste semblerait libre.
    ...congesDuMois.flatMap((conge) => joursCouverts(conge, bornes)),
  ], ouvertLe);
  // Regroupés par cliente : chaque carte de rendez-vous rappelle ce qui reste
  // à appliquer, sinon Zélia devrait ouvrir la fiche pour le savoir.
  const avantagesParCliente = new Map<string, typeof avantagesEnAttente>();
  for (const avantage of avantagesEnAttente) {
    const liste = avantagesParCliente.get(avantage.clienteId) ?? [];
    liste.push(avantage);
    avantagesParCliente.set(avantage.clienteId, liste);
  }

  // Une cliente est nouvelle si elle n'a aucun autre rendez-vous actif.
  const comptes = await prisma.rendezVous.groupBy({
    by: ["clienteId"],
    where: { statut: { not: "ANNULE" } },
    _count: { _all: true },
  });
  const nbParCliente = new Map(comptes.map((c) => [c.clienteId, c._count._all]));
  const estNouvelle = (rdv: RdvComplet) =>
    rdv.statut !== "ANNULE" && (nbParCliente.get(rdv.clienteId) ?? 0) <= 1;

  // La date seule décide de la section, jamais le statut — deux raisons :
  // un rendez-vous validé avant son heure de fin resterait sinon introuvable,
  // et un rendez-vous futur annulé par erreur le devenait déjà, son bouton
  // « Réactiver » étant alors hors d'atteinte. Chaque rendez-vous apparaît
  // ainsi exactement une fois, son badge disant où il en est.
  const enAttente = rdvs.filter((r) => r.statut === "EN_ATTENTE" && r.fin >= maintenant);
  const aVenir = rdvs.filter((r) => r.statut !== "EN_ATTENTE" && r.fin >= maintenant);
  const passes = rdvs.filter((r) => r.fin < maintenant).reverse();

  return (
    <div className="space-y-10">
      <section>
        <div className="mb-4 flex flex-wrap items-start gap-3">
          <FormulaireRdvManuel
            clientes={clientes}
            prestations={catalogue}
            dateParDefaut={dateParDefaut}
          />
          <FormulaireCreneauPerso dateParDefaut={dateParDefaut} />
        </div>
        <CalendrierMois grille={grille} />
      </section>

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
                avantages={avantagesParCliente.get(rdv.clienteId) ?? []}
                creneauxLibres={creneauxLibres}
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
        <h2 className="font-display text-2xl font-bold">Rendez-vous à venir</h2>
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
                avantages={avantagesParCliente.get(rdv.clienteId) ?? []}
                creneauxLibres={creneauxLibres}
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
                avantages={avantagesParCliente.get(rdv.clienteId) ?? []}
                creneauxLibres={creneauxLibres}
              />)
          )}
        </div>
      </section>
    </div>
  );
}
