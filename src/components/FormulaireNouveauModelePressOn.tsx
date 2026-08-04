"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { creerModelePressOn, type EtatModele } from "@/actions/admin-press-on";

export default function FormulaireNouveauModelePressOn({
  collections,
}: {
  collections: string[];
}) {
  const router = useRouter();
  const formulaire = useRef<HTMLFormElement>(null);
  const [ouvert, setOuvert] = useState(false);
  const [etat, action, enCours] = useActionState<EtatModele, FormData>(creerModelePressOn, {});

  useEffect(() => {
    if (etat.ok) {
      formulaire.current?.reset();
      router.refresh();
    }
  }, [etat, router]);

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="rounded-full bg-pink-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-pink-600"
      >
        + Ajouter un modèle
      </button>
    );
  }

  return (
    <form
      ref={formulaire}
      action={action}
      className="w-full rounded-2xl border border-pink-200 bg-white p-5"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-semibold">Nouveau modèle de press-on</h2>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          className="text-sm text-pink-600 hover:underline"
        >
          Fermer
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-foreground/70">Nom du set *</span>
          <input
            name="nom"
            required
            placeholder="Cherry"
            className="mt-1 w-full rounded-xl border border-pink-200 px-3 py-2 outline-none focus:border-pink-500"
          />
        </label>
        <label className="block text-sm">
          <span className="text-foreground/70">Collection *</span>
          <input
            name="collection"
            list="collections-press-on"
            required
            placeholder="Printemps / Été"
            className="mt-1 w-full rounded-xl border border-pink-200 px-3 py-2 outline-none focus:border-pink-500"
          />
          <datalist id="collections-press-on">
            {collections.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="text-foreground/70">Description (facultatif)</span>
          <input
            name="description"
            maxLength={300}
            placeholder="Rouge cerise et petits nœuds"
            className="mt-1 w-full rounded-xl border border-pink-200 px-3 py-2 outline-none focus:border-pink-500"
          />
        </label>
        <label className="block text-sm">
          <span className="text-foreground/70">Prix en euros *</span>
          <input
            name="prixEuros"
            type="number"
            min={0}
            step="0.01"
            required
            className="mt-1 w-full rounded-xl border border-pink-200 px-3 py-2 text-right outline-none focus:border-pink-500"
          />
        </label>
        <div className="flex flex-col justify-end gap-2 text-sm">
          <label className="flex items-center gap-3">
            <input type="checkbox" name="aPartirDe" className="accent-pink-500" />
            <span>Prix « à partir de »</span>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" name="surMesure" className="accent-pink-500" />
            <span>Set dessiné sur-mesure</span>
          </label>
        </div>
      </div>

      {etat.message && (
        <p
          role="status"
          className={`mt-3 rounded-xl px-4 py-3 text-sm ${
            etat.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
          }`}
        >
          {etat.message}
        </p>
      )}

      <button
        type="submit"
        disabled={enCours}
        className="mt-4 rounded-full bg-pink-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-pink-600 disabled:opacity-50"
      >
        {enCours ? "Enregistrement…" : "Ajouter ce modèle"}
      </button>
    </form>
  );
}
