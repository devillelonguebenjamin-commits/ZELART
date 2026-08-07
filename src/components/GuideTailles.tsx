"use client";

import { useState } from "react";

// Guide de mesure des ongles.
//
// Deux contraintes ont dicté la forme :
//   - il vit à l'intérieur du <form> de commande, ses champs n'ont donc **aucun
//     attribut `name`** : ils seraient envoyés avec la commande et brouilleraient
//     les données réelles. Ils ne servent qu'à composer le texte du champ
//     « mesures », que le parent possède ;
//   - le report est déclenché par un bouton plutôt qu'à chaque frappe : une
//     cliente qui a déjà écrit une précision à la main ne doit pas la voir
//     disparaître sous ses yeux.

const DOIGTS = ["Pouce", "Index", "Majeur", "Annulaire", "Auriculaire"] as const;
const MAINS = ["Main gauche", "Main droite"] as const;

type Cle = `${number}-${number}`;

export default function GuideTailles({ onReporter }: { onReporter: (texte: string) => void }) {
  const [ouvert, setOuvert] = useState(false);
  const [valeurs, setValeurs] = useState<Record<string, string>>({});
  const [reporte, setReporte] = useState(false);

  const cle = (main: number, doigt: number): Cle => `${main}-${doigt}`;

  function saisir(main: number, doigt: number, valeur: string) {
    setValeurs((precedentes) => ({ ...precedentes, [cle(main, doigt)]: valeur }));
    setReporte(false);
  }

  function reporter() {
    const lignes = MAINS.map((nomMain, m) => {
      const mesures = DOIGTS.map((nomDoigt, d) => {
        const valeur = valeurs[cle(m, d)]?.trim();
        return valeur ? `${nomDoigt} ${valeur}` : null;
      }).filter(Boolean);
      return mesures.length > 0 ? `${nomMain} : ${mesures.join(", ")} (mm)` : null;
    }).filter(Boolean);

    if (lignes.length === 0) return;
    // Le champ d'arrivée est plafonné à 300 caractères, côté serveur comme dans
    // le formulaire : une saisie fantaisiste ne doit pas produire un texte que
    // la validation refusera ensuite, sans que la cliente comprenne pourquoi.
    onReporter(lignes.join(" · ").slice(0, 300));
    setReporte(true);
  }

  const rempli = Object.values(valeurs).some((v) => v.trim() !== "");

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="mt-3 text-sm font-medium text-pink-600 hover:underline"
      >
        📏 Comment prendre mes mesures ?
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-pink-200 bg-pink-50/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="font-display text-lg font-bold">Prendre ses mesures</p>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          className="text-xs text-foreground/60 underline hover:text-pink-600"
        >
          Replier
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-start gap-5">
        {/* Où mesurer : un dessin dit en un coup d'œil ce qu'un paragraphe
            expliquerait mal — la largeur, pas la longueur. */}
        <svg
          viewBox="0 0 120 150"
          className="h-32 w-auto shrink-0"
          role="img"
          aria-label="Ongle vu de dessus, mesuré dans sa largeur à l'endroit le plus large"
        >
          <path
            d="M30 40 Q30 15 60 15 Q90 15 90 40 L88 105 Q88 125 60 125 Q32 125 32 105 Z"
            fill="#fdf2f8"
            stroke="#f9a8d4"
            strokeWidth="2.5"
          />
          <path d="M30 40 Q60 28 90 40" fill="none" stroke="#f9a8d4" strokeWidth="1.5" />
          <line x1="24" y1="47" x2="96" y2="47" stroke="#ec4899" strokeWidth="2.5" />
          <path d="M24 47 l7 -5 v10 z" fill="#ec4899" />
          <path d="M96 47 l-7 -5 v10 z" fill="#ec4899" />
          <text x="60" y="72" textAnchor="middle" fill="#be185d" fontSize="14" fontWeight="600">
            largeur
          </text>
          <text x="60" y="90" textAnchor="middle" fill="#be185d" fontSize="11">
            en mm
          </text>
        </svg>

        <ol className="min-w-56 flex-1 space-y-2 text-sm text-foreground/80">
          <li>
            <strong>1.</strong> Mesurez la <strong>largeur</strong>{" "}
            de chaque ongle, jamais la longueur — c&rsquo;est elle qui décide de la taille de la capsule.
          </li>
          <li>
            <strong>2.</strong> Placez le réglet à l&rsquo;endroit <strong>le plus large</strong>,
            d&rsquo;un bord de peau à l&rsquo;autre.
          </li>
          <li>
            <strong>3.</strong>{" "}
            Pas de réglet ? Entourez l&rsquo;ongle d&rsquo;une fine bande de papier, marquez au stylo, dépliez et mesurez sur une règle d&rsquo;écolier.
          </li>
          <li>
            <strong>4.</strong> Arrondissez au demi-millimètre. Les deux mains diffèrent souvent :
            mesurez-les toutes les deux.
          </li>
        </ol>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {MAINS.map((nomMain, m) => (
          <fieldset key={nomMain}>
            <legend className="text-sm font-medium">{nomMain}</legend>
            <div className="mt-2 space-y-1.5">
              {DOIGTS.map((nomDoigt, d) => (
                <label key={nomDoigt} className="flex items-center gap-2 text-sm">
                  <span className="w-24 shrink-0 text-foreground/70">{nomDoigt}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={5}
                    max={25}
                    step={0.5}
                    value={valeurs[cle(m, d)] ?? ""}
                    onChange={(e) => saisir(m, d, e.target.value)}
                    className="w-20 rounded-lg border border-pink-200 bg-white px-2 py-1 outline-none focus:border-pink-500"
                  />
                  <span className="text-xs text-foreground/50">mm</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={reporter}
          disabled={!rempli}
          className="rounded-full bg-pink-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Reporter dans ma commande
        </button>
        {reporte && (
          <span role="status" className="text-sm font-medium text-emerald-700">
            Mesures reportées ci-dessous ✓
          </span>
        )}
      </div>

      <p className="mt-3 text-xs text-foreground/60">
        Pas sûre de vous ? Laissez le champ vide et écrivez-le : Zélia vous prêtera un kit de
        taille, ou vous guidera par message.
      </p>
    </div>
  );
}
