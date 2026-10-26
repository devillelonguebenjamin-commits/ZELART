// Décor de Noël : guirlande lumineuse, flocons, sapins et cadeaux. Même
// principe que celui d'Halloween : SVG, décoratif, sans clic, immobile quand
// l'appareil demande à limiter les mouvements.

const COULEURS_AMPOULES = ["#ef4444", "#facc15", "#22c55e", "#3b82f6", "#ec4899"];

function Sapin({ taille = 80, className = "" }: { taille?: number; className?: string }) {
  return (
    <svg viewBox="0 0 80 100" width={taille} height={(taille * 100) / 80} aria-hidden className={className}>
      <rect x="35" y="82" width="10" height="14" rx="2" fill="#92400e" />
      <path d="M40 30 L70 84 L10 84 Z" fill="#15803d" />
      <path d="M40 18 L64 62 L16 62 Z" fill="#16a34a" />
      <path d="M40 8 L58 42 L22 42 Z" fill="#22c55e" />
      {/* Boules */}
      <circle cx="30" cy="70" r="3.5" fill="#ef4444" />
      <circle cx="52" cy="74" r="3.5" fill="#facc15" />
      <circle cx="44" cy="52" r="3" fill="#ec4899" />
      <circle cx="33" cy="48" r="3" fill="#3b82f6" />
      <circle cx="47" cy="33" r="2.5" fill="#ef4444" />
      {/* Étoile */}
      <path
        d="M40 0 L42.6 5.5 L48.5 6 L44 10 L45.4 16 L40 13 L34.6 16 L36 10 L31.5 6 L37.4 5.5 Z"
        fill="#facc15"
        stroke="#eab308"
        strokeWidth="0.8"
      />
    </svg>
  );
}

function Cadeau({ taille = 46, couleur = "#ec4899", ruban = "#facc15" }: { taille?: number; couleur?: string; ruban?: string }) {
  return (
    <svg viewBox="0 0 50 50" width={taille} height={taille} aria-hidden>
      <rect x="4" y="18" width="42" height="30" rx="3" fill={couleur} />
      <rect x="2" y="12" width="46" height="9" rx="2" fill={couleur} />
      <rect x="21" y="12" width="8" height="36" fill={ruban} />
      <path d="M25 12 C18 2 8 6 14 12 Z M25 12 C32 2 42 6 36 12 Z" fill={ruban} />
    </svg>
  );
}

function Flocon({ taille }: { taille: number }) {
  return (
    <svg viewBox="0 0 24 24" width={taille} height={taille} aria-hidden>
      <g stroke="#93c5fd" strokeWidth="1.6" strokeLinecap="round">
        <path d="M12 2 V22 M3.3 7 L20.7 17 M3.3 17 L20.7 7" />
        <path d="M12 5 L9.5 3 M12 5 L14.5 3 M12 19 L9.5 21 M12 19 L14.5 21" />
      </g>
    </svg>
  );
}

export function DecorNoel() {
  // Guirlande : des ampoules posées sur une courbe douce, qui scintillent à
  // tour de rôle.
  const ampoules = Array.from({ length: 21 }, (_, i) => ({
    gauche: (i / 20) * 100,
    haut: 10 + 10 * Math.sin((i / 20) * Math.PI * 4),
    couleur: COULEURS_AMPOULES[i % COULEURS_AMPOULES.length],
    delai: `${(i % 5) * 0.35}s`,
  }));
  // Flocons : sur les bords, pour ne pas passer sur le texte.
  const flocons = [
    { gauche: "3%", taille: 16, duree: "11s", delai: "0s" },
    { gauche: "9%", taille: 10, duree: "14s", delai: "-4s" },
    { gauche: "15%", taille: 13, duree: "12s", delai: "-8s" },
    { gauche: "84%", taille: 12, duree: "13s", delai: "-2s" },
    { gauche: "90%", taille: 17, duree: "10s", delai: "-6s" },
    { gauche: "96%", taille: 10, duree: "15s", delai: "-10s" },
  ];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="absolute left-0 top-0 h-8 w-full">
        <path
          d={`M0 ${ampoules[0].haut / 1.5} ${ampoules.map((a) => `L${a.gauche} ${a.haut / 1.5}`).join(" ")}`}
          fill="none"
          stroke="#166534"
          strokeWidth="0.6"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {ampoules.map((a, i) => (
        <span
          key={i}
          className="noel-ampoule absolute h-3.5 w-2.5 -translate-x-1/2 rounded-full"
          style={{
            left: `${a.gauche}%`,
            top: `${(a.haut / 1.5 / 30) * 32 + 2}px`,
            background: a.couleur,
            boxShadow: `0 0 8px 2px ${a.couleur}88`,
            animationDelay: a.delai,
          }}
        />
      ))}

      {flocons.map((f, i) => (
        <div
          key={i}
          className="noel-flocon absolute top-0"
          style={{ left: f.gauche, animationDuration: f.duree, animationDelay: f.delai }}
        >
          <Flocon taille={f.taille} />
        </div>
      ))}

      <div className="absolute bottom-2 left-2 flex items-end gap-1 sm:left-8">
        <Sapin taille={70} className="h-auto w-12 sm:w-auto" />
        <Cadeau taille={40} />
        <Sapin taille={46} className="hidden sm:block" />
      </div>
      <div className="absolute bottom-2 right-2 flex items-end gap-1 sm:right-8">
        <Cadeau taille={34} couleur="#ef4444" ruban="#fef3c7" />
        <Sapin taille={64} className="h-auto w-11 sm:w-auto" />
      </div>
    </div>
  );
}
