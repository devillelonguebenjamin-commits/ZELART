"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { annulerParCliente, type EtatAnnulation } from "@/actions/annulation";

export default function BoutonAnnulation({ rendezVousId }: { rendezVousId: string }) {
  const router = useRouter();
  const [confirme, setConfirme] = useState(false);
  const [enCours, demarrer] = useTransition();
  const [etat, setEtat] = useState<EtatAnnulation | null>(null);

  function annuler() {
    demarrer(async () => {
      const resultat = await annulerParCliente(rendezVousId);
      setEtat(resultat);
      setConfirme(false);
      if (resultat.ok) router.refresh();
    });
  }

  if (etat?.message) {
    return (
      <p
        role="status"
        className={`mt-3 rounded-xl px-4 py-2 text-sm ${
          etat.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
        }`}
      >
        {etat.message}
      </p>
    );
  }

  if (!confirme) {
    return (
      <button
        type="button"
        onClick={() => setConfirme(true)}
        className="mt-3 text-xs text-foreground/50 underline hover:text-pink-600"
      >
        Annuler ce rendez-vous
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl bg-pink-50 px-4 py-3 text-sm">
      <p>Confirmez-vous l&rsquo;annulation ? Le créneau sera aussitôt proposé à une autre cliente.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={annuler}
          disabled={enCours}
          className="rounded-full bg-pink-500 px-5 py-1.5 text-xs font-medium text-white transition hover:bg-pink-600 disabled:opacity-50"
        >
          {enCours ? "Annulation…" : "Oui, annuler"}
        </button>
        <button
          type="button"
          onClick={() => setConfirme(false)}
          disabled={enCours}
          className="rounded-full border border-pink-200 px-5 py-1.5 text-xs text-pink-600 transition hover:bg-white"
        >
          Garder mon rendez-vous
        </button>
      </div>
    </div>
  );
}
