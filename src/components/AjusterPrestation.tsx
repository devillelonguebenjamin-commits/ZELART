"use client";

import { useActionState, useState } from "react";
import { ajusterPrestation, type EtatAjustement } from "@/actions/ajuster-prestation";
import { formatPrix } from "@/lib/format";

export type Variante = {
  id: string;
  nom: string;
  prixCents: number;
  aPartirDe: boolean;
  dureeMin: number;
};

// Corriger le niveau annoncé, avant la pose plutôt qu'au fauteuil.
//
// Replié par défaut : la carte d'un rendez-vous est déjà dense, et l'ajustement
// reste l'exception. Il ne s'ouvre que sur les lignes qui ont réellement des
// variantes, ce que la page décide en amont.

export default function AjusterPrestation({
  ligneId,
  prestationActuelleId,
  variantes,
}: {
  ligneId: string;
  prestationActuelleId: string;
  variantes: Variante[];
}) {
  const [ouvert, setOuvert] = useState(false);
  const [etat, action, enCours] = useActionState<EtatAjustement, FormData>(
    ajusterPrestation.bind(null, ligneId),
    {}
  );

  if (etat.message) {
    return (
      <p
        role="status"
        className={`mt-2 rounded-xl px-4 py-2.5 text-sm ${
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
        className="text-xs font-medium text-pink-600 underline-offset-2 hover:underline"
      >
        Ajuster le niveau
      </button>
    );
  }

  return (
    <form action={action} className="mt-2 rounded-xl border border-pink-200 bg-white p-4">
      <p className="text-xs text-foreground/60">
        Pour un dessin qui relève d&rsquo;un autre niveau que celui coché à la réservation. La
        cliente est prévenue par e-mail, avec le nouveau prix et la nouvelle heure de fin.
      </p>

      <label className="mt-3 block text-sm">
        <span className="font-medium">Nouvelle prestation</span>
        <select
          name="prestationId"
          defaultValue={prestationActuelleId}
          className="mt-1 w-full rounded-xl border border-pink-200 bg-white px-3 py-2 text-sm outline-none focus:border-pink-500"
        >
          {variantes.map((variante) => (
            <option key={variante.id} value={variante.id}>
              {variante.nom} · {formatPrix(variante.prixCents, variante.aPartirDe)}
              {variante.id === prestationActuelleId ? " (actuelle)" : ""}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-3 block text-sm">
        <span className="font-medium">
          Mot pour la cliente <span className="font-normal text-foreground/50">(facultatif)</span>
        </span>
        <textarea
          name="motif"
          rows={2}
          maxLength={300}
          placeholder="Ex. le modèle que vous m'avez envoyé demande un niveau 3, je préfère vous le dire avant."
          className="mt-1 w-full rounded-xl border border-pink-200 px-3 py-2 text-sm outline-none focus:border-pink-500"
        />
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={enCours}
          className="rounded-full bg-pink-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-pink-600 disabled:opacity-50"
        >
          {enCours ? "Enregistrement…" : "Ajuster et prévenir"}
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
