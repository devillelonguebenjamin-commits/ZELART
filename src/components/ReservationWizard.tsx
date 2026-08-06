"use client";

import { useActionState, useMemo, useState } from "react";
import { creerReservation, type EtatReservation } from "@/actions/reservation";
import ListeAttenteForm from "@/components/ListeAttenteForm";
import type { Creneau } from "@/lib/creneaux";
import { formatDuree, formatPrix, totalDuree, totalTarifs } from "@/lib/format";
import {
  aUnePose,
  deposeNecessaire,
  ETATS_ONGLES,
  motifDepose,
  prestationProposee,
  remplissageAutorise,
  trouverDepose,
  TYPES_POSE,
} from "@/lib/regles";
import type { EtatOngles, TypeActe, TypePose } from "@/generated/prisma/client";
import ChampInspiration from "@/components/ChampInspiration";

export type PrestationPublique = {
  id: string;
  nom: string;
  categorie: string;
  description: string | null;
  dureeMin: number;
  prixCents: number;
  aPartirDe: boolean;
  typeActe: TypeActe;
  typePose: TypePose;
};

type Props = {
  prestations: PrestationPublique[];
  creneaux: Creneau[];
  envoiImagesActif: boolean;
};

const etapes = ["Vos ongles", "Prestation", "Créneau", "Coordonnées"] as const;

