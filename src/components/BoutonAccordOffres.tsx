"use client";

import { useTransition } from "react";
import { changerAccordOffres } from "@/actions/espace-cliente";

export default function BoutonAccordOffres({ accepte }: { accepte: boolean }) {
  const [enCours, demarrer] = useTransition();

  return (
    <button
      type="button"
      disabled={enCours}
      onClick={() => demarrer(() => changerAccordOffres(!accepte))}
      className="rounded-full border border-pink-300 px-5 py-2 text-sm font-medium text-pink-600 transition hover:bg-pink-50 disabled:opacity-50"
    >
      {enCours ? "…" : accepte ? "Ne plus recevoir les offres" : "Recevoir les offres"}
    </button>
  );
}
