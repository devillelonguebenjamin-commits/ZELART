"use client";

import { useActionState } from "react";
import { ajouterPhoto, type EtatPhoto } from "@/actions/admin";

export default function FormulairePhoto() {
  const [etat, action, enCours] = useActionState<EtatPhoto, FormData>(ajouterPhoto, {});

  return (
    <div>
      <form action={action} className="flex flex-wrap items-end gap-4">
        <label className="block text-sm">
          <span className="text-foreground/70">Image (8 Mo max)</span>
          <input
            type="file"
            name="fichier"
            accept="image/*"
            required
            className="mt-1 block text-sm file:mr-3 file:rounded-full file:border-0 file:bg-pink-500 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-pink-600"
          />
        </label>
        <label className="block flex-1 text-sm">
          <span className="text-foreground/70">Légende (facultatif)</span>
          <input
            name="legende"
            placeholder="Pose Gel X — nail art fleuri"
            className="mt-1 block w-full min-w-40 rounded-xl border border-pink-200 px-3 py-2 outline-none focus:border-pink-500"
          />
        </label>
        <button
          type="submit"
          disabled={enCours}
          className="rounded-full bg-pink-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-pink-600 disabled:opacity-50"
        >
          {enCours ? "Envoi…" : "Ajouter"}
        </button>
      </form>

      {etat.message && (
        <p
          role="status"
          className={`mt-3 break-words rounded-xl px-4 py-3 text-sm ${
            etat.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
          }`}
        >
          {etat.message}
        </p>
      )}
    </div>
  );
}
