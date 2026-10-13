"use client";

import { useState, useTransition } from "react";
import { repondreProposition, type EtatDecalage } from "@/actions/decalage";

/** Les deux réponses possibles ; le résultat remplace les boutons. */
export default function ReponseDecalage({ jeton }: { jeton: string }) {
  const [etat, setEtat] = useState<EtatDecalage | null>(null);
  const [enCours, demarrer] = useTransition();

  function repondre(accepte: boolean) {
    demarrer(async () => setEtat(await repondreProposition(jeton, accepte)));
  }

  if (etat) {
    return (
      <p
        role="status"
        className={`mt-6 rounded-2xl px-5 py-4 text-sm font-medium ${
          etat.ok ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"
        }`}
      >
        {etat.message}
      </p>
    );
  }

  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <button
        type="button"
        disabled={enCours}
        onClick={() => repondre(true)}
        className="rounded-full bg-pink-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-pink-600 disabled:opacity-60"
      >
        {enCours ? "…" : "J'accepte le nouvel horaire"}
      </button>
      <button
        type="button"
        disabled={enCours}
        onClick={() => repondre(false)}
        className="rounded-full border border-pink-200 px-6 py-3 text-sm font-medium text-pink-700 transition hover:bg-pink-50 disabled:opacity-60"
      >
        Je garde mon horaire
      </button>
    </div>
  );
}
