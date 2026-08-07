"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { REMISE_FILLEULE_POURCENT } from "@/lib/parrainage-bareme";

// Le partage natif ouvre la feuille du système — WhatsApp, SMS, Instagram,
// tout ce que la personne a installé. Il n'existe pas partout, surtout sur
// ordinateur.
//
// La capacité est lue par `useSyncExternalStore` plutôt que par un effet : le
// rendu serveur répond « non », l'hydratation rétablit la vérité, et le bouton
// n'apparaît jamais pour disparaître aussitôt. Rien à surveiller ensuite, d'où
// l'abonnement vide.
const NE_CHANGE_PAS = () => () => {};

function usePartageNatif(): boolean {
  return useSyncExternalStore(
    NE_CHANGE_PAS,
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    () => false
  );
}

export default function PartageCodeParrainage({
  code,
  lien,
}: {
  code: string;
  lien: string;
}) {
  const [copie, setCopie] = useState(false);
  const partageDispo = usePartageNatif();
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (minuteur.current) clearTimeout(minuteur.current);
    };
  }, []);

  const message = `Je vais chez Zelart Nails à Saint-Nazaire 💅 Avec mon code ${code}, tu as −${REMISE_FILLEULE_POURCENT} % sur ta première prestation : ${lien}`;

  async function copier() {
    try {
      await navigator.clipboard.writeText(message);
      setCopie(true);
      minuteur.current = setTimeout(() => setCopie(false), 2500);
    } catch {
      // Presse-papiers refusé (navigation privée, permission) : on sélectionne
      // le texte pour que la copie manuelle reste possible.
      const zone = document.createElement("textarea");
      zone.value = message;
      document.body.appendChild(zone);
      zone.select();
      zone.setSelectionRange(0, message.length);
      document.execCommand("copy");
      zone.remove();
      setCopie(true);
      minuteur.current = setTimeout(() => setCopie(false), 2500);
    }
  }

  async function partager() {
    try {
      await navigator.share({ title: "Zelart Nails", text: message, url: lien });
    } catch {
      // Partage refusé ou annulé : rien à signaler, la personne a choisi.
    }
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={copier}
        className="inline-flex items-center gap-2 rounded-full border border-pink-300 bg-white px-4 py-2 text-sm font-medium text-pink-600 transition hover:bg-pink-50"
      >
        <svg aria-hidden width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="11" height="11" rx="2.5" />
          <path d="M5 15V6a2.5 2.5 0 0 1 2.5-2.5H15" />
        </svg>
        {copie ? "Copié ✓" : "Copier mon invitation"}
      </button>

      {partageDispo && (
        <button
          type="button"
          onClick={partager}
          className="inline-flex items-center gap-2 rounded-full bg-pink-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-pink-600"
        >
          <svg aria-hidden width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
          </svg>
          Partager
        </button>
      )}

      {/* Message annoncé aux lecteurs d'écran, qui ne voient pas le « ✓ ». */}
      <span aria-live="polite" className="sr-only">
        {copie ? "Invitation copiée dans le presse-papiers" : ""}
      </span>
    </div>
  );
}
