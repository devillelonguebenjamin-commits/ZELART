import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatHeure, formatJour } from "@/lib/creneaux";
import { formatPrix, totalTarifs } from "@/lib/format";
import Vagues from "@/components/Vagues";
import { REMISE_FILLEULE_POURCENT } from "@/lib/parrainage";
import { DELAI_ANNULATION_H } from "@/lib/annulation";
import { adresseRelanceAcompte, verifierAcompte } from "@/lib/acompte";
import { reglagesAcompte } from "@/lib/parametres";
import SuiviAcompte from "@/components/SuiviAcompte";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Demande envoyée · Zelart Nails",
  robots: { index: false },
};

export default async function Confirmation({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rendezVous = await prisma.rendezVous.findUnique({
    where: { id },
    include: {
      cliente: true,
      lignes: { include: { prestation: true }, orderBy: { ordre: "asc" } },
    },
  });
  if (!rendezVous) notFound();

  const total = totalTarifs(rendezVous.lignes.map((l) => l.prestation));

  // L'acompte en deux temps : tant qu'il n'est pas réglé, la page est une
  // étape à finir, avec le bouton de paiement ; une fois réglé — constaté
  // auprès de SumUp, jamais sur la seule foi d'un retour de page — elle dit que
  // la demande attend Zélia. C'est aussi ici que la cliente revient après avoir
  // payé : la vérification se fait donc à l'affichage, sans attendre la sonnette.
  const enCours = rendezVous.statut !== "ANNULE";
  let acompteRegle = rendezVous.acompteRegleLe !== null;
  if (enCours && rendezVous.acompteDemandeLe && !acompteRegle && rendezVous.acompteReference) {
    acompteRegle = (await verifierAcompte(rendezVous.id)) === "PAID";
  }
  const attenteAcompte = enCours && rendezVous.acompteDemandeLe !== null && !acompteRegle;
  const lienPaiement = attenteAcompte ? await adresseRelanceAcompte(rendezVous.id) : null;
  const { montantCents: montantAcompte } = await reglagesAcompte();

  const statut =
    rendezVous.statut === "ANNULE"
      ? { texte: "Annulé", classes: "bg-stone-200 text-stone-600" }
      : rendezVous.statut === "CONFIRME"
        ? { texte: "Confirmé", classes: "bg-emerald-100 text-emerald-800" }
        : rendezVous.creneauPropose
          ? { texte: "Horaire proposé, en attente de réponse", classes: "bg-amber-100 text-amber-800" }
          : attenteAcompte
            ? { texte: "En attente de votre acompte", classes: "bg-pink-100 text-pink-800" }
            : acompteRegle
              ? { texte: "Acompte reçu · en attente de confirmation", classes: "bg-emerald-100 text-emerald-800" }
              : { texte: "En attente de confirmation", classes: "bg-amber-100 text-amber-800" };

  return (
    <section className="relative isolate overflow-hidden">
      <Vagues />
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="rounded-3xl border border-pink-100 bg-white p-8 text-center shadow-sm sm:p-10">
          {attenteAcompte && <SuiviAcompte rendezVousId={rendezVous.id} />}
          <p className="text-5xl">{attenteAcompte ? "💳" : "🤍"}</p>
          <h1 className="font-display mt-4 text-3xl font-bold">
            {attenteAcompte ? "Plus qu’une étape !" : "Demande envoyée !"}
          </h1>
          <p className="mt-3 text-foreground/70">
            {attenteAcompte
              ? `Merci ${rendezVous.cliente.prenom}, votre demande est enregistrée. Réglez votre acompte pour la valider.`
              : `Merci ${rendezVous.cliente.prenom}, votre demande de rendez-vous a bien été enregistrée.`}
          </p>

          {attenteAcompte && (
            <div className="mt-6 rounded-2xl border-2 border-pink-300 bg-pink-50 p-6 text-left">
              <p className="font-semibold text-foreground">
                Réglez votre acompte de {formatPrix(montantAcompte)}
              </p>
              <p className="mt-1 text-sm text-foreground/75">
                Je confirme votre rendez-vous une fois l&rsquo;acompte reçu. Il est déduit du
                montant final, et perdu si vous ne prévenez pas au moins {DELAI_ANNULATION_H}&nbsp;h
                à l&rsquo;avance.
              </p>
              {lienPaiement && (
                <a
                  href={lienPaiement}
                  className="mt-4 inline-block rounded-full bg-pink-500 px-6 py-3 font-medium text-white shadow-sm transition hover:bg-pink-600"
                >
                  Régler mon acompte de {formatPrix(montantAcompte)}
                </a>
              )}
              <p className="mt-3 text-xs text-foreground/60">
                {lienPaiement ? "Le même lien vous a été envoyé par e-mail" : "Le lien de paiement vous a été envoyé par e-mail"}{" "}
                à {rendezVous.cliente.email} (pensez à regarder dans les indésirables). Paiement
                sécurisé par SumUp. Cette page se met à jour dès que le règlement est reçu.
              </p>
            </div>
          )}

          {acompteRegle && rendezVous.statut === "EN_ATTENTE" && (
            <p className="mt-6 rounded-2xl bg-emerald-50 px-5 py-4 text-left text-sm font-medium text-emerald-900">
              ✅ Acompte reçu, merci ! Votre demande est maintenant en attente de confirmation par
              Zélia. Vous recevrez un message dès qu&rsquo;elle l&rsquo;aura confirmée.
            </p>
          )}

          <div className="mt-8 rounded-2xl bg-pink-50 p-6 text-left">
            <dl className="space-y-3 text-sm">
              {rendezVous.lignes.map((ligne) => (
                <div key={ligne.id} className="flex justify-between gap-4">
                  <dt className="text-foreground/60">
                    {ligne.automatique ? "Dépose" : "Prestation"}
                  </dt>
                  <dd className="text-right font-medium">
                    {ligne.prestation.nom}
                    <span className="ml-2 font-normal text-foreground/60">
                      {formatPrix(ligne.prestation.prixCents, ligne.prestation.aPartirDe)}
                    </span>
                  </dd>
                </div>
              ))}
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
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statut.classes}`}>
                    {statut.texte}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-8 space-y-3 text-left text-sm leading-relaxed text-foreground/75">
            {rendezVous.creneauPropose && (
              <p className="rounded-2xl bg-sky-50 px-5 py-4 font-medium text-sky-900">
                ⏳ Cet horaire sort des créneaux habituels : je vous dis si je peux le prendre.
                Tant que je n&rsquo;ai pas répondu, le rendez-vous n&rsquo;est pas acquis.
              </p>
            )}
            <p>
              📱 Je vous envoie un <strong>message de confirmation</strong> au numéro indiqué (je
              ne réponds pas aux appels).
            </p>
            {!rendezVous.acompteDemandeLe && !acompteRegle && (
              <p>
                💳 S&rsquo;il s&rsquo;agit de votre premier rendez-vous, un{" "}
                <strong>acompte de {formatPrix(montantAcompte)}</strong> vous sera demandé via un lien
                de paiement SumUp pour valider la réservation. Il sera déduit du montant final.{" "}
                <strong>
                  Il est perdu si vous ne prévenez pas au moins {DELAI_ANNULATION_H}&nbsp;h à
                  l&rsquo;avance
                </strong>{" "}
                en cas d&rsquo;empêchement.
              </p>
            )}
            {rendezVous.remiseFilleule && (
              <p className="rounded-2xl bg-pink-50 px-5 py-4 font-medium text-pink-800">
                💕 Bienvenue dans la squad ! Vous bénéficiez de{" "}
                <strong>−{rendezVous.remiseFilleulePourcent ?? REMISE_FILLEULE_POURCENT} %</strong> sur cette première prestation, que je
                déduis au moment du règlement.
              </p>
            )}
            <p>🌸 Le règlement se fait sur place, en espèces ou par carte bancaire.</p>
          </div>

          {/* L'ajout au calendrier attend l'accord de Zélia : une demande
              inscrite dans l'agenda de la cliente passerait pour un rendez-vous
              acquis. Le lien part avec l'e-mail de confirmation. */}
          {rendezVous.statut === "CONFIRME" ? (
            <a
              href={`/api/calendrier/${rendezVous.id}`}
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-pink-600 hover:underline"
            >
              📅 Ajouter à mon calendrier
            </a>
          ) : (
            <p className="mt-6 text-sm text-foreground/60">
              📅 Vous pourrez ajouter le rendez-vous à votre calendrier dès que je
              l&rsquo;aurai confirmé. Le lien vous sera envoyé par e-mail.
            </p>
          )}

          <div>
            <Link
              href="/"
              className="mt-6 inline-block rounded-full bg-pink-500 px-8 py-3 font-medium text-white shadow-sm transition hover:bg-pink-600"
            >
              Retour à l&rsquo;accueil
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
