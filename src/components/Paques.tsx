// Décor de Pâques : œufs décorés dans l'herbe, papillons, tulipes et un lapin
// qui pointe le bout de ses oreilles.

function Oeuf({
  taille = 34,
  fond,
  motif,
  style = "zigzag",
}: {
  taille?: number;
  fond: string;
  motif: string;
  style?: "zigzag" | "points" | "bandes";
}) {
  return (
    <svg viewBox="0 0 40 52" width={taille} height={(taille * 52) / 40} aria-hidden>
      <path d="M20 2 C31 2 38 18 38 31 C38 43 30 50 20 50 C10 50 2 43 2 31 C2 18 9 2 20 2 Z" fill={fond} />
      {style === "zigzag" && (
        <path d="M3 28 L9 23 L15 28 L21 23 L27 28 L33 23 L38 27" fill="none" stroke={motif} strokeWidth="2.5" strokeLinejoin="round" />
      )}
      {style === "points" && (
        <g fill={motif}>
          <circle cx="13" cy="20" r="2.5" />
          <circle cx="26" cy="17" r="2.5" />
          <circle cx="20" cy="30" r="2.5" />
          <circle cx="10" cy="36" r="2.5" />
          <circle cx="30" cy="36" r="2.5" />
        </g>
      )}
      {style === "bandes" && (
        <g stroke={motif} strokeWidth="3">
          <path d="M5 22 H35" />
          <path d="M3 36 H37" />
        </g>
      )}
    </svg>
  );
}

function Herbe({ largeur = 150 }: { largeur?: number }) {
  return (
    <svg viewBox="0 0 150 24" width={largeur} height={(largeur * 24) / 150} aria-hidden className="block">
      <path
        d="M0 24 L4 8 L8 24 L12 4 L16 24 L22 10 L26 24 L30 2 L34 24 L40 9 L44 24 L49 5 L53 24 L59 11 L63 24 L68 3 L72 24 L78 8 L82 24 L87 4 L91 24 L97 10 L101 24 L106 2 L110 24 L116 9 L120 24 L125 5 L129 24 L135 10 L139 24 L144 4 L150 24 Z"
        fill="#86efac"
      />
    </svg>
  );
}

function Tulipe({ couleur }: { couleur: string }) {
  return (
    <svg viewBox="0 0 24 54" width="22" height="50" aria-hidden>
      <path d="M12 22 V54" stroke="#16a34a" strokeWidth="2.5" />
      <path d="M12 44 C4 40 2 34 4 30 C8 34 11 38 12 44 Z" fill="#22c55e" />
      <path d="M4 6 L8 12 L12 4 L16 12 L20 6 C21 16 18 22 12 22 C6 22 3 16 4 6 Z" fill={couleur} />
    </svg>
  );
}

function Lapin() {
  return (
    <svg viewBox="0 0 70 70" width="70" height="70" aria-hidden>
      <ellipse cx="25" cy="22" rx="7" ry="20" fill="#fff" stroke="#e5e7eb" strokeWidth="1.5" />
      <ellipse cx="25" cy="22" rx="3.5" ry="15" fill="#fbcfe8" />
      <ellipse cx="45" cy="22" rx="7" ry="20" fill="#fff" stroke="#e5e7eb" strokeWidth="1.5" />
      <ellipse cx="45" cy="22" rx="3.5" ry="15" fill="#fbcfe8" />
      <ellipse cx="35" cy="54" rx="22" ry="18" fill="#fff" stroke="#e5e7eb" strokeWidth="1.5" />
      <circle cx="27" cy="50" r="2.6" fill="#43242f" />
      <circle cx="43" cy="50" r="2.6" fill="#43242f" />
      <ellipse cx="35" cy="57" rx="3" ry="2.2" fill="#f472b6" />
      <ellipse cx="22" cy="58" rx="3.5" ry="2" fill="#fbcfe8" />
      <ellipse cx="48" cy="58" rx="3.5" ry="2" fill="#fbcfe8" />
    </svg>
  );
}

function Papillon({ couleur, taille = 30 }: { couleur: string; taille?: number }) {
  return (
    <svg viewBox="0 0 40 30" width={taille} height={(taille * 30) / 40} aria-hidden className="paques-ailes">
      <path d="M20 15 C12 0 0 2 3 12 C5 18 14 18 20 15 Z" fill={couleur} />
      <path d="M20 15 C28 0 40 2 37 12 C35 18 26 18 20 15 Z" fill={couleur} />
      <path d="M20 16 C14 22 8 28 13 29 C17 29 19 22 20 16 Z" fill={couleur} opacity="0.8" />
      <path d="M20 16 C26 22 32 28 27 29 C23 29 21 22 20 16 Z" fill={couleur} opacity="0.8" />
      <rect x="19" y="8" width="2" height="16" rx="1" fill="#43242f" />
    </svg>
  );
}

export function DecorPaques() {
  const papillons = [
    { haut: "10px", couleur: "#c084fc", taille: 30, duree: "19s", delai: "0s" },
    { haut: "40px", couleur: "#fbbf24", taille: 24, duree: "24s", delai: "-9s" },
    { haut: "22px", couleur: "#60a5fa", taille: 20, duree: "28s", delai: "-16s" },
  ];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {papillons.map((p, i) => (
        <div
          key={i}
          className="halloween-vol absolute left-0"
          style={{ top: p.haut, animationDuration: p.duree, animationDelay: p.delai }}
        >
          <Papillon couleur={p.couleur} taille={p.taille} />
        </div>
      ))}

      <div className="absolute bottom-0 left-0 sm:left-6">
        <div className="flex items-end gap-0.5 px-2">
          <Tulipe couleur="#f472b6" />
          <Oeuf fond="#fde68a" motif="#f472b6" style="zigzag" />
          <Oeuf taille={28} fond="#bfdbfe" motif="#a78bfa" style="points" />
          <span className="hidden sm:block">
            <Oeuf taille={30} fond="#fbcfe8" motif="#34d399" style="bandes" />
          </span>
        </div>
        <Herbe largeur={150} />
      </div>
      <div className="absolute bottom-0 right-0 sm:right-6">
        <div className="flex items-end gap-0.5 px-2">
          <span className="hidden sm:block">
            <Oeuf taille={28} fond="#c4b5fd" motif="#fde68a" style="points" />
          </span>
          <Lapin />
          <Tulipe couleur="#facc15" />
        </div>
        <Herbe largeur={150} />
      </div>
    </div>
  );
}