export default function ReservationWizard({ prestations, creneaux, envoiImagesActif }: Props) {
  const [etape, setEtape] = useState(0);
  const [etatOngles, setEtatOngles] = useState<EtatOngles | null>(null);
  const [typePoseActuel, setTypePoseActuel] = useState<TypePose | null>(null);
  const [choisies, setChoisies] = useState<string[]>([]);
  const [creneauChoisi, setCreneauChoisi] = useState<Creneau | null>(null);
  const [etat, formAction, enCours] = useActionState<EtatReservation, FormData>(
    creerReservation,
    {}
  );

  function choisirEtat(nouvelEtat: EtatOngles) {
    setEtatOngles(nouvelEtat);
    // Ongles nus : aucune pose actuelle à déclarer.
    if (nouvelEtat === "NATUREL") setTypePoseActuel(null);
  }

  const disponibles = useMemo(
    () => prestations.filter((p) => prestationProposee(p, etatOngles, typePoseActuel)),
    [prestations, etatOngles, typePoseActuel]
  );

  const categories = useMemo(() => {
    const groupes = new Map<string, PrestationPublique[]>();
    for (const p of disponibles) {
      const groupe = groupes.get(p.categorie);
      if (groupe) groupe.push(p);
      else groupes.set(p.categorie, [p]);
    }
    return [...groupes.entries()];
  }, [disponibles]);

  // Les prestations devenues incompatibles (retour en arrière) cessent d'être retenues.
  const prestationsChoisies = disponibles.filter((p) => choisies.includes(p.id));
  const deposeAjoutee = deposeNecessaire(
    etatOngles,
    typePoseActuel,
    prestationsChoisies.map((p) => p.typeActe)
  )
    ? trouverDepose(prestations, typePoseActuel)
    : null;

  const lignes = deposeAjoutee ? [...prestationsChoisies, deposeAjoutee] : prestationsChoisies;
  const total = totalTarifs(lignes);

  function basculer(id: string) {
    setChoisies((precedentes) =>
      precedentes.includes(id) ? precedentes.filter((x) => x !== id) : [...precedentes, id]
    );
  }

  const jours = useMemo(() => {
    const parJour = new Map<string, Creneau[]>();
    for (const c of creneaux) {
      const groupe = parJour.get(c.jourLabel);
      if (groupe) groupe.push(c);
      else parJour.set(c.jourLabel, [c]);
    }
    return [...parJour.entries()];
  }, [creneaux]);

  const etatComplet = etatOngles === "NATUREL" || (etatOngles !== null && typePoseActuel !== null);

  return (
    <form action={formAction} className="mx-auto max-w-3xl">
      <ol className="mb-8 flex items-center justify-center gap-1 text-sm sm:gap-3">
        {etapes.map((nom, i) => (
          <li key={nom} className="flex items-center gap-1 sm:gap-3">
            {i > 0 && <span className="h-px w-4 bg-pink-200 sm:w-8" aria-hidden />}
            <span
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 ${
                i === etape
                  ? "bg-pink-500 text-white"
                  : i < etape
                    ? "bg-pink-100 text-pink-600"
                    : "border border-pink-100 bg-white text-foreground/50"
              }`}
            >
              <span className="font-semibold">{i + 1}</span>
              <span className="hidden sm:inline">{nom}</span>
            </span>
          </li>
        ))}
      </ol>

      <input type="hidden" name="etatOngles" value={etatOngles ?? ""} />
      <input type="hidden" name="typePoseActuel" value={typePoseActuel ?? ""} />
      {prestationsChoisies.map((p) => (
        <input key={p.id} type="hidden" name="prestationIds" value={p.id} />
      ))}
      <input type="hidden" name="debut" value={creneauChoisi?.debut ?? ""} />

      {/* Étape 1 : état des ongles */}
      <section hidden={etape !== 0}>
        <h2 className="font-display text-2xl font-bold">Dans quel état sont vos ongles ?</h2>
        <p className="mt-2 text-sm text-foreground/70">
          Cette réponse permet de ne vous proposer que les prestations réellement adaptées.
        </p>

        <div className="mt-6 grid gap-2">
          {ETATS_ONGLES.map((option) => (
            <label
              key={option.id}
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition ${
                etatOngles === option.id
                  ? "border-pink-500 bg-pink-50 ring-1 ring-pink-500"
                  : "border-pink-100 bg-white hover:border-pink-300"
              }`}
            >
              <input
                type="radio"
                name="choixEtat"
                className="mt-1 accent-pink-500"
                checked={etatOngles === option.id}
                onChange={() => choisirEtat(option.id)}
              />
              <span>
                <span className="block font-medium">{option.libelle}</span>
                <span className="block text-xs text-foreground/60">{option.description}</span>
              </span>
            </label>
          ))}
        </div>

        {etatOngles && etatOngles !== "NATUREL" && (
          <div className="mt-6">
            <h3 className="font-medium">De quel type de pose s&rsquo;agit-il ?</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {TYPES_POSE.map((type) => (
                <label
                  key={type.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition ${
                    typePoseActuel === type.id
                      ? "border-pink-500 bg-pink-50 ring-1 ring-pink-500"
                      : "border-pink-100 bg-white hover:border-pink-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="choixTypePose"
                    className="accent-pink-500"
                    checked={typePoseActuel === type.id}
                    onChange={() => setTypePoseActuel(type.id)}
                  />
                  <span className="font-medium">{type.libelle}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {aUnePose(etatOngles) && typePoseActuel && (
          <p className="mt-5 rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-900">
            <strong>Votre pose actuelle doit être traitée.</strong>{" "}
            {remplissageAutorise(etatOngles, typePoseActuel)
              ? "À l'étape suivante, choisissez soit un remplissage, soit une nouvelle pose — dans ce dernier cas, la dépose est ajoutée automatiquement."
              : `Une dépose est donc prévue : ${motifDepose(etatOngles, typePoseActuel)}`}
          </p>
        )}

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            disabled={!etatComplet}
            onClick={() => setEtape(1)}
            className="rounded-full bg-pink-500 px-8 py-3 font-medium text-white shadow-sm transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continuer
          </button>
        </div>
      </section>

      {/* Étape 2 : prestation */}
      <section hidden={etape !== 1}>
        <h2 className="font-display text-2xl font-bold">Choisissez vos prestations</h2>
        <p className="mt-2 text-sm text-foreground/70">
          Vous pouvez en cocher plusieurs si vous souhaitez cumuler.
        </p>
        {etatOngles === "NATUREL" && (
          <p className="mt-2 text-sm text-foreground/70">
            Vos ongles étant nus, seules les nouvelles poses vous sont proposées.
          </p>
        )}
        {aUnePose(etatOngles) && typePoseActuel && (
          <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {deposeAjoutee ? (
              <>
                <strong>{deposeAjoutee.nom}</strong> (
                {formatPrix(deposeAjoutee.prixCents, deposeAjoutee.aPartirDe)}) est ajoutée
                automatiquement : {motifDepose(etatOngles, typePoseActuel)}
              </>
            ) : prestationsChoisies.length > 0 ? (
              <>Aucune dépose nécessaire pour cette prestation.</>
            ) : (
              <>
                Vous portez une pose : choisissez un remplissage, une dépose seule, ou une nouvelle
                pose — la dépose sera alors ajoutée automatiquement.
              </>
            )}
          </p>
        )}

        <div className="mt-6 space-y-6">
          {categories.map(([categorie, items]) => (
            <fieldset key={categorie}>
              <legend className="font-display text-lg font-bold text-pink-500">{categorie}</legend>
              <div className="mt-3 grid gap-2">
                {items.map((p) => (
                  <label
                    key={p.id}
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition ${
                      choisies.includes(p.id)
                        ? "border-pink-500 bg-pink-50 ring-1 ring-pink-500"
                        : "border-pink-100 bg-white hover:border-pink-300"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="accent-pink-500"
                        checked={choisies.includes(p.id)}
                        onChange={() => basculer(p.id)}
                      />
                      <span>
                        <span className="block font-medium">{p.nom}</span>
                        <span className="block text-xs text-foreground/60">
                          environ {formatDuree(p.dureeMin)}
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 font-semibold text-pink-500">
                      {formatPrix(p.prixCents, p.aPartirDe)}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>

        <div className="mt-8 flex justify-between">
          <button
            type="button"
            onClick={() => setEtape(0)}
            className="rounded-full border border-pink-200 px-6 py-3 font-medium text-pink-600 transition hover:bg-pink-50"
          >
            Retour
          </button>
          <button
            type="button"
            disabled={prestationsChoisies.length === 0}
            onClick={() => setEtape(2)}
            className="rounded-full bg-pink-500 px-8 py-3 font-medium text-white shadow-sm transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continuer
          </button>
        </div>
      </section>

      {/* Étape 3 : créneau */}
      <section hidden={etape !== 2}>
        <h2 className="font-display text-2xl font-bold">Choisissez votre créneau</h2>
        {lignes.length > 0 && (
          <p className="mt-2 text-sm text-foreground/70">
            Pour : {lignes.map((l) => l.nom).join(" + ")} —{" "}
            <span className="font-medium text-pink-600">
              {formatPrix(total.prixCents, total.aPartirDe)}
            </span>
          </p>
        )}
        {jours.length === 0 ? (
          <p className="mt-6 rounded-2xl bg-pink-50 px-5 py-4 text-foreground/80">
            Aucun créneau disponible sur les 4 prochaines semaines. Réessayez un peu plus tard ou
            contactez directement Zélia.
          </p>
        ) : (
          <div className="mt-6 space-y-4">
            {jours.map(([jourLabel, creneauxDuJour]) => (
              <div
                key={jourLabel}
                className="flex flex-col gap-3 rounded-2xl border border-pink-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-medium capitalize">{jourLabel}</span>
                <div className="flex gap-2">
                  {creneauxDuJour.map((c) => (
                    <button
                      key={c.debut}
                      type="button"
                      onClick={() => setCreneauChoisi(c)}
                      className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                        creneauChoisi?.debut === c.debut
                          ? "bg-pink-500 text-white"
                          : "border border-pink-200 text-pink-600 hover:bg-pink-50"
                      }`}
                    >
                      {c.heureLabel}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6">
          <ListeAttenteForm ouvert={jours.length === 0} />
        </div>
        <div className="mt-8 flex justify-between">
          <button
            type="button"
            onClick={() => setEtape(1)}
            className="rounded-full border border-pink-200 px-6 py-3 font-medium text-pink-600 transition hover:bg-pink-50"
          >
            Retour
          </button>
          <button
            type="button"
            disabled={!creneauChoisi}
            onClick={() => setEtape(3)}
            className="rounded-full bg-pink-500 px-8 py-3 font-medium text-white shadow-sm transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continuer
          </button>
        </div>
      </section>

      {/* Étape 4 : coordonnées */}
      <section hidden={etape !== 3}>
        <h2 className="font-display text-2xl font-bold">Vos coordonnées</h2>
        {lignes.length > 0 && creneauChoisi && (
          <div className="mt-3 rounded-2xl bg-pink-50 px-5 py-4 text-sm text-foreground/80">
            <ul className="space-y-1">
              {lignes.map((ligne) => (
                <li key={ligne.id} className="flex justify-between gap-4">
                  <span>
                    {ligne.nom}
                    {ligne.id === deposeAjoutee?.id && (
                      <span className="text-foreground/50"> (ajoutée automatiquement)</span>
                    )}
                  </span>
                  <span className="shrink-0 font-medium">
                    {formatPrix(ligne.prixCents, ligne.aPartirDe)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 flex justify-between gap-4 border-t border-pink-200 pt-2 font-semibold">
              <span>Total · environ {formatDuree(totalDuree(lignes))}</span>
              <span className="text-pink-600">{formatPrix(total.prixCents, total.aPartirDe)}</span>
            </p>
            <p className="mt-2 capitalize text-foreground/70">
              {creneauChoisi.jourLabel} à {creneauChoisi.heureLabel}
            </p>
          </div>
        )}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium">Prénom *</span>
            <input
              name="prenom"
              required
              autoComplete="given-name"
              className="mt-1 w-full rounded-xl border border-pink-200 bg-white px-4 py-2.5 outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Nom *</span>
            <input
              name="nom"
              required
              autoComplete="family-name"
              className="mt-1 w-full rounded-xl border border-pink-200 bg-white px-4 py-2.5 outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">E-mail *</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 w-full rounded-xl border border-pink-200 bg-white px-4 py-2.5 outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Téléphone *</span>
            <input
              name="telephone"
              type="tel"
              required
              autoComplete="tel"
              placeholder="06 12 34 56 78"
              className="mt-1 w-full rounded-xl border border-pink-200 bg-white px-4 py-2.5 outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium">
              Code de parrainage{" "}
              <span className="text-foreground/50">(facultatif, si une cliente vous a recommandée)</span>
            </span>
            <input
              name="codeParrainage"
              placeholder="ZEL-XXXXX"
              maxLength={20}
              className="mt-1 w-full rounded-xl border border-pink-200 bg-white px-4 py-2.5 uppercase outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium">
              Un message pour Zélia ?{" "}
              <span className="text-foreground/50">(allergies, précisions pratiques…)</span>
            </span>
            <textarea
              name="noteCliente"
              rows={2}
              maxLength={500}
              className="mt-1 w-full rounded-xl border border-pink-200 bg-white px-4 py-2.5 outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
            />
          </label>
        </div>

        <ChampInspiration actif={envoiImagesActif} />

        <label className="mt-6 flex items-start gap-3 rounded-2xl border border-pink-200 bg-white px-4 py-3 text-sm">
          <input type="checkbox" name="consentementSante" required className="mt-1 accent-pink-500" />
          <span>
            <span className="font-medium">📌 Consentement &amp; responsabilités *</span>
            <span className="mt-1 block text-foreground/75">
              J&rsquo;accepte et je confirme avoir communiqué toutes mes informations de santé et
              allergies nécessaires, et je comprends que les produits utilisés peuvent contenir des
              substances potentiellement allergènes. Je déclare accepter les conditions et les
              risques liés à la prestation. Zelart décline toute responsabilité en cas de réaction
              non signalée à l&rsquo;avance ; en cas d&rsquo;ongle abîmé, infecté ou en mauvais état,
              Zelart peut refuser la prestation.
            </span>
          </span>
        </label>

        <label className="mt-4 flex items-start gap-3 text-sm">
          <input type="checkbox" name="majeure" required className="mt-1 accent-pink-500" />
          <span>
            Je certifie avoir 18 ans ou plus et j&rsquo;ai compris qu&rsquo;un acompte de 15 €
            (déduit du montant final) me sera demandé s&rsquo;il s&rsquo;agit de mon premier
            rendez-vous. *
          </span>
        </label>

        <label className="mt-3 flex items-start gap-3 text-sm">
          <input type="checkbox" name="consentementMarketing" className="mt-1 accent-pink-500" />
          <span>
            J&rsquo;accepte de recevoir par e-mail les offres et actualités de Zelart Nails
            (facultatif, désinscription en un clic à tout moment).
          </span>
        </label>

        <p className="mt-3 text-xs text-foreground/60">
          Vos coordonnées servent uniquement à gérer votre rendez-vous et ne sont jamais transmises à
          des tiers.{" "}
          <a href="/confidentialite" target="_blank" className="text-pink-600 hover:underline">
            En savoir plus
          </a>
        </p>

        {etat.erreur && (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {etat.erreur}
          </p>
        )}

        <div className="mt-8 flex justify-between">
          <button
            type="button"
            onClick={() => setEtape(2)}
            className="rounded-full border border-pink-200 px-6 py-3 font-medium text-pink-600 transition hover:bg-pink-50"
          >
            Retour
          </button>
          <button
            type="submit"
            disabled={enCours || prestationsChoisies.length === 0 || !creneauChoisi}
            className="rounded-full bg-pink-500 px-8 py-3 font-medium text-white shadow-sm transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {enCours ? "Envoi en cours…" : "Envoyer ma demande ✨"}
          </button>
        </div>
      </section>
    </form>
  );
}
