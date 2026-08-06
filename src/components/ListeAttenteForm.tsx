"use client";

import { useRef, useState, useTransition } from "react";
import { rejoindreListeAttente, type EtatListeAttente } from "@/actions/liste-attente";

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

  function envoyer() {
    const conteneur = bloc.current;
    if (!conteneur) return;
    const donnees = new FormData();
    for (const champ of conteneur.querySelectorAll<HTMLInputElement>("input[data-champ]")) {
      donnees.set(champ.dataset.champ!, champ.value);
    }
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
        Zélia vous écrit dès qu&rsquo;une annulation ouvre un créneau — sans engagement.
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
            Jour souhaité <span className="font-normal text-foreground/50">(facultatif)</span>
          </span>
          <input
            data-champ="note"
            placeholder="Ex. plutôt un samedi, ou la semaine du 15"
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
