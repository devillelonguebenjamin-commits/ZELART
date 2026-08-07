"use client";

import { useActionState, useState } from "react";
import { annulerAvecMessage, type EtatAnnulation } from "@/actions/annulation-admin";
import type { Creneau } from "@/lib/creneaux";

// Annuler en disant pourquoi, et en proposant autre chose.
//
// Le mot et les créneaux sont tous deux facultatifs : Zélia garde la
// possibilité d'annuler sans rien écrire, comme avant. Le bouton dit ce qui va
// se passer — « annuler sans message » ou « annuler et prévenir » — pour qu'on
// ne découvre pas après coup qu'un e-mail est parti, ou n'est pas parti.

const MAX_CRENEAUX = 6;

export default function AnnulationAvecMessage({
  rendezVousId,
  confirme,
  creneauxLibres,
}: {
  rendezVousId: string;
  /** Rendez-vous confirmé : on annule. Sinon on refuse une demande. */
  confirme: boolean;
  creneauxLibres: Creneau[];
}) {
  const [ouvert, setOuvert] = useState(false);
  const [note, setNote] = useState("");
  const [choisis, setChoisis] = useState<string[]>([]);
  const [etat, action, enCours] = useActionState<EtatAnnulation, FormData>(
    annulerAvecMessage.bind(null, rendezVousId),
    {}
  );

  function basculer(debut: string) {
    setChoisis((p) =>
      p.includes(debut)
        ? p.filter((x) => x !== debut)
        : p.length < MAX_CRENEAUX
          ? [...p, debut]
          : p
    );
  }

  if (etat.ok && etat.message) {
    return (
      <p role="status" className="text-xs font-medium text-emerald-700">
        {etat.message}
      </p>
    );
  }

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="rounded-full border border-pink-200 px-3 py-1 text-xs font-medium text-pink-600 transition hover:bg-pink-50"
      >
        ✕ {confirme ? "Annuler" : "Refuser"}
      </button>
    );
  }

  return (
    <form action={action} className="w-full rounded-2xl border border-pink-200 bg-pink-50/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-semibold">
          {confirme ? "Annuler ce rendez-vous" : "Refuser cette demande"}
        </p>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          className="text-xs text-foreground/60 underline hover:text-pink-600"
        >
          Fermer
        </button>
      </div>

      <label className="mt-3 block text-sm">
        <span className="font-medium">
          Un mot pour la cliente <span className="text-foreground/50">(facultatif)</span>
        </span>
        <textarea
          name="note"
          rows={3}
          maxLength={800}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ex. : un imprévu m'oblige à fermer ce jour-là, je suis désolée…"
          className="mt-1 w-full rounded-xl border border-pink-200 bg-white px-3 py-2 text-sm outline-none focus:border-pink-500"
        />
      </label>

      {creneauxLibres.length > 0 && (
        <fieldset className="mt-3">
          <legend className="text-sm font-medium">
            Proposer d&rsquo;autres créneaux{" "}
            <span className="text-foreground/50">
              (facultatif, {MAX_CRENEAUX} au maximum)
            </span>
          </legend>
          <div className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-pink-200 bg-white p-2">
            <div className="flex flex-wrap gap-1.5">
              {creneauxLibres.map((c) => {
                const actif = choisis.includes(c.debut);
                return (
                  <label
                    key={c.debut}
                    className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs transition ${
                      actif
                        ? "border-pink-500 bg-pink-50 font-medium text-pink-700"
                        : "border-pink-200 hover:bg-pink-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="creneaux"
                      value={c.debut}
                      checked={actif}
                      onChange={() => basculer(c.debut)}
                      className="sr-only"
                    />
                    <span className="capitalize">{c.jourLabel}</span> · {c.heureLabel}
                  </label>
                );
              })}
            </div>
          </div>
          {choisis.length >= MAX_CRENEAUX && (
            <p className="mt-1 text-xs text-foreground/50">
              Six suffisent : au-delà, la cliente ne choisit plus, elle trie.
            </p>
          )}
        </fieldset>
      )}

      {etat.message && !etat.ok && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
          {etat.message}
        </p>
      )}

      <button
        type="submit"
        disabled={enCours}
        className="mt-3 rounded-full bg-pink-500 px-5 py-2 text-xs font-medium text-white transition hover:bg-pink-600 disabled:opacity-40"
      >
        {enCours
          ? "Envoi…"
          : note.trim() || choisis.length > 0
            ? `${confirme ? "Annuler" : "Refuser"} et prévenir la cliente`
            : `${confirme ? "Annuler" : "Refuser"} sans message`}
      </button>
    </form>
  );
}
