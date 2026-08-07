"use client";

import { useState, useTransition } from "react";
import { supprimerCliente } from "@/actions/clientes";

// Suppression depuis la liste, en deux temps.
//
// La fiche détaillée expose déjà un bouton de suppression, mais dans une section
// « danger » qu'on atteint délibérément. Ici la croix est à portée de souris,
// entre deux lignes : sans confirmation, un clic manqué effacerait une cliente
// et tout son historique — rendez-vous, avantages, commandes —, sans retour
// possible. La confirmation rappelle donc ce qui disparaît.
export default function BoutonSupprimerCliente({
  clienteId,
  nom,
  nbRendezVous,
}: {
  clienteId: string;
  nom: string;
  nbRendezVous: number;
}) {
  const [confirme, setConfirme] = useState(false);
  const [enCours, demarrer] = useTransition();

  if (!confirme) {
    return (
      <button
        type="button"
        onClick={() => setConfirme(true)}
        aria-label={`Supprimer la fiche de ${nom}`}
        title={`Supprimer la fiche de ${nom}`}
        className="rounded-full px-2 py-1 text-base leading-none text-foreground/30 transition hover:bg-red-50 hover:text-red-600"
      >
        ×
      </button>
    );
  }

  return (
    <span className="flex flex-col items-end gap-1">
      <span className="whitespace-nowrap text-xs text-red-700">
        Supprimer ?
        {nbRendezVous > 0 && (
          <span className="block text-foreground/60">
            {nbRendezVous} rendez-vous perdu{nbRendezVous > 1 ? "s" : ""}
          </span>
        )}
      </span>
      <span className="flex gap-1">
        <button
          type="button"
          disabled={enCours}
          onClick={() => demarrer(async () => void (await supprimerCliente(clienteId)))}
          className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
        >
          {enCours ? "…" : "Oui"}
        </button>
        <button
          type="button"
          onClick={() => setConfirme(false)}
          className="rounded-full border border-pink-200 px-2.5 py-1 text-xs font-medium text-foreground/70 transition hover:bg-pink-50"
        >
          Non
        </button>
      </span>
    </span>
  );
}
