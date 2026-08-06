"use client";

import { useActionState, useState } from "react";
import { validerVenue, type EtatVenue } from "@/actions/venue";

export default function ValidationVenue({
  rendezVousId,
  prenomMarraine,
  dejaValide = false,
  commentaire,
}: {
  rendezVousId: string;
  /** Renseigné quand la cliente est une filleule : sa venue compte pour sa marraine. */
  prenomMarraine?: string | null;
  dejaValide?: boolean;
  commentaire?: string | null;
}) {
  const [etat, action, enCours] = useActionState<EtatVenue, FormData>(
    validerVenue.bind(null, rendezVousId),
    {}
  );
  const [ouvert, setOuvert] = useState(false);

  if (etat.message) {
    return (
      <p
        role="status"
        className={`mt-3 rounded-xl px-4 py-2.5 text-sm ${
          etat.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-700"
        }`}
      >
        {etat.message}
      </p>
    );
  }

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className={
          dejaValide
            ? "rounded-full border border-pink-200 px-3 py-1 text-xs font-medium text-pink-600 transition hover:bg-pink-50"
            : "rounded-full bg-pink-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-pink-600"
        }
      >
        {dejaValide ? "Modifier le commentaire" : "✓ Elle est bien venue"}
      </button>
    );
  }

  return (
    <form action={action} className="mt-2 rounded-xl border border-pink-200 bg-white p-4">
      {prenomMarraine && !dejaValide && (
        <p className="mb-2 rounded-lg bg-pink-50 px-3 py-2 text-xs text-pink-800">
          💕 Filleule de <strong>{prenomMarraine}</strong> — valider sa venue peut débloquer un
          palier de parrainage.
        </p>
      )}
      <label className="block text-sm">
        <span className="font-medium">
          Commentaire sur la visite{" "}
          <span className="font-normal text-foreground/50">(facultatif)</span>
        </span>
        <span className="mt-0.5 block text-xs text-foreground/60">
          Gardé dans sa fiche, visible de vous seule.
        </span>
        <textarea
          name="commentaire"
          rows={3}
          maxLength={1000}
          defaultValue={commentaire ?? ""}
          placeholder="Ex. très ponctuelle, a adoré le chrome, veut essayer le Pop-it la prochaine fois."
          className="mt-1 w-full rounded-xl border border-pink-200 px-3 py-2 text-sm outline-none focus:border-pink-500"
        />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={enCours}
          className="rounded-full bg-pink-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-pink-600 disabled:opacity-50"
        >
          {enCours ? "Enregistrement…" : dejaValide ? "Enregistrer" : "Confirmer la venue"}
        </button>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          className="rounded-full border border-pink-200 px-4 py-2 text-sm text-foreground/70 transition hover:bg-pink-50"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
