"use client";

import { useActionState, useMemo, useState } from "react";
import { creerReservation, type EtatReservation } from "@/actions/reservation";
import type { Creneau } from "@/lib/creneaux";
import { formatDuree } from "@/lib/format";

export type PrestationPublique = {
  id: string;
  nom: string;
  description: string | null;
  dureeMin: number;
  prixLabel: string;
};

export type CategoriePublique = {
  nom: string;
  prestations: PrestationPublique[];
};

type Props = {
  categories: CategoriePublique[];
  creneaux: Creneau[];
};

const etapes = ["Prestation", "Créneau", "Coordonnées"] as const;

export default function ReservationWizard({ categories, creneaux }: Props) {
  const [etape, setEtape] = useState(0);
  const [prestationId, setPrestationId] = useState<string | null>(null);
  const [creneauChoisi, setCreneauChoisi] = useState<Creneau | null>(null);
  const [etat, formAction, enCours] = useActionState<EtatReservation, FormData>(
    creerReservation,
    {}
  );

  const prestationChoisie = useMemo(
    () =>
      categories.flatMap((c) => c.prestations).find((p) => p.id === prestationId) ??
      null,
    [categories, prestationId]
  );

  const jours = useMemo(() => {
    const parJour = new Map<string, Creneau[]>();
    for (const c of creneaux) {
      const groupe = parJour.get(c.jourLabel);
      if (groupe) groupe.push(c);
      else parJour.set(c.jourLabel, [c]);
    }
    return [...parJour.entries()];
  }, [creneaux]);

  return (
    <form action={formAction} className="mx-auto max-w-3xl">
      {/* Fil d'Ariane des étapes */}
      <ol className="mb-8 flex items-center justify-center gap-2 text-sm sm:gap-4">
        {etapes.map((nom, i) => (
          <li key={nom} className="flex items-center gap-2 sm:gap-4">
            {i > 0 && <span className="h-px w-6 bg-pink-200 sm:w-10" aria-hidden />}
            <span
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 ${
                i === etape
                  ? "bg-pink-500 text-white"
                  : i < etape
                    ? "bg-pink-100 text-pink-600"
                    : "bg-white text-foreground/50 border border-pink-100"
              }`}
            >
              <span className="font-semibold">{i + 1}</span>
              <span className="hidden sm:inline">{nom}</span>
            </span>
          </li>
        ))}
      </ol>

      {/* Valeurs retenues, envoyées avec le formulaire */}
      <input type="hidden" name="prestationId" value={prestationId ?? ""} />
      <input type="hidden" name="debut" value={creneauChoisi?.debut ?? ""} />

      {/* Étape 1 : prestation */}
      <section hidden={etape !== 0}>
        <h2 className="font-display text-2xl font-bold">Choisissez votre prestation</h2>
        <div className="mt-6 space-y-6">
          {categories.map((categorie) => (
            <fieldset key={categorie.nom}>
              <legend className="font-display text-lg font-bold text-pink-500">
                {categorie.nom}
              </legend>
              <div className="mt-3 grid gap-2">
                {categorie.prestations.map((p) => (
                  <label
                    key={p.id}
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition ${
                      prestationId === p.id
                        ? "border-pink-500 bg-pink-50 ring-1 ring-pink-500"
                        : "border-pink-100 bg-white hover:border-pink-300"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="choixPrestation"
                        className="accent-pink-500"
                        checked={prestationId === p.id}
                        onChange={() => setPrestationId(p.id)}
                      />
                      <span>
                        <span className="block font-medium">{p.nom}</span>
                        <span className="block text-xs text-foreground/60">
                          environ {formatDuree(p.dureeMin)}
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 font-semibold text-pink-500">{p.prixLabel}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
        <div className="mt-8 flex justify-end">
          <button
            type="button"
            disabled={!prestationId}
            onClick={() => setEtape(1)}
            className="rounded-full bg-pink-500 px-8 py-3 font-medium text-white shadow-sm transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continuer
          </button>
        </div>
      </section>

      {/* Étape 2 : créneau */}
      <section hidden={etape !== 1}>
        <h2 className="font-display text-2xl font-bold">Choisissez votre créneau</h2>
        <p className="mt-2 text-sm text-foreground/70">
          {prestationChoisie
            ? `Pour : ${prestationChoisie.nom} (${prestationChoisie.prixLabel})`
            : ""}
        </p>
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
            disabled={!creneauChoisi}
            onClick={() => setEtape(2)}
            className="rounded-full bg-pink-500 px-8 py-3 font-medium text-white shadow-sm transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continuer
          </button>
        </div>
      </section>

      {/* Étape 3 : coordonnées */}
      <section hidden={etape !== 2}>
        <h2 className="font-display text-2xl font-bold">Vos coordonnées</h2>
        {prestationChoisie && creneauChoisi && (
          <p className="mt-3 rounded-2xl bg-pink-50 px-5 py-3 text-sm text-foreground/80">
            <span className="font-semibold">{prestationChoisie.nom}</span> ({prestationChoisie.prixLabel})
            {" — "}
            <span className="capitalize">{creneauChoisi.jourLabel}</span> à {creneauChoisi.heureLabel}
          </p>
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
              Un message pour Zélia ? <span className="text-foreground/50">(envies, allergies…)</span>
            </span>
            <textarea
              name="noteCliente"
              rows={3}
              maxLength={500}
              className="mt-1 w-full rounded-xl border border-pink-200 bg-white px-4 py-2.5 outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
            />
          </label>
        </div>
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
            onClick={() => setEtape(1)}
            className="rounded-full border border-pink-200 px-6 py-3 font-medium text-pink-600 transition hover:bg-pink-50"
          >
            Retour
          </button>
          <button
            type="submit"
            disabled={enCours || !prestationId || !creneauChoisi}
            className="rounded-full bg-pink-500 px-8 py-3 font-medium text-white shadow-sm transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {enCours ? "Envoi en cours…" : "Envoyer ma demande ✨"}
          </button>
        </div>
      </section>
    </form>
  );
}
