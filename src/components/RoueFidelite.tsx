"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { lancerRoue } from "@/actions/roue";
import { LOTS, lotParId, POSES_PAR_TOUR, progressionJauge, toursDisponibles } from "@/lib/roue";
import type { LotRoue } from "@/generated/prisma/client";

type Props = { posesRealisees: number; toursJoues: number };

const TOURS_ANIMATION = 6;
const DUREE_MS = 4200;
const PART = 360 / LOTS.length;

// Quartier centré sous le curseur, placé en haut de la roue.
function angleCible(index: number): number {
  return 360 - (index * PART + PART / 2);
}

function Quartier({ index }: { index: number }) {
  const lot = LOTS[index];
  const debut = (index * PART - 90) * (Math.PI / 180);
  const fin = ((index + 1) * PART - 90) * (Math.PI / 180);
  const r = 100;
  const x1 = 100 + r * Math.cos(debut);
  const y1 = 100 + r * Math.sin(debut);
  const x2 = 100 + r * Math.cos(fin);
  const y2 = 100 + r * Math.sin(fin);
  // Le texte se place sur la bissectrice du quartier, mesurée depuis le haut
  // de la roue — là où pointe le curseur — mais reste horizontal pour rester
  // lisible dans la moitié basse.
  const milieu = (index * PART + PART / 2) * (Math.PI / 180);
  const rayonTexte = 58;
  const xTexte = 100 + rayonTexte * Math.sin(milieu);
  const yTexte = 100 - rayonTexte * Math.cos(milieu);

  return (
    <g>
      <path
        d={`M100,100 L${x1},${y1} A${r},${r} 0 0 1 ${x2},${y2} Z`}
        fill={lot.couleur}
        stroke="#fff"
        strokeWidth="2"
      />
      <text
        x={xTexte}
        y={yTexte + 4}
        fill={index >= 2 ? "#7a2648" : "#fff"}
        fontSize="12"
        fontWeight="700"
        textAnchor="middle"
      >
        {lot.texteSurRoue}
      </text>
    </g>
  );
}

export default function RoueFidelite({ posesRealisees, toursJoues }: Props) {
  const router = useRouter();
  const [rotation, setRotation] = useState(0);
  const [enCours, setEnCours] = useState(false);
  const [gagne, setGagne] = useState<{ lot: LotRoue; code: string } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const tours = toursDisponibles(posesRealisees, toursJoues);
  const remplissage = progressionJauge(posesRealisees, toursJoues);
  const jaugePleine = tours > 0;

  async function jouer() {
    setEnCours(true);
    setErreur(null);
    setGagne(null);

    const resultat = await lancerRoue();
    if (!resultat.ok) {
      setErreur(resultat.message);
      setEnCours(false);
      return;
    }

    const index = LOTS.findIndex((l) => l.id === resultat.lot);
    // On repart de la position courante pour enchaîner plusieurs tours sans à-coup.
    const base = Math.ceil(rotation / 360) * 360;
    setRotation(base + TOURS_ANIMATION * 360 + angleCible(index));

    const reduit =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    window.setTimeout(
      () => {
        setGagne({ lot: resultat.lot, code: resultat.code });
        setEnCours(false);
        router.refresh();
      },
      reduit ? 200 : DUREE_MS
    );
  }

  return (
    <section className="rounded-3xl bg-gradient-to-b from-pink-100 to-pink-50 p-6 text-center sm:p-8">
      <h2 className="font-display text-2xl font-bold">Votre carte de fidélité 🎡</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-foreground/75">
        {POSES_PAR_TOUR} poses réalisées = un tour de roue, et la roue est{" "}
        <strong>toujours gagnante</strong>.
      </p>

      {/* Jauge */}
      <div className="mx-auto mt-5 flex max-w-xs items-center gap-2">
        {Array.from({ length: POSES_PAR_TOUR }, (_, i) => (
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
        {jaugePleine
          ? `Jauge pleine — ${tours} tour${tours > 1 ? "s" : ""} vous attend${tours > 1 ? "ent" : ""} !`
          : `${remplissage} / ${POSES_PAR_TOUR} poses — plus que ${POSES_PAR_TOUR - remplissage} avant votre tour de roue`}
      </p>

      {/* Roue */}
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
          {LOTS.map((lot, i) => (
            <Quartier key={lot.id} index={i} />
          ))}
          <circle cx="100" cy="100" r="16" fill="#fff" stroke="#f9a8d4" strokeWidth="3" />
          <text x="100" y="105" fontSize="14" textAnchor="middle">
            💅
          </text>
        </svg>
      </div>

      {gagne ? (
        <div className="mx-auto mt-6 max-w-md rounded-2xl border-2 border-pink-300 bg-white px-6 py-5">
          <p className="text-3xl">🎉</p>
          <p className="font-display mt-2 text-xl font-bold text-pink-600">
            {lotParId(gagne.lot).libelle}
          </p>
          <p className="mt-3 inline-block rounded-xl border-2 border-dashed border-pink-300 px-4 py-2 font-mono text-lg font-bold tracking-wider">
            {gagne.code}
          </p>
          <p className="mt-3 text-sm text-foreground/70">
            {lotParId(gagne.lot).aRetirerAuSalon
              ? "Présentez ce code à Zélia lors de votre prochain rendez-vous."
              : "Zélia vous transmettra le code promo à votre prochaine venue."}
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={jouer}
          disabled={!jaugePleine || enCours}
          className="mt-6 rounded-full bg-pink-500 px-8 py-3 text-lg font-medium text-white shadow-md transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {enCours ? "La roue tourne…" : jaugePleine ? "Lancer la roue ✨" : "Jauge incomplète"}
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
          {LOTS.map((lot) => (
            <li key={lot.id} className="flex justify-between gap-4">
              <span>{lot.libelle}</span>
              <span className="font-medium">{lot.chance} %</span>
            </li>
          ))}
        </ul>
        <p className="mt-2">
          Le tirage est effectué par le site au moment du clic ; l&rsquo;animation ne fait
          qu&rsquo;afficher le résultat. Une pose compte dès que Zélia l&rsquo;a marquée comme
          réalisée.
        </p>
      </details>
    </section>
  );
}
