"use client";

import { useActionState } from "react";
import { retablirRendezVous, type EtatRetablissement } from "@/actions/retablissement";

/**
 * Rétablit un rendez-vous annulé, et affiche pourquoi quand c'est impossible.
 *
 * Un simple formulaire sans retour ne suffirait pas ici : le refus le plus
 * probable — « une autre cliente a pris le créneau » — doit se lire tout de
 * suite, avec le nom, sinon Zélia rappuie en pensant à une panne.
 */
export default function BoutonRetablir({
  rendezVousId,
  libelle = "Rétablir",
}: {
  rendezVousId: string;
  libelle?: string;
}) {
  const [etat, action, enCours] = useActionState<EtatRetablissement, FormData>(
    retablirRendezVous.bind(null, rendezVousId),
    {}
  );

  if (etat.ok) {
    return (
      <span role="status" className="text-xs font-medium text-emerald-700">
        {etat.message}
      </span>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <button
        type="submit"
        disabled={enCours}
        className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
      >
        {enCours ? "Rétablissement…" : libelle}
      </button>
      {etat.message && (
        <span role="status" className="text-xs text-red-700">
          {etat.message}
        </span>
      )}
    </form>
  );
}
