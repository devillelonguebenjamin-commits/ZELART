// Décor d'Halloween, dessiné en SVG comme les vagues de la marque : rien à
// télécharger, net sur tous les écrans. Tout est décoratif (`aria-hidden`), ne
// capte aucun clic, et les animations s'arrêtent quand l'appareil demande à
// limiter les mouvements (cf. globals.css).

const ORANGE = "#f97316";
const ORANGE_CLAIR = "#fb923c";
const ORANGE_FONCE = "#c2410c";
const LUEUR = "#fde047";
const NUIT = "#2e1065";

/** Une citrouille-lanterne, visage illuminé. */
export function Citrouille({ taille = 72, className = "" }: { taille?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 100 92"
      width={taille}
      height={(taille * 92) / 100}
      aria-hidden
      className={className}
    >
      {/* Tige et vrille */}
      <path d="M47 20 C46 12 48 6 54 3 L57 7 C53 9 52 14 53 20 Z" fill="#4d7c0f" />
      <path d="M55 9 C63 4 70 8 68 14" fill="none" stroke="#65a30d" strokeWidth="2.5" strokeLinecap="round" />
      {/* Côtes de la citrouille, des bords vers le centre */}
      <ellipse cx="28" cy="56" rx="24" ry="32" fill={ORANGE_FONCE} />
      <ellipse cx="72" cy="56" rx="24" ry="32" fill={ORANGE_FONCE} />
      <ellipse cx="36" cy="56" rx="22" ry="34" fill={ORANGE} />
      <ellipse cx="64" cy="56" rx="22" ry="34" fill={ORANGE} />
      <ellipse cx="50" cy="56" rx="20" ry="35" fill={ORANGE_CLAIR} />
      {/* Visage */}
      <path d="M28 46 L38 34 L44 48 Z" fill={LUEUR} stroke={ORANGE_FONCE} strokeWidth="1.5" />
      <path d="M72 46 L62 34 L56 48 Z" fill={LUEUR} stroke={ORANGE_FONCE} strokeWidth="1.5" />
      <path d="M46 56 L50 50 L54 56 Z" fill={LUEUR} />
      <path
        d="M24 64 Q50 86 76 64 L70 66 L66 72 L60 67 L54 74 L48 67 L42 74 L36 67 L31 71 Z"
        fill={LUEUR}
        stroke={ORANGE_FONCE}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Silhouette de chauve-souris. */
function ChauveSouris({ taille }: { taille: number }) {
  return (
    <svg viewBox="0 0 100 40" width={taille} height={taille * 0.4} aria-hidden className="halloween-battement">
      <path
        fill={NUIT}
        d="M50 14 L47 8 L46 15 C40 12 34 12 28 15 C31 10 30 6 25 3 C18 6 10 8 2 9 C9 13 13 19 13 27 C19 23 26 23 31 27 C33 22 39 20 44 22 C45 27 47 31 50 33 C53 31 55 27 56 22 C61 20 67 22 69 27 C74 23 81 23 87 27 C87 19 91 13 98 9 C90 8 82 6 75 3 C70 6 69 10 72 15 C66 12 60 12 54 15 L53 8 Z"
      />
    </svg>
  );
}

/** Un fantôme qui flotte doucement. */
function Fantome({ taille = 56 }: { taille?: number }) {
  return (
    <svg viewBox="0 0 60 72" width={taille} height={(taille * 72) / 60} aria-hidden>
      <path
        d="M6 30 C6 12 18 2 30 2 C42 2 54 12 54 30 L54 66 L47 60 L40 68 L33 60 L26 68 L19 60 L12 68 L6 62 Z"
        fill="#ffffff"
        stroke="#e9d5ff"
        strokeWidth="2"
      />
      <ellipse cx="22" cy="28" rx="4" ry="6" fill={NUIT} />
      <ellipse cx="38" cy="28" rx="4" ry="6" fill={NUIT} />
      <ellipse cx="30" cy="42" rx="5" ry="6" fill={NUIT} />
      <ellipse cx="16" cy="38" rx="4" ry="2.5" fill="#fbcfe8" />
      <ellipse cx="44" cy="38" rx="4" ry="2.5" fill="#fbcfe8" />
    </svg>
  );
}

/** Toile d'araignée posée dans un coin, avec son occupante au bout d'un fil. */
function Toile() {
  // Fils rayonnants depuis le coin, puis des arcs entre eux.
  const rayons = [0, 18, 36, 54, 72, 90].map((angle) => (angle * Math.PI) / 180);
  const point = (r: number, a: number) => `${(r * Math.cos(a)).toFixed(1)},${(r * Math.sin(a)).toFixed(1)}`;
  return (
    <svg viewBox="0 0 130 130" width="130" height="130" aria-hidden>
      <g stroke="#a78bfa" strokeOpacity="0.55" strokeWidth="1" fill="none">
        {rayons.map((a, i) => (
          <line key={i} x1="0" y1="0" x2={128 * Math.cos(a)} y2={128 * Math.sin(a)} />
        ))}
        {[28, 52, 76, 100].map((r) => (
          <polyline key={r} points={rayons.map((a) => point(r, a)).join(" ")} />
        ))}
      </g>
    </svg>
  );
}

function Araignee() {
  return (
    <div className="halloween-araignee absolute right-16 top-0 flex flex-col items-center sm:right-28">
      <span className="block h-20 w-px bg-violet-300/70 sm:h-28" />
      <svg viewBox="0 0 40 30" width="30" height="22" aria-hidden>
        <g stroke={NUIT} strokeWidth="1.6" fill="none" strokeLinecap="round">
          <path d="M14 14 L4 6 M14 16 L2 16 M14 18 L4 26 M26 14 L36 6 M26 16 L38 16 M26 18 L36 26" />
        </g>
        <ellipse cx="20" cy="16" rx="8" ry="9" fill={NUIT} />
        <circle cx="17" cy="14" r="1.6" fill="#fff" />
        <circle cx="23" cy="14" r="1.6" fill="#fff" />
      </svg>
    </div>
  );
}

/**
 * Le décor du haut de la page d'accueil : lune, chauves-souris, toile,
 * araignée, fantôme et citrouilles. À poser dans une section `relative`.
 */
export function DecorHalloween() {
  // Les chauves-souris restent dans la bande haute, au-dessus du titre : à
  // travers le texte, elles en gênaient la lecture.
  const vols = [
    { haut: "14px", taille: 42, duree: "17s", delai: "0s" },
    { haut: "44px", taille: 28, duree: "22s", delai: "-6s" },
    { haut: "4px", taille: 22, duree: "26s", delai: "-13s" },
    { haut: "30px", taille: 34, duree: "20s", delai: "-9s" },
  ];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Pleine lune */}
      <div className="absolute left-3 top-3 h-14 w-14 rounded-full bg-amber-100 shadow-[0_0_40px_12px_rgba(254,243,199,0.7)] sm:left-[8%] sm:top-8 sm:h-32 sm:w-32 sm:shadow-[0_0_60px_20px_rgba(254,243,199,0.7)]">
        <span className="absolute left-[22%] top-[24%] h-[13%] w-[13%] rounded-full bg-amber-200/80" />
        <span className="absolute bottom-[20%] right-[22%] h-[19%] w-[19%] rounded-full bg-amber-200/70" />
        <span className="absolute bottom-[32%] left-[32%] h-[8%] w-[8%] rounded-full bg-amber-200/80" />
      </div>

      {/* Toile dans le coin supérieur droit, retournée pour partir du coin */}
      <div className="absolute right-0 top-0 -scale-x-100 opacity-90">
        <Toile />
      </div>
      <Araignee />

      {/* Chauves-souris */}
      {vols.map((v, i) => (
        <div
          key={i}
          className="halloween-vol absolute left-0"
          style={{ top: v.haut, animationDuration: v.duree, animationDelay: v.delai }}
        >
          <ChauveSouris taille={v.taille} />
        </div>
      ))}

      {/* Fantôme */}
      <div className="halloween-flotte absolute right-[10%] top-[42%] hidden sm:block">
        <Fantome />
      </div>

      {/* Citrouilles posées en bas, de part et d'autre du texte */}
      <div className="absolute bottom-2 left-2 flex items-end gap-1 sm:left-8">
        <Citrouille taille={78} className="h-auto w-14 sm:w-auto" />
        <Citrouille taille={50} className="hidden sm:block" />
      </div>
      <div className="absolute bottom-2 right-2 flex items-end gap-1 sm:right-8">
        <Citrouille taille={46} className="hidden sm:block" />
        <Citrouille taille={70} className="h-auto w-12 sm:w-auto" />
      </div>
    </div>
  );
}
