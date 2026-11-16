"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Pendant que la cliente règle son acompte (dans un autre onglet ou depuis son
// e-mail), la page de sa demande guette le paiement et se met à jour toute
// seule. Elle vérifie aussi en revenant au premier plan : c'est le moment où la
// cliente la regarde.

const INTERVALLE_MS = 5_000;
const DUREE_MAX_MS = 30 * 60 * 1000;

export default function SuiviAcompte({ rendezVousId }: { rendezVousId: string }) {
  const router = useRouter();

  useEffect(() => {
    const debut = Date.now();
    let fini = false;

    async function verifier() {
      if (fini || document.visibilityState !== "visible") return;
      try {
        const reponse = await fetch(`/api/acompte/${rendezVousId}`, { cache: "no-store" });
        const { regle } = (await reponse.json()) as { regle?: boolean };
        if (regle) {
          fini = true;
          router.refresh();
        }
      } catch {
        // Réseau coupé : on réessaiera au prochain tour.
      }
    }

    const minuterie = setInterval(() => {
      if (Date.now() - debut > DUREE_MAX_MS) clearInterval(minuterie);
      else verifier();
    }, INTERVALLE_MS);
    document.addEventListener("visibilitychange", verifier);
    return () => {
      fini = true;
      clearInterval(minuterie);
      document.removeEventListener("visibilitychange", verifier);
    };
  }, [rendezVousId, router]);

  return null;
}
