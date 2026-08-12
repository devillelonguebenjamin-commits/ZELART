"use client";

import { useRef, useState, useTransition } from "react";
import { rejoindreListeAttente, type EtatListeAttente } from "@/actions/liste-attente";
import { JOURS_ATTENTE, MOMENTS } from "@/lib/attente-bornes";

// Ce bloc s'affiche au milieu du parcours de réservation, lui-même enveloppé
// dans un <form>. Deux pièges en découlent, d'où la construction inhabituelle :
//
//   1. Un <form> imbriqué est du HTML invalide : le navigateur supprime la
//      balise intérieure au parsage, et le bouton « Me prévenir » enverrait
//      alors la demande de rendez-vous. On se passe donc de <form>.
//   2. Sans <form> à soi, des champs nommés `prenom` ou `email` entreraient en
//      collision avec ceux de la réservation, qui lit le premier venu — la
//      cliente ayant déplié ce bloc ne pourrait plus réserver. Les champs
//      n'ont donc aucun attribut `name` : ils sont repérés par `data-champ`,
//      invisible des formulaires.
export default function ListeAttenteForm({ ouvert = false }: { ouvert?: boolean }) {
  const bloc = useRef<HTMLDivElement>(null);
  const [etat, setEtat] = useState<EtatListeAttente>({});
  const [enCours, demarrer] = useTransition();
  const [depliee, setDepliee] = useState(ouvert);
  const [jours, setJours] = useState<number[]>([]);
  const [moment, setMoment] = useState<string>("");

  function basculerJour(numero: number) {
    setJours((precedents) =>
      precedents.includes(numero)
        ? precedents.filter((j) => j !== numero)
        : [...precedents, numero]
    );
  }

  function envoyer() {
    const conteneur = bloc.current;
    if (!conteneur) return;
    const donnees = new FormData();
    for (const champ of conteneur.querySelectorAll<HTMLInputElement>("input[data-champ]")) {
      donnees.set(champ.dataset.champ!, champ.value);
    }
    donnees.set("joursSouhaites", jours.join(","));
    donnees.set("momentSouhaite", moment);
    demarrer(async () => setEtat(await rejoindreListeAttente({}, donnees)));
  }

  if (etat.ok) {
    return (
      <p role="status" className="rounded-2xl bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
        {etat.message}
      </p>
    );
  }

  if (!depliee) {
    return (
      <button
        type="button"
        onClick={() => setDepliee(true)}
        className="text-sm font-medium text-pink-600 hover:underline"
      >
        Aucun créneau ne vous convient ? Soyez prévenue d&rsquo;une annulation.
      </button>
    );
  }

  return (
    <div ref={bloc} className="rounded-2xl border border-pink-100 bg-white p-5">
      <p className="text-sm font-medium">Prévenue dès qu&rsquo;une place se libère</p>
      <p className="mt-1 text-xs text-foreground/60">
        Je vous écris dès qu&rsquo;une annulation ouvre un créneau, sans engagement.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium">Prénom</span>
          <input
            data-champ="prenom"
            autoComplete="given-name"
            className="mt-1 w-full rounded-xl border border-pink-200 px-3 py-2 outline-none focus:border-pink-500"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">E-mail</span>
          <input
            data-champ="email"
            type="email"
            autoComplete="email"
            className="mt-1 w-full rounded-xl border border-pink-200 px-3 py-2 outline-none focus:border-pink-500"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium">
            Téléphone <span className="font-normal text-foreground/50">(facultatif)</span>
          </span>
          <input
            data-champ="telephone"
            type="tel"
            autoComplete="tel"
            placeholder="06 12 34 56 78"
            className="mt-1 w-full rounded-xl border border-pink-200 px-3 py-2 outline-none focus:border-pink-500"
          />
        </label>

        {/* Sans préférence exprimée, la personne est prévenue de toutes les
            annulations. En cocher fait l'inverse de ce qu'on croit : cela ne
            réduit pas les chances, cela évite de consommer l'unique
            notification pour un créneau qui ne convient pas. */}
        <fieldset className="sm:col-span-2">
          <legend className="text-sm font-medium">
            Quels jours vous arrangeraient ?{" "}
            <span className="font-normal text-foreground/50">
              (facultatif, rien de coché = n&rsquo;importe quand)
            </span>
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {JOURS_ATTENTE.map((jour) => (
              <button
                key={jour.numero}
                type="button"
                onClick={() => basculerJour(jour.numero)}
                aria-pressed={jours.includes(jour.numero)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  jours.includes(jour.numero)
                    ? "bg-pink-500 text-white"
                    : "border border-pink-200 bg-white text-pink-600 hover:bg-pink-50"
                }`}
              >
                {jour.libelle}
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {MOMENTS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMoment(moment === m.id ? "" : m.id)}
                aria-pressed={moment === m.id}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  moment === m.id
                    ? "bg-pink-500 text-white"
                    : "border border-pink-200 bg-white text-pink-600 hover:bg-pink-50"
                }`}
              >
                {m.libelle}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="block text-sm sm:col-span-2">
          <span className="font-medium">
            Autre précision <span className="font-normal text-foreground/50">(facultatif)</span>
          </span>
          <input
            data-champ="note"
            placeholder="Ex. la semaine du 15, ou plutôt en fin de journée"
            maxLength={300}
            className="mt-1 w-full rounded-xl border border-pink-200 px-3 py-2 outline-none focus:border-pink-500"
          />
        </label>
      </div>

      {etat.message && (
        <p role="status" className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {etat.message}
        </p>
      )}

      <button
        type="button"
        onClick={envoyer}
        disabled={enCours}
        className="mt-3 rounded-full bg-pink-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-pink-600 disabled:opacity-50"
      >
        {enCours ? "Envoi…" : "Me prévenir"}
      </button>
    </div>
  );
}
