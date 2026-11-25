"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  refuserAnnulation,
  validerAnnulation,
  type EtatDemandeAnnulation,
} from "@/actions/demande-annulation";

export default function ReponseDemandeAnnulation({ rendezVousId }: { rendezVousId: string }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [etat, setEtat] = useState<EtatDemandeAnnulation | null>(null);

  function repondre(action: typeof validerAnnulation) {
    demarrer(async () => setEtat(await action(rendezVousId)));
  }

  if (etat?.message) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <p
          role="status"
          className={`rounded-xl px-3 py-1.5 text-xs ${
            etat.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
          }`}
        >
          {etat.message}
        </p>
        <button
          type="button"
          onClick={() => router.refresh()}
          className="rounded-full border border-pink-200 px-3 py-1 text-xs text-pink-600 hover:bg-pink-50"
        >
          OK
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={enCours}
        onClick={() => repondre(validerAnnulation)}
        className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        {enCours ? "…" : "Valider l’annulation"}
      </button>
      <button
        type="button"
        disabled={enCours}
        onClick={() => repondre(refuserAnnulation)}
        className="rounded-full border border-pink-200 bg-white px-4 py-1.5 text-xs text-pink-600 hover:bg-pink-50 disabled:opacity-50"
      >
        Refuser · maintenir le rendez-vous
      </button>
    </div>
  );
}
