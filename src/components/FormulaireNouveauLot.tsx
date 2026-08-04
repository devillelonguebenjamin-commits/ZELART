"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { creerLot, type EtatLot } from "@/actions/lots";

export default function FormulaireNouveauLot() {
  const router = useRouter();
  const formulaire = useRef<HTMLFormElement>(null);
  const [ouvert, setOuvert] = useState(false);
  const [etat, action, enCours] = useActionState<EtatLot, FormData>(creerLot, {});

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
        + Ajouter un lot
      </button>
    );
  }

  return (
    <form ref={formulaire} action={action} className="rounded-2xl border border-pink-200 bg-white p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-semibold">Nouveau lot</h2>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          className="text-sm text-pink-600 hover:underline"
        >
          Fermer
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="text-foreground/70">Libellé annoncé à la gagnante *</span>
          <input
            name="libelle"
            required
            placeholder="Un vernis offert"
            className="mt-1 w-full rounded-xl border border-pink-200 px-3 py-2 outline-none focus:border-pink-500"
          />
        </label>
        <label className="block text-sm">
          <span className="text-foreground/70">Texte sur la roue * (court)</span>
          <input
            name="texteSurRoue"
            required
            maxLength={16}
            placeholder="Vernis"
            className="mt-1 w-full rounded-xl border border-pink-200 px-3 py-2 outline-none focus:border-pink-500"
          />
        </label>
        <label className="block text-sm">
          <span className="text-foreground/70">Chance (poids) *</span>
          <input
            name="chance"
            type="number"
            min={0}
            defaultValue={10}
            required
            className="mt-1 w-full rounded-xl border border-pink-200 px-3 py-2 outline-none focus:border-pink-500"
          />
        </label>
        <label className="block text-sm">
          <span className="text-foreground/70">Couleur du quartier</span>
          <input
            name="couleur"
            type="color"
            defaultValue="#f9a8d4"
            className="mt-1 h-10 w-full rounded-xl border border-pink-200 px-1"
          />
        </label>
        <label className="flex items-center gap-3 text-sm sm:mt-6">
          <input type="checkbox" name="aRetirerAuSalon" defaultChecked className="accent-pink-500" />
          <span>À retirer au salon</span>
        </label>
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
        {enCours ? "Enregistrement…" : "Ajouter ce lot"}
      </button>
    </form>
  );
}
