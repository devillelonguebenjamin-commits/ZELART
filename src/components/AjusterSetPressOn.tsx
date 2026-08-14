"use client";

import { useActionState, useState } from "react";
import { ajusterSetPressOn, type EtatAjustementSet } from "@/actions/ajuster-set-press-on";
import { formatPrix } from "@/lib/format";

export type VarianteSet = {
  id: string;
  nom: string;
  prixCents: number;
  aPartirDe: boolean;
};

// Fixer le niveau d'un set, avant le règlement.
//
// Replié par défaut : c'est un geste ponctuel sur une fiche déjà dense, et il
// ne concerne que le sur-mesure. La page décide en amont s'il a lieu d'être.

export default function AjusterSetPressOn({
  commandeId,
  modeleActuelId,
  variantes,
  reglementDemande,
}: {
  commandeId: string;
  modeleActuelId: string;
  variantes: VarianteSet[];
  /** Le règlement a déjà été demandé : l'ajustement invalide le lien envoyé. */
  reglementDemande: boolean;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [etat, action, enCours] = useActionState<EtatAjustementSet, FormData>(
    ajusterSetPressOn.bind(null, commandeId),
    {}
  );

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
        className="text-sm font-medium text-pink-600 underline-offset-2 hover:underline"
      >
        Ajuster le niveau de nail art
      </button>
    );
  }

  return (
    <form action={action} className="mt-2 rounded-xl border border-pink-200 bg-white p-4">
      <p className="text-xs text-foreground/60">
        Pour un set dont la description relève d&rsquo;un autre niveau que celui commandé. À faire
        avant le règlement.
      </p>

      {reglementDemande && (
        <p className="mt-3 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
          Le règlement a déjà été demandé. Ajuster le tarif retire le lien envoyé, qui portait
          l&rsquo;ancien montant : la cliente en sera prévenue et il faudra renvoyer la demande.
        </p>
      )}

      <label className="mt-3 block text-sm">
        <span className="font-medium">Nouveau set</span>
        <select
          name="modeleId"
          defaultValue={modeleActuelId}
          className="mt-1 w-full rounded-xl border border-pink-200 bg-white px-3 py-2 text-sm outline-none focus:border-pink-500"
        >
          {variantes.map((variante) => (
            <option key={variante.id} value={variante.id}>
              {variante.nom} · {formatPrix(variante.prixCents, variante.aPartirDe)}
              {variante.id === modeleActuelId ? " (actuel)" : ""}
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
          placeholder="Ex. le set que vous décrivez demande un niveau 3, je préfère vous le dire avant de lancer la fabrication."
          className="mt-1 w-full rounded-xl border border-pink-200 px-3 py-2 text-sm outline-none focus:border-pink-500"
        />
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={enCours}
          className="rounded-full bg-pink-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-pink-600 disabled:opacity-50"
        >
          {enCours ? "Enregistrement…" : "Ajuster"}
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
