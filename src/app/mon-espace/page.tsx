import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { clienteConnectee } from "@/lib/cliente-auth";
import { formatHeure, formatJour } from "@/lib/creneaux";
import { formatPrix, totalTarifs } from "@/lib/format";
import { deconnexionCliente } from "@/actions/espace-cliente";
import FormulaireLienConnexion from "@/components/FormulaireLienConnexion";
import BoutonAccordOffres from "@/components/BoutonAccordOffres";
import MesInformations from "@/components/MesInformations";
import BoutonAnnulation from "@/components/BoutonAnnulation";
import { annulationPossible, DELAI_ANNULATION_H } from "@/lib/annulation";
import RoueFidelite from "@/components/RoueFidelite";
import CarteSquad from "@/components/CarteSquad";
import { statutParrainage } from "@/lib/parrainage";
import { urlSite } from "@/lib/site";
import Vagues from "@/components/Vagues";
import { reglagesRoue } from "@/lib/parametres";
import {
  COULEUR_STATUT,
  LIBELLE_REMISE,
  LIBELLE_STATUT,
  MESSAGE_CLIENTE,
  totalCommande,
} from "@/lib/press-on";

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

const RETOURS_EMAIL: Record<string, { texte: string; classes: string }> = {
  ok: {
    texte: "Votre nouvelle adresse est confirmée : c'est elle qui reçoit désormais vos messages 🤍",
    classes: "bg-emerald-50 text-emerald-800",
  },
  expire: {
    texte:
      "Ce lien de confirmation n'est plus valable — il expire au bout de 30 minutes et ne sert qu'une fois. Relancez la demande depuis « Mes informations ».",
    classes: "bg-amber-50 text-amber-900",
  },
  occupee: {
    texte:
      "Cette adresse a été rattachée à une autre fiche entre-temps. Écrivez à Zélia pour qu'elle démêle la situation.",
    classes: "bg-red-50 text-red-700",
  },
};

export default async function MonEspace({
  searchParams,
}: {
  searchParams: Promise<{ lien?: string; email?: string }>;
}) {
  const clienteId = await clienteConnectee();
  const { lien, email: retourEmail } = await searchParams;

  if (!clienteId) {
    return (
      <>
        <section className="relative isolate overflow-hidden">
          <Vagues variante="bandeau" />
          <div className="mx-auto max-w-lg px-4 py-14 text-center sm:px-6">
            <h1 className="font-display text-3xl font-bold">Mon espace ✨</h1>
            <p className="mt-3 text-foreground/70">
              Retrouvez vos rendez-vous, l&rsquo;historique de vos poses et votre code de
              parrainage.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-lg px-4 pb-16 sm:px-6">
          {lien === "expire" && (
            <p className="mb-6 rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-900">
              Ce lien de connexion n&rsquo;est plus valable — les liens expirent au bout de 30
              minutes et ne servent qu&rsquo;une fois. Demandez-en un nouveau ci-dessous, c&rsquo;est
              immédiat.
            </p>
          )}

          <div className="rounded-3xl border border-pink-100 bg-white p-6 shadow-sm">
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
      </>
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
      avantages: {
        select: { id: true, type: true, code: true, utiliseLe: true },
        orderBy: { gagneLe: "desc" },
      },
      recompenses: { include: { lot: true }, orderBy: { gagneLe: "desc" } },
      commandes: { include: { modele: true }, orderBy: { creeLe: "desc" } },
    },
  });
  if (!cliente) return null;

  const maintenant = new Date();
  const aVenir = cliente.rendezVous
    .filter((r) => r.fin >= maintenant && r.statut !== "ANNULE")
    .reverse();
  const passes = cliente.rendezVous.filter((r) => r.fin < maintenant || r.statut === "ANNULE");
  const realises = cliente.rendezVous.filter((r) => r.statut === "TERMINE");
  const squad = await statutParrainage(cliente.id);

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

      {retourEmail && RETOURS_EMAIL[retourEmail] && (
        <p
          role="status"
          className={`rounded-2xl px-5 py-4 text-sm ${RETOURS_EMAIL[retourEmail].classes}`}
        >
          {RETOURS_EMAIL[retourEmail].texte}
        </p>
      )}

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
                    {/* Un horaire proposé n'attend pas la même chose qu'une
                        demande ordinaire : Zélia doit d'abord dire si elle peut. */}
                    {rdv.creneauPropose && rdv.statut === "EN_ATTENTE"
                      ? "Horaire proposé, en attente de réponse"
                      : statut.texte}
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
                {/* Tant que Zélia n'a pas confirmé, il n'y a rien à inscrire
                    dans un agenda : la demande peut encore ne pas aboutir. */}
                {rdv.statut === "CONFIRME" && (
                  <a
                    href={`/api/calendrier/${rdv.id}`}
                    className="mt-2 inline-block text-xs font-medium text-pink-600 hover:underline"
                  >
                    📅 Ajouter à mon calendrier
                  </a>
                )}
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

      {/* Commandes de press-on */}
      {cliente.commandes.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-bold">Mes press-on</h2>
          <div className="mt-3 grid gap-2">
            {cliente.commandes.map((commande) => {
              const total = totalCommande(commande);
              return (
                <div
                  key={commande.id}
                  className="rounded-2xl border border-pink-100 bg-white px-5 py-4 text-sm"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-semibold">{commande.modele.nom}</span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${COULEUR_STATUT[commande.statut]}`}
                    >
                      {LIBELLE_STATUT[commande.statut]}
                    </span>
                  </div>
                  <p className="mt-1 text-foreground/70">
                    {MESSAGE_CLIENTE[commande.statut]}
                  </p>
                  <p className="mt-2 flex flex-wrap justify-between gap-x-4 text-xs text-foreground/60">
                    <span>
                      {LIBELLE_REMISE[commande.modeRemise]}
                      {commande.modeRemise === "POSTAL" && commande.fraisPortCents === null
                        ? " — frais d'envoi à confirmer"
                        : ""}
                    </span>
                    <span className="font-medium text-pink-600">
                      {formatPrix(total.prixCents, total.aPartirDe)}
                    </span>
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Parrainage « Squad » */}
      <CarteSquad
        code={cliente.codeParrainage}
        lienSite={`${urlSite()}/reserver`}
        statut={squad}
        avantages={cliente.avantages}
        filleules={cliente.filleules}
      />

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

      {/* Informations personnelles */}
      <MesInformations
        prenom={cliente.prenom}
        nom={cliente.nom}
        telephone={cliente.telephone}
        email={cliente.email}
      />

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
          Vos coordonnées se corrigent depuis « Mes informations » ci-dessus. Pour la suppression de
          vos données, écrivez à Zelia.barreteaupro@outlook.fr.
        </p>
      </section>
    </div>
  );
}
