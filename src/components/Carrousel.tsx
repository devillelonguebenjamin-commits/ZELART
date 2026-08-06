"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

const DELAI_AUTO_MS = 4500;
// En deçà, il n'y a rien à faire défiler : ni flèches, ni barre, ni lecture auto.
const MARGE_PX = 8;

function Chevron({ vers }: { vers: "gauche" | "droite" }) {
  return (
    <svg
      aria-hidden
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={vers === "gauche" ? "M15 5 8 12l7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}

const REQUETE_MOUVEMENT = "(prefers-reduced-motion: reduce)";

// Le rendu serveur ne connaît pas la préférence : il suppose l'animation
// permise, et l'hydratation rétablit la vérité chez celles qui l'ont réduite.
function useMouvementReduit(): boolean {
  return useSyncExternalStore(
    (prevenir) => {
      const requete = window.matchMedia(REQUETE_MOUVEMENT);
      requete.addEventListener("change", prevenir);
      return () => requete.removeEventListener("change", prevenir);
    },
    () => window.matchMedia(REQUETE_MOUVEMENT).matches,
    () => false
  );
}

function Pictogramme({ lecture }: { lecture: boolean }) {
  return (
    <svg aria-hidden width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
      {lecture ? (
        <>
          <rect x="6.5" y="5" width="4" height="14" rx="1.3" />
          <rect x="13.5" y="5" width="4" height="14" rx="1.3" />
        </>
      ) : (
        <path d="M8 5.2c0-.9 1-1.5 1.8-1l9 6.8c.7.5.7 1.5 0 2l-9 6.8c-.8.5-1.8-.1-1.8-1V5.2Z" />
      )}
    </svg>
  );
}

/**
 * Piste horizontale à défilement natif — donc fluide au doigt, au pavé tactile,
 * à la molette et au clavier. Le composant n'ajoute que ce que le navigateur ne
 * fait pas seul : flèches, indicateur de position, glissement à la souris et
 * défilement automatique.
 *
 * Les enfants sont des `<li>` fournis par l'appelant, qui porte donc aussi leur
 * largeur — c'est elle qui décide du nombre de cartes visibles à la fois.
 */
export default function Carrousel({
  libelle,
  children,
}: {
  libelle: string;
  children: React.ReactNode;
}) {
  const piste = useRef<HTMLUListElement>(null);
  // Survol ou focus : on suspend le défilement sans l'arrêter pour autant.
  const suspendu = useRef(false);
  const sens = useRef<1 | -1>(1);
  const prise = useRef<{ x: number; depart: number } | null>(null);

  const [defilable, setDefilable] = useState(false);
  const [progression, setProgression] = useState(0);
  const [fraction, setFraction] = useState(1);
  const [resteAGauche, setResteAGauche] = useState(false);
  const [resteADroite, setResteADroite] = useState(false);
  const [souhaiteLecture, setSouhaiteLecture] = useState(true);
  const [tiree, setTiree] = useState(false);

  const doux = useMouvementReduit();
  const lecture = souhaiteLecture && !doux;

  // Où en est le défilement, et y a-t-il seulement de quoi défiler ?
  const mesurer = useCallback(() => {
    const el = piste.current;
    if (!el) return;
    const course = el.scrollWidth - el.clientWidth;
    const utile = course > MARGE_PX;
    setDefilable(utile);
    setFraction(utile ? el.clientWidth / el.scrollWidth : 1);
    setProgression(utile ? el.scrollLeft / course : 0);
    setResteAGauche(el.scrollLeft > MARGE_PX);
    setResteADroite(el.scrollLeft < course - MARGE_PX);
  }, []);

  useEffect(() => {
    const el = piste.current;
    if (!el) return;
    mesurer();
    // La largeur des vignettes est relative : tout changement de fenêtre — ou
    // une image qui finit de charger — redéfinit la course disponible.
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(el);
    return () => observateur.disconnect();
  }, [mesurer]);

  const glisser = useCallback(
    (direction: 1 | -1) => {
      const el = piste.current;
      if (!el) return;
      const [premiere, seconde] = el.children as unknown as HTMLElement[];
      const pas = seconde ? seconde.offsetLeft - premiere.offsetLeft : el.clientWidth;
      el.scrollBy({ left: direction * pas, behavior: doux ? "auto" : "smooth" });
    },
    [doux]
  );

  // Aller-retour plutôt que retour brutal au début : arrivé au bout, le
  // carrousel repart dans l'autre sens.
  useEffect(() => {
    if (!lecture || !defilable) return;
    const minuteur = setInterval(() => {
      const el = piste.current;
      if (!el || document.hidden || suspendu.current) return;
      const course = el.scrollWidth - el.clientWidth;
      if (sens.current === 1 && el.scrollLeft >= course - MARGE_PX) sens.current = -1;
      else if (sens.current === -1 && el.scrollLeft <= MARGE_PX) sens.current = 1;
      glisser(sens.current);
    }, DELAI_AUTO_MS);
    return () => clearInterval(minuteur);
  }, [lecture, defilable, glisser]);

  function alaMain(direction: 1 | -1) {
    sens.current = direction;
    setSouhaiteLecture(false);
    glisser(direction);
  }

  // Au doigt et au pavé tactile, le défilement natif est meilleur que tout ce
  // qu'on écrirait. À la souris il n'existe pas : on l'ajoute ici, la piste se
  // tire comme une pellicule.
  function saisir(evenement: React.PointerEvent<HTMLUListElement>) {
    setSouhaiteLecture(false);
    const el = piste.current;
    if (!el || evenement.pointerType !== "mouse") return;
    prise.current = { x: evenement.clientX, depart: el.scrollLeft };
    el.setPointerCapture(evenement.pointerId);
    // L'accrochage lutterait contre la main ; rétabli au relâcher, il fait
    // tomber la vignette la plus proche pile en place.
    el.style.scrollSnapType = "none";
    setTiree(true);
  }

  function tirer(evenement: React.PointerEvent<HTMLUListElement>) {
    const el = piste.current;
    if (!prise.current || !el) return;
    el.scrollLeft = prise.current.depart - (evenement.clientX - prise.current.x);
  }

  function lacher(evenement: React.PointerEvent<HTMLUListElement>) {
    const el = piste.current;
    if (!prise.current || !el) return;
    prise.current = null;
    el.releasePointerCapture(evenement.pointerId);
    el.style.scrollSnapType = "";
    setTiree(false);
  }

  return (
    <div
      onMouseEnter={() => (suspendu.current = true)}
      onMouseLeave={() => (suspendu.current = false)}
      onFocusCapture={() => (suspendu.current = true)}
      onBlurCapture={() => (suspendu.current = false)}
    >
      <div className="relative">
        {/* Le masque est porté par un calque à part : posé sur le conteneur des
            flèches, il les ferait disparaître avec les bords. Quand tout tient
            à l'écran, il n'a rien à estomper et rognerait la première vignette. */}
        <div
          className={
            defilable
              ? "[mask-image:linear-gradient(to_right,transparent,#000_3%,#000_97%,transparent)]"
              : ""
          }
        >
          <ul
            ref={piste}
            tabIndex={0}
            onScroll={mesurer}
            onPointerDown={saisir}
            onPointerMove={tirer}
            onPointerUp={lacher}
            onPointerCancel={lacher}
            aria-label={libelle}
            className={`piste-carrousel flex snap-x snap-mandatory gap-4 overflow-x-auto rounded-[2rem] px-1 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-400 ${
              // Centrer une piste qui déborde rendrait son début inatteignable
              // dans plusieurs navigateurs : réservé au cas où tout tient.
              defilable ? "vignettes-centrees cursor-grab" : "justify-center"
            } ${tiree ? "cursor-grabbing select-none" : ""}`}
          >
            {children}
          </ul>
        </div>

        {defilable && (
          <>
            <button
              type="button"
              onClick={() => alaMain(-1)}
              disabled={!resteAGauche}
              aria-label="Voir les réalisations précédentes"
              className="absolute top-1/2 left-2 hidden -translate-y-1/2 rounded-full border border-pink-100 bg-white/90 p-2.5 text-pink-500 shadow-md backdrop-blur transition hover:bg-white disabled:pointer-events-none disabled:opacity-0 sm:block"
            >
              <Chevron vers="gauche" />
            </button>
            <button
              type="button"
              onClick={() => alaMain(1)}
              disabled={!resteADroite}
              aria-label="Voir les réalisations suivantes"
              className="absolute top-1/2 right-2 hidden -translate-y-1/2 rounded-full border border-pink-100 bg-white/90 p-2.5 text-pink-500 shadow-md backdrop-blur transition hover:bg-white disabled:pointer-events-none disabled:opacity-0 sm:block"
            >
              <Chevron vers="droite" />
            </button>
          </>
        )}
      </div>

      {defilable && (
        <div className="mt-5 flex items-center gap-4">
          {/* Position et largeur reprennent celles d'une barre de défilement :
              on voit d'un coup d'œil où l'on est et ce qu'il reste. */}
          <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-pink-100">
            <div
              className="absolute inset-y-0 rounded-full bg-pink-400"
              style={{
                width: `${fraction * 100}%`,
                left: `${progression * (100 - fraction * 100)}%`,
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => setSouhaiteLecture((en) => !en)}
            aria-label={lecture ? "Mettre le défilement en pause" : "Relancer le défilement"}
            className="rounded-full border border-pink-100 bg-white p-2 text-pink-500 shadow-sm transition hover:bg-pink-50"
          >
            <Pictogramme lecture={lecture} />
          </button>
        </div>
      )}
    </div>
  );
}
