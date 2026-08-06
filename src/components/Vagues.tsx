// Direction artistique de Zelart : de larges rubans roses qui ondulent. Le même
// tracé revient à trois échelles — un fond de bandeau, une crête de bordure, un
// trait sous les titres — pour signer les pages sans jamais couvrir le contenu.
// Tout est dessiné en SVG plutôt qu'en image : rien à télécharger, un rendu net
// sur tous les écrans, et une teinte qui suit les classes Tailwind.

const LARGEUR = 1200;

// Sinusoïde approchée par des Béziers cubiques. Les points de contrôle placés
// au tiers de la demi-période font culminer la courbe aux trois quarts de leur
// hauteur : d'où le facteur 4/3 pour retrouver l'amplitude demandée.
function onde(
  y: number,
  amplitude: number,
  periode: number,
  dephasage: number,
  largeur: number = LARGEUR
): string {
  const demi = periode / 2;
  const galbe = (amplitude * 4) / 3;
  let x = dephasage - periode;
  let sens = 1;
  let trace = `M${x} ${y}`;
  while (x < largeur) {
    const fin = x + demi;
    const controle = y + galbe * sens;
    trace += `C${x + demi / 3} ${controle},${fin - demi / 3} ${controle},${fin} ${y}`;
    x = fin;
    sens = -sens;
  }
  return trace;
}

// Périodes multiples de 6 et amplitudes multiples de 3 : les coordonnées
// tombent juste, le SVG reste lisible. Les rubans n'ont ni la même longueur
// d'onde ni la même phase, de sorte qu'ils se frôlent par endroits et laissent
// respirer ailleurs, au lieu de défiler en rayures parallèles.
//
// Le cadrage se fait en « slice » : le dessin remplit toujours son parent et
// déborde du côté le plus long. Une composition unique se retrouverait donc
// zoomée à l'excès dans un en-tête plat — d'où deux hauteurs de scène, l'une
// pour les grandes ouvertures, l'autre pour les bandeaux de page.
const RUBANS_AMPLES = [
  { y: 70, amplitude: 48, periode: 720, dephasage: 0, epaisseur: 30 },
  { y: 215, amplitude: 60, periode: 540, dephasage: 210, epaisseur: 42 },
  { y: 345, amplitude: 30, periode: 780, dephasage: 300, epaisseur: 9 },
  { y: 460, amplitude: 54, periode: 660, dephasage: 90, epaisseur: 26 },
  { y: 600, amplitude: 66, periode: 600, dephasage: 420, epaisseur: 44 },
];

const SCENES = {
  hero: {
    hauteur: 620,
    rubans: RUBANS_AMPLES,
    // Le motif naît sous l'en-tête et s'efface bien avant le texte qui suit :
    // c'est ce dégradé, plus que la teinte, qui le maintient à l'arrière-plan.
    fondu: "linear-gradient(to bottom, transparent 0%, #000 20%, #000 48%, transparent 92%)",
  },
  bandeau: {
    hauteur: 260,
    rubans: [
      { y: 50, amplitude: 30, periode: 720, dephasage: 0, epaisseur: 22 },
      { y: 140, amplitude: 39, periode: 540, dephasage: 210, epaisseur: 30 },
      { y: 225, amplitude: 24, periode: 660, dephasage: 90, epaisseur: 12 },
    ],
    fondu: "linear-gradient(to bottom, transparent 0%, #000 26%, #000 58%, transparent 96%)",
  },
  bloc: {
    hauteur: 620,
    rubans: RUBANS_AMPLES,
    // Dans une carte, le motif se réfugie dans l'angle et laisse le texte seul.
    fondu: "linear-gradient(to top left, #000 0%, transparent 65%)",
  },
};

type Variante = keyof typeof SCENES;

// Les tracés sont calculés une fois au chargement du module, pas à chaque rendu.
function tracer(variante: Variante) {
  return SCENES[variante].rubans.map(({ y, amplitude, periode, dephasage, epaisseur }) => ({
    y,
    epaisseur,
    d: onde(y, amplitude, periode, dephasage),
  }));
}

const TRACES: Record<Variante, ReturnType<typeof tracer>> = {
  hero: tracer("hero"),
  bandeau: tracer("bandeau"),
  bloc: tracer("bloc"),
};

/**
 * Fond ondulé, à poser dans un parent `relative isolate overflow-hidden` :
 * `isolate` crée le contexte d'empilement sans lequel le `-z-10` renverrait le
 * motif derrière la page entière, `overflow-hidden` le recadre proprement.
 */
export default function Vagues({ variante = "hero" }: { variante?: Variante }) {
  const { hauteur, fondu } = SCENES[variante];
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${LARGEUR} ${hauteur}`}
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      style={{ maskImage: fondu, WebkitMaskImage: fondu }}
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full text-pink-200 opacity-45 print:hidden"
    >
      {/* Les rubans se chevauchent : ils restent opaques ici et c'est le SVG
          entier qui est atténué. Les rendre translucides un par un ferait
          ressortir chaque croisement en rose plus soutenu. */}
      {TRACES[variante].map((ruban) => (
        <path key={ruban.y} d={ruban.d} strokeWidth={ruban.epaisseur} />
      ))}
    </svg>
  );
}

// Bordure ondulée : la même vague, aplatie, là où un filet droit ferait sec.
// Les deux traits partagent période et déphasage — ils restent donc parallèles
// au lieu de s'entrecroiser. `vectorEffect` garde une épaisseur constante
// malgré l'étirement horizontal.
const CRETES = [
  { d: onde(14, 9, 480, 240, 1200), epaisseur: 2.5, opacite: 1 },
  { d: onde(25, 9, 480, 240, 1200), epaisseur: 1.5, opacite: 0.55 },
];

export function CreteVagues() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1200 36"
      preserveAspectRatio="none"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      className="h-9 w-full text-pink-200 print:hidden"
    >
      {CRETES.map((crete) => (
        <path
          key={crete.epaisseur}
          d={crete.d}
          strokeWidth={crete.epaisseur}
          opacity={crete.opacite}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

// Le déphasage égale la période : la boucle démarre pile à x = 0, donc les deux
// extrémités arrondies restent dans le cadre.
const TRAIT = onde(6, 3, 36, 36, 72);

/** Petite vague sous un titre de section, en écho au bandeau. */
export function TraitVagues({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 72 12"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      className={`h-3 w-18 text-pink-300 print:hidden ${className}`}
    >
      <path d={TRAIT} />
    </svg>
  );
}
