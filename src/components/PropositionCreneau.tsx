"use client";

import { HORIZON_PROPOSITION_JOURS } from "@/lib/creneaux-bornes";

// Bornes du sélecteur, en heure locale — mêmes limites que celles vérifiées
// côté serveur, mais annoncées d'avance plutôt que reprochées après coup.
function horodatageLocal(dans: number): string {
  const date = new Date(Date.now() + dans);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`;
}

const JOUR_MS = 24 * 60 * 60 * 1000;

export default function PropositionCreneau({
  actif,
  valeur,
  onActiver,
  onChange,
}: {
  actif: boolean;
  valeur: string;
  onActiver: (actif: boolean) => void;
  onChange: (valeur: string) => void;
}) {
  if (!actif) {
    return (
      <button
        type="button"
        onClick={() => onActiver(true)}
        className="text-sm font-medium text-pink-600 hover:underline"
      >
        Ou proposez votre propre horaire à Zélia.
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-pink-200 bg-white p-5">
      <p className="text-sm font-medium">Proposer un horaire</p>
      <p className="mt-1 text-xs text-foreground/60">
        Indiquez le moment qui vous arrangerait. Zélia vous répond pour accepter ou proposer
        autre chose — ce n&rsquo;est pas encore un rendez-vous confirmé.
      </p>
      <label className="mt-3 block text-sm">
        <span className="font-medium">Date et heure souhaitées</span>
        <input
          type="datetime-local"
          value={valeur}
          onChange={(e) => onChange(e.target.value)}
          min={horodatageLocal(JOUR_MS)}
          max={horodatageLocal(HORIZON_PROPOSITION_JOURS * JOUR_MS)}
          className="mt-1 w-full rounded-xl border border-pink-200 px-3 py-2 outline-none focus:border-pink-500"
        />
      </label>
      <button
        type="button"
        onClick={() => onActiver(false)}
        className="mt-3 text-xs text-foreground/60 underline hover:text-pink-600"
      >
        Revenir aux créneaux proposés
      </button>
    </div>
  );
}
