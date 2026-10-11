"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { classerSansPrevenir } from "@/actions/retablissement";

/**
 * La croix d'une ligne « Annulations à vérifier » : l'annulation reste en
 * place, la ligne disparaît, et **aucun message ne part**.
 *
 * En deux temps, parce qu'une croix se clique par mégarde et que l'autre geste
 * de la ligne, « Laisser annulé · prévenir la cliente », écrit à la cliente :
 * la question dit lequel des deux on s'apprête à faire.
 */
export default function BoutonClasser({ rendezVousId }: { rendezVousId: string }) {
  const [demande, setDemande] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const router = useRouter();

  function confirmer() {
    demarrer(async () => {
      const etat = await classerSansPrevenir(rendezVousId);
      if (etat.ok) router.refresh();
      else setErreur(etat.message ?? "Impossible de retirer cette ligne.");
    });
  }

  if (!demande) {
    return (
      <button
        type="button"
        onClick={() => setDemande(true)}
        aria-label="Retirer de la liste sans prévenir la cliente"
        title="Retirer de la liste sans prévenir la cliente"
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-lg leading-none text-foreground/40 transition hover:bg-red-50 hover:text-red-700"
      >
        ×
      </button>
    );
  }

  return (
    <div className="absolute right-2 top-2 z-10 flex max-w-[calc(100%-1rem)] flex-wrap items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs shadow-sm">
      <span className="font-medium text-foreground/80">Laisser annulé, sans prévenir la cliente ?</span>
      <button
        type="button"
        disabled={enCours}
        onClick={confirmer}
        className="rounded-full bg-red-600 px-3 py-1 font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
      >
        {enCours ? "…" : "Oui, retirer"}
      </button>
      <button
        type="button"
        disabled={enCours}
        onClick={() => setDemande(false)}
        className="rounded-full border border-stone-300 px-3 py-1 font-medium text-foreground/70 transition hover:bg-stone-50"
      >
        Non
      </button>
      {erreur && <span role="status" className="basis-full text-red-700">{erreur}</span>}
    </div>
  );
}
