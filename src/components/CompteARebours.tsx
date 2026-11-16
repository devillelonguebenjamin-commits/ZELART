"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Le temps qui reste pour régler l'acompte de la réservation. À zéro, la page
// se recharge un peu plus tard (le temps que SumUp confirme un paiement de
// dernière seconde) et affiche alors l'issue : acompte reçu, ou demande annulée.

const MARGE_MS = 2 * 60 * 1000 + 10_000;

function format(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function CompteARebours({ limite }: { limite: string }) {
  const router = useRouter();
  const fin = new Date(limite).getTime();
  const [reste, setReste] = useState<number | null>(null);

  useEffect(() => {
    const tic = () => setReste(fin - Date.now());
    tic();
    const minuterie = setInterval(tic, 1000);
    const rechargement = setTimeout(() => router.refresh(), Math.max(0, fin - Date.now()) + MARGE_MS);
    return () => {
      clearInterval(minuterie);
      clearTimeout(rechargement);
    };
  }, [fin, router]);

  // Rien avant le premier calcul côté navigateur : l'heure du serveur et celle
  // du téléphone peuvent différer, et un chiffre qui saute surprend.
  if (reste === null) return null;
  return reste > 0 ? (
    <p className="mt-3 text-sm font-semibold text-pink-700" aria-live="polite">
      ⏱ Il vous reste <span className="tabular-nums">{format(reste)}</span> pour régler votre
      acompte.
    </p>
  ) : (
    <p className="mt-3 text-sm font-semibold text-amber-800">
      ⏱ Le délai est écoulé. Si vous venez de payer, la page va se mettre à jour ; sinon, la demande
      sera annulée.
    </p>
  );
}
