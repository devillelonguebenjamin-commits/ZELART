"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { demanderAnnulation, type EtatAnnulation } from "@/actions/annulation";

// La cliente demande l'annulation ; c'est Zélia qui la valide.
export default function BoutonAnnulation({ rendezVousId }: { rendezVousId: string }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [motif, setMotif] = useState("");
  const [enCours, demarrer] = useTransition();
  const [etat, setEtat] = useState<EtatAnnulation | null>(null);

  function envoyer() {
    demarrer(async () => {
      const resultat = await demanderAnnulation(rendezVousId, motif);
      setEtat(resultat);
      setOuvert(false);
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

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="mt-3 text-xs text-foreground/50 underline hover:text-pink-600"
      >
        Demander l&rsquo;annulation
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl bg-pink-50 px-4 py-3 text-sm">
      <p>
        Votre demande est envoyée à Zélia, qui vous confirmera l&rsquo;annulation par e-mail et
        SMS. D&rsquo;ici là, le rendez-vous reste réservé.
      </p>
      <label className="mt-2 block text-xs text-foreground/70">
        Un mot pour Zélia (facultatif)
        <textarea
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          rows={2}
          maxLength={500}
          className="mt-1 w-full rounded-lg border border-pink-200 bg-white px-3 py-2 text-sm outline-none focus:border-pink-500"
        />
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={envoyer}
          disabled={enCours}
          className="rounded-full bg-pink-500 px-5 py-1.5 text-xs font-medium text-white transition hover:bg-pink-600 disabled:opacity-50"
        >
          {enCours ? "Envoi…" : "Envoyer la demande"}
        </button>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          disabled={enCours}
          className="rounded-full border border-pink-200 px-5 py-1.5 text-xs text-pink-600 transition hover:bg-white"
        >
          Garder mon rendez-vous
        </button>
      </div>
    </div>
  );
}
