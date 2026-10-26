// Décor de la Saint-Valentin : des cœurs qui s'envolent sur les bords, une
// lettre d'amour et une flèche de Cupidon en bas.

function Coeur({ taille, couleur }: { taille: number; couleur: string }) {
  return (
    <svg viewBox="0 0 24 22" width={taille} height={(taille * 22) / 24} aria-hidden>
      <path
        d="M12 21 C5 15 1 11 1 6.5 C1 3 3.7 1 6.6 1 C9 1 10.8 2.4 12 4.3 C13.2 2.4 15 1 17.4 1 C20.3 1 23 3 23 6.5 C23 11 19 15 12 21 Z"
        fill={couleur}
      />
    </svg>
  );
}

function Lettre({ taille = 70 }: { taille?: number }) {
  return (
    <svg viewBox="0 0 70 50" width={taille} height={(taille * 50) / 70} aria-hidden>
      <rect x="2" y="6" width="66" height="42" rx="4" fill="#fff" stroke="#f9a8d4" strokeWidth="2" />
      <path d="M2 10 L35 32 L68 10" fill="none" stroke="#f9a8d4" strokeWidth="2" />
      <path
        d="M35 34 C30 30 27 27 27 24 C27 21.5 29 20 31 20 C32.7 20 34 21 35 22.5 C36 21 37.3 20 39 20 C41 20 43 21.5 43 24 C43 27 40 30 35 34 Z"
        fill="#e11d48"
      />
    </svg>
  );
}

function Fleche({ taille = 80 }: { taille?: number }) {
  return (
    <svg viewBox="0 0 90 60" width={taille} height={(taille * 60) / 90} aria-hidden>
      <path
        d="M45 52 C34 43 26 36 26 27 C26 21 30 17 36 17 C40 17 43 19.5 45 23 C47 19.5 50 17 54 17 C60 17 64 21 64 27 C64 36 56 43 45 52 Z"
        fill="#f43f5e"
      />
      <path d="M6 50 L84 10" stroke="#a16207" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M84 10 L74 11 L79 18 Z" fill="#a16207" />
      <path d="M6 50 L4 42 M6 50 L13 51 M10 48 L8 40 M10 48 L17 49" stroke="#f9a8d4" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function DecorSaintValentin() {
  // Les cœurs montent sur les deux bords, jamais au milieu, là où est le texte.
  const coeurs = [
    { gauche: "3%", taille: 22, couleur: "#f472b6", duree: "9s", delai: "0s" },
    { gauche: "10%", taille: 14, couleur: "#fb7185", duree: "12s", delai: "-3s" },
    { gauche: "16%", taille: 18, couleur: "#f9a8d4", duree: "10s", delai: "-6s" },
    { gauche: "82%", taille: 16, couleur: "#fb7185", duree: "11s", delai: "-2s" },
    { gauche: "89%", taille: 24, couleur: "#f472b6", duree: "9.5s", delai: "-5s" },
    { gauche: "95%", taille: 13, couleur: "#e11d48", duree: "13s", delai: "-8s" },
  ];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {coeurs.map((c, i) => (
        <div
          key={i}
          className="valentin-coeur absolute bottom-0"
          style={{ left: c.gauche, animationDuration: c.duree, animationDelay: c.delai }}
        >
          <Coeur taille={c.taille} couleur={c.couleur} />
        </div>
      ))}
      <div className="absolute bottom-3 left-2 sm:left-8">
        <Lettre taille={70} />
      </div>
      <div className="absolute bottom-3 right-2 sm:right-8">
        <Fleche taille={86} />
      </div>
    </div>
  );
}
