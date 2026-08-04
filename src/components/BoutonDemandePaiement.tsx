"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { envoyerDemandePaiement, type EtatEnvoiPaiement } from "@/actions/admin-press-on";

export default function BoutonDemandePaiement({
  commandeId,
  dejaEnvoye,
}: {
  commandeId: string;
  dejaEnvoye: boolean;
}) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [etat, setEtat] = useState<EtatEnvoiPaiement | null>(null);

  function envoyer() {
    demarrer(async () => {
      const resultat = await envoyerDemandePaiement(commandeId);
      setEtat(resultat);
      if (resultat.ok) router.refresh();
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={envoyer}
        disabled={enCours}
        className="rounded-full bg-pink-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-pink-600 disabled:opacity-50"
      >
        {enCours
          ? "Envoi…"
          : dejaEnvoye
            ? "Renvoyer la demande de règlement"
            : "Envoyer la demande de règlement"}
      </button>

      {etat?.message && (
        <p
          role="status"
          className={`mt-3 rounded-xl px-4 py-2 text-sm ${
            etat.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
          }`}
        >
          {etat.message}
        </p>
      )}
    </div>
  );
}
