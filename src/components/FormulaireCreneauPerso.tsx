"use client";

import { useActionState, useState } from "react";
import { bloquerCreneauPerso, type EtatBlocageCreneau } from "@/actions/rdv-manuel";

// Blocage d'un créneau pour raison personnelle.
//
// Volontairement minimal : un intitulé, une date, une heure, une durée. Ce
// n'est pas un rendez-vous — aucune cliente, aucun tarif, rien à facturer. Le
// créneau disparaît simplement des disponibilités.
const DUREES = [
  { minutes: 30, libelle: "30 min" },
  { minutes: 60, libelle: "1 h" },
  { minutes: 120, libelle: "2 h" },
  { minutes: 240, libelle: "4 h" },
  { minutes: 480, libelle: "Toute la journée" },
];

export default function FormulaireCreneauPerso({ dateParDefaut }: { dateParDefaut: string }) {
  const [ouvert, setOuvert] = useState(false);
  const [etat, action, enCours] = useActionState<EtatBlocageCreneau, FormData>(
    bloquerCreneauPerso,
    {}
  );

  if (!ouvert) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setOuvert(true)}
          className="rounded-full border border-pink-300 bg-white px-5 py-2 text-sm font-medium text-pink-700 transition hover:bg-pink-50"
        >
          🚫 Bloquer un créneau
        </button>
        {etat.ok && etat.message && (
          <span role="status" className="text-sm font-medium text-emerald-700">
            {etat.message}
          </span>
        )}
      </div>
    );
  }

  return (
    <form action={action} className="rounded-2xl border border-pink-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="font-display text-lg font-bold">Bloquer un créneau</p>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          className="text-xs text-foreground/60 underline hover:text-pink-600"
        >
          Fermer
        </button>
      </div>
      <p className="mt-1 text-xs text-foreground/60">
        Pour vos rendez-vous à vous. Le créneau cesse d&rsquo;être proposé aux clientes, en ligne
        comme à la saisie manuelle.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="block text-sm sm:col-span-3">
          <span className="font-medium">Intitulé *</span>
          <input
            name="intitule"
            required
            maxLength={200}
            placeholder="Médecin, école, livraison…"
            className={CHAMP}
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium">Date et heure *</span>
          <input
            type="datetime-local"
            name="debut"
            required
            defaultValue={dateParDefaut}
            className={CHAMP}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Durée</span>
          <select name="dureeMin" defaultValue={60} className={CHAMP}>
            {DUREES.map((d) => (
              <option key={d.minutes} value={d.minutes}>
                {d.libelle}
              </option>
            ))}
          </select>
        </label>
      </div>

      {etat.message && (
        <p
          role="status"
          className={`mt-4 rounded-xl px-4 py-2 text-sm ${
            etat.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
          }`}
        >
          {etat.message}
        </p>
      )}

      <button
        type="submit"
        disabled={enCours}
        className="mt-4 rounded-full bg-pink-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-pink-600 disabled:opacity-40"
      >
        {enCours ? "Enregistrement…" : "Bloquer ce créneau"}
      </button>
    </form>
  );
}

const CHAMP =
  "mt-1 w-full rounded-xl border border-pink-200 bg-white px-3 py-2 text-sm outline-none focus:border-pink-500";
