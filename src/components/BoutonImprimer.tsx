"use client";

/** Ouvre la fenêtre d'impression : « Enregistrer au format PDF » y est proposé. */
export default function BoutonImprimer({ libelle = "Imprimer ou enregistrer en PDF" }: { libelle?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full bg-pink-500 px-5 py-2 text-sm font-medium text-white hover:bg-pink-600"
    >
      🖨 {libelle}
    </button>
  );
}
