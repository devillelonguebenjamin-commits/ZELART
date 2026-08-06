"use client";

import { useId, useState } from "react";

/**
 * Petit « i » cliquable à côté d'un intitulé de catégorie, qui déplie sa
 * définition.
 *
 * Cliquable et non survolable : au doigt, une bulle au survol ne s'ouvre
 * jamais vraiment. Le texte déplié reste dans le flux plutôt qu'en calque —
 * il ne peut donc masquer ni déborder de rien, et se lit aussi bien sur un
 * téléphone que sur un écran large.
 */
export default function InfoPrestation({
  titre,
  definition,
}: {
  titre: string;
  definition: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const idPanneau = useId();

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        aria-controls={idPanneau}
        aria-label={`Qu'est-ce que « ${titre} » ?`}
        className={`inline-flex size-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition ${
          ouvert
            ? "border-pink-500 bg-pink-500 text-white"
            : "border-pink-300 text-pink-500 hover:bg-pink-50"
        }`}
      >
        <span aria-hidden>i</span>
      </button>

      {ouvert && (
        <p
          id={idPanneau}
          className="mt-2 basis-full rounded-xl bg-pink-50 px-4 py-3 text-sm leading-relaxed text-foreground/80"
        >
          {definition}
        </p>
      )}
    </>
  );
}
