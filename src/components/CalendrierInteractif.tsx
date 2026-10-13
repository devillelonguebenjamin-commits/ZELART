"use client";

import { useRef, useState } from "react";

/** Retient un choix d'affichage pour un an, lisible par le serveur. */
function retenir(nom: string, valeur: string) {
  document.cookie = `${nom}=${valeur}; path=/admin; max-age=31536000; samesite=lax`;
}

export type StatutLegende = { cle: string; libelle: string; teinte: string };

/**
 * Les commandes du calendrier : la légende devient un filtre, et un bouton
 * déplie ou replie le détail de tous les jours.
 *
 * Le masquage passe par une feuille de style plutôt que par un nouveau rendu :
 * la grille reste rendue côté serveur, chaque case porte son statut
 * (`data-statut`), et une règle CSS par statut masqué suffit. Les choix sont
 * retenus dans des cookies, lus par le serveur pour que la page s'affiche
 * d'emblée comme Zélia l'a laissée, sans clignotement.
 */
export default function CalendrierInteractif({
  legende,
  masquesInitiaux,
  detailInitial,
  children,
}: {
  legende: StatutLegende[];
  masquesInitiaux: string[];
  detailInitial: boolean;
  children: React.ReactNode;
}) {
  const [masques, setMasques] = useState<string[]>(masquesInitiaux);
  const [detail, setDetail] = useState(detailInitial);
  const grille = useRef<HTMLDivElement>(null);

  function basculer(cle: string) {
    const suivants = masques.includes(cle) ? masques.filter((m) => m !== cle) : [...masques, cle];
    setMasques(suivants);
    // « aucun » plutôt qu'une valeur vide : un cookie vide se confondrait avec
    // une première visite, où les annulés sont masqués par défaut.
    retenir("cal_masques", suivants.length ? suivants.join(",") : "aucun");
  }

  function basculerDetail() {
    const suivant = !detail;
    setDetail(suivant);
    retenir("cal_detail", suivant ? "1" : "0");
    grille.current
      ?.querySelectorAll<HTMLDetailsElement>("details[data-jour]")
      .forEach((d) => (d.open = suivant));
  }

  return (
    <div className="cal-zelart">
      <style>
        {masques.map((m) => `.cal-zelart [data-statut="${m}"]{display:none}`).join("")}
      </style>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-foreground/55">Afficher :</span>
        {legende.map((s) => {
          const visible = !masques.includes(s.cle);
          return (
            <button
              key={s.cle}
              type="button"
              aria-pressed={visible}
              onClick={() => basculer(s.cle)}
              title={visible ? `Masquer : ${s.libelle}` : `Afficher : ${s.libelle}`}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition ${
                visible
                  ? "border-pink-200 bg-white text-foreground/80"
                  : "border-dashed border-stone-300 bg-transparent text-foreground/40 line-through"
              }`}
            >
              <span className={`h-3 w-3 rounded-sm ${s.teinte}`} />
              {s.libelle}
            </button>
          );
        })}
        <button
          type="button"
          onClick={basculerDetail}
          className="ml-auto rounded-full border border-pink-200 px-3 py-1 font-medium text-pink-700 transition hover:bg-pink-50"
        >
          {detail ? "Replier tous les jours ▴" : "Déplier tous les jours ▾"}
        </button>
      </div>

      <div ref={grille}>{children}</div>
    </div>
  );
}
