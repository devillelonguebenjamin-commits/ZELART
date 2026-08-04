"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { lancerRoue, testerRoue, type ResultatRoue } from "@/actions/roue";
import { partEffective, progressionJauge, toursDisponibles, type LotPublic } from "@/lib/roue";

type Props = {
  lots: LotPublic[];
  posesParTour: number;
  posesRealisees: number;
  toursJoues: number;
  /** Mode essai : la gérante peut lancer autant de fois qu'elle veut, sans gain enregistré. */
  essai?: boolean;
};

const TOURS_ANIMATION = 6;
const DUREE_MS = 4200;

export default function RoueFidelite({
  lots,
  posesParTour,
  posesRealisees,
  toursJoues,
  essai = false,
}: Props) {
  const router = useRouter();
  const [rotation, setRotation] = useState(0);
  const [enCours, setEnCours] = useState(false);
  const [gagne, setGagne] = useState<{ lot: LotPublic; code: string } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const part = 360 / Math.max(1, lots.length);
  const tours = toursDisponibles(posesRealisees, toursJoues, posesParTour);
  const remplissage = progressionJauge(posesRealisees, toursJoues, posesParTour);
  const jaugePleine = essai || tours > 0;

  async function jouer() {
    setEnCours(true);
    setErreur(null);
    setGagne(null);

    const resultat: ResultatRoue = essai ? await testerRoue() : await lancerRoue();
    if (!resultat.ok) {
      setErreur(resultat.message);
      setEnCours(false);
      return;
    }

    const index = lots.findIndex((l) => l.id === resultat.lotId);
    const lot = lots[index];
    if (!lot) {
      setErreur("Ce lot n'est plus disponible.");
      setEnCours(false);
      return;
    }

    // On repart de la position courante pour enchaîner plusieurs tours sans à-coup.
    const base = Math.ceil(rotation / 360) * 360;
    const cible = 360 - (index * part + part / 2);
    setRotation(base + TOURS_ANIMATION * 360 + cible);

    const reduit =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    window.setTimeout(
      () => {
        setGagne({ lot, code: resultat.code });
        setEnCours(false);
        if (!essai) router.refresh();
      },
      reduit ? 200 : DUREE_MS
    );
  }

  if (lots.length === 0) {
    return (
      <section className="rounded-3xl bg-pink-50 p-6 text-center text-sm text-foreground/70">
        La roue de fidélité est momentanément indisponible.
      </section>
    );
  }

  return (
    <section className="rounded-3xl bg-gradient-to-b from-pink-100 to-pink-50 p-6 text-center sm:p-8">
      <h2 className="font-display text-2xl font-bold">
        {essai ? "Essayer la roue 🎡" : "Votre carte de fidélité 🎡"}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-foreground/75">
        {essai ? (
          <>
            Lancez autant d&rsquo;essais que vous voulez : <strong>aucun gain n&rsquo;est
            enregistré</strong> et aucune jauge n&rsquo;est consommée.
          </>
        ) : (
          <>
            {posesParTour} poses réalisées = un tour de roue, et la roue est{" "}
            <strong>toujours gagnante</strong>.
          </>
        )}
      </p>

      {!essai && (
        <>
          <div className="mx-auto mt-5 flex max-w-xs items-center gap-2">
            {Array.from({ length: posesParTour }, (_, i) => (
              <span
                key={i}
                aria-hidden
                className={`h-3 flex-1 rounded-full transition-all duration-500 ${
                  i < remplissage ? "bg-pink-500" : "bg-white/70"
                }`}
              />
            ))}
          </div>
          <p className="mt-2 text-sm font-medium">
            {tours > 0
              ? `Jauge pleine — ${tours} tour${tours > 1 ? "s" : ""} vous attend${tours > 1 ? "ent" : ""} !`
              : `${remplissage} / ${posesParTour} poses — plus que ${posesParTour - remplissage} avant votre tour de roue`}
          </p>
        </>
      )}

      <div className="relative mx-auto mt-6 w-56 sm:w-64">
        <div
          className="absolute left-1/2 top-0 z-10 -ml-3 h-0 w-0"
          style={{
            borderLeft: "12px solid transparent",
            borderRight: "12px solid transparent",
            borderTop: "20px solid #be185d",
          }}
          aria-hidden
        />
        <svg
          viewBox="0 0 200 200"
          className="w-full drop-shadow-lg"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: `transform ${DUREE_MS}ms cubic-bezier(0.16, 0.84, 0.28, 1)`,
          }}
          role="img"
          aria-label="Roue de la fidélité"
        >
          <circle cx="100" cy="100" r="100" fill="#fff" />
          {lots.map((lot, index) => {
            const debut = (index * part - 90) * (Math.PI / 180);
            const fin = ((index + 1) * part - 90) * (Math.PI / 180);
            const grandArc = part > 180 ? 1 : 0;
            const x1 = 100 + 100 * Math.cos(debut);
            const y1 = 100 + 100 * Math.sin(debut);
            const x2 = 100 + 100 * Math.cos(fin);
            const y2 = 100 + 100 * Math.sin(fin);
            // Texte horizontal, posé sur la bissectrice du quartier.
            const milieu = (index * part + part / 2) * (Math.PI / 180);
            const xTexte = 100 + 58 * Math.sin(milieu);
            const yTexte = 100 - 58 * Math.cos(milieu);

            return (
              <g key={lot.id}>
                <path
                  d={
                    lots.length === 1
                      ? "M100,0 A100,100 0 1 1 99.9,0 Z"
                      : `M100,100 L${x1},${y1} A100,100 0 ${grandArc} 1 ${x2},${y2} Z`
                  }
                  fill={lot.couleur}
                  stroke="#fff"
                  strokeWidth="2"
                />
                <text
                  x={xTexte}
                  y={yTexte + 4}
                  fill="#43242f"
                  fontSize="11"
                  fontWeight="700"
                  textAnchor="middle"
                >
                  {lot.texteSurRoue}
                </text>
              </g>
            );
          })}
          <circle cx="100" cy="100" r="16" fill="#fff" stroke="#f9a8d4" strokeWidth="3" />
          <text x="100" y="105" fontSize="14" textAnchor="middle">
            💅
          </text>
        </svg>
      </div>

      {gagne && (
        <div className="mx-auto mt-6 max-w-md rounded-2xl border-2 border-pink-300 bg-white px-6 py-5">
          <p className="text-3xl">🎉</p>
          <p className="font-display mt-2 text-xl font-bold text-pink-600">{gagne.lot.libelle}</p>
          {essai ? (
            <p className="mt-3 text-sm text-foreground/70">
              Tirage d&rsquo;essai — rien n&rsquo;a été enregistré.
            </p>
          ) : (
            <>
              <p className="mt-3 inline-block rounded-xl border-2 border-dashed border-pink-300 px-4 py-2 font-mono text-lg font-bold tracking-wider">
                {gagne.code}
              </p>
              <p className="mt-3 text-sm text-foreground/70">
                {gagne.lot.aRetirerAuSalon
                  ? "Présentez ce code à Zélia lors de votre prochain rendez-vous."
                  : "Zélia vous transmettra le code promo à votre prochaine venue."}
              </p>
            </>
          )}
        </div>
      )}

      {(!gagne || essai) && (
        <button
          type="button"
          onClick={jouer}
          disabled={!jaugePleine || enCours}
          className="mt-6 rounded-full bg-pink-500 px-8 py-3 text-lg font-medium text-white shadow-md transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {enCours
            ? "La roue tourne…"
            : essai
              ? gagne
                ? "Relancer un essai"
                : "Lancer un essai"
              : jaugePleine
                ? "Lancer la roue ✨"
                : "Jauge incomplète"}
        </button>
      )}

      {erreur && (
        <p role="alert" className="mx-auto mt-4 max-w-md rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {erreur}
        </p>
      )}

      <details className="mx-auto mt-6 max-w-md text-left text-xs text-foreground/60">
        <summary className="cursor-pointer text-center">Chances de gagner</summary>
        <ul className="mt-2 space-y-1">
          {lots.map((lot) => (
            <li key={lot.id} className="flex justify-between gap-4">
              <span>{lot.libelle}</span>
              <span className="font-medium">{partEffective(lot, lots).toFixed(1)} %</span>
            </li>
          ))}
        </ul>
        <p className="mt-2">
          Le tirage est effectué par le site au moment du clic ; l&rsquo;animation ne fait
          qu&rsquo;afficher le résultat. Une pose compte dès qu&rsquo;elle est marquée comme
          réalisée.
        </p>
      </details>
    </section>
  );
}
