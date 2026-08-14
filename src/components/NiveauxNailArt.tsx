"use client";

import { useEffect, useRef } from "react";
import { formatPrix } from "@/lib/format";
import type { NiveauExplique } from "@/lib/nail-art";

// « Niveau 2 », ça ne veut rien dire tant qu'on n'a pas vu.
//
// D'où la comparaison côte à côte plutôt qu'un paragraphe : trois photos
// alignées disent en une seconde ce qu'aucune définition n'explique. La fenêtre
// s'ouvre là où la question se pose — sur la page des prestations, et au moment
// de choisir sa prestation — pour ne pas faire quitter la réservation en cours.
//
// `<dialog>` natif plutôt qu'un empilement de div : le navigateur fournit le
// fond, le verrouillage du fil au clavier et la fermeture par Échap. Le clic
// sur le fond ferme aussi, ce qu'il ne fait pas tout seul.

export default function NiveauxNailArt({
  niveaux,
  libelle = "Quelle différence entre les niveaux ?",
  className,
}: {
  niveaux: NiveauExplique[];
  libelle?: string;
  className?: string;
}) {
  const fenetre = useRef<HTMLDialogElement>(null);

  // La fenêtre vit dans le <form> de réservation sur /reserver : sans ce
  // garde-fou, Échap fermerait la fenêtre *et* le navigateur pourrait
  // réinitialiser le formulaire. On empêche donc la remontée de l'événement.
  useEffect(() => {
    const element = fenetre.current;
    if (!element) return;
    const stopper = (e: Event) => e.stopPropagation();
    element.addEventListener("cancel", stopper);
    return () => element.removeEventListener("cancel", stopper);
  }, []);

  if (niveaux.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => fenetre.current?.showModal()}
        className={
          className ??
          "text-sm font-medium text-pink-600 underline decoration-pink-300 underline-offset-2 hover:text-pink-700"
        }
      >
        💅 {libelle}
      </button>

      <dialog
        ref={fenetre}
        onClick={(e) => {
          // Le clic sur le fond vise le <dialog> lui-même ; celui sur le
          // contenu vise un enfant.
          if (e.target === fenetre.current) fenetre.current?.close();
        }}
        className="w-[min(64rem,92vw)] rounded-3xl border border-pink-100 p-0 backdrop:bg-black/40"
      >
        <div className="max-h-[85vh] overflow-y-auto bg-white p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold">Les trois niveaux de nail art</h2>
              <p className="mt-1 text-sm text-foreground/70">
                Le niveau dépend de la <strong>complexité du dessin</strong>, pas du nombre
                d&rsquo;ongles décorés. <strong>Vous n&rsquo;avez pas à le choisir</strong> :
                demandez « avec nail art », décrivez ce que vous voulez et joignez une photo si
                vous en avez une. Je détermine le niveau à partir de là et je vous confirme le
                tarif avant le rendez-vous.
              </p>
            </div>
            <button
              type="button"
              onClick={() => fenetre.current?.close()}
              aria-label="Fermer"
              className="shrink-0 rounded-full border border-pink-200 px-3 py-1 text-sm text-pink-600 transition hover:bg-pink-50"
            >
              ✕
            </button>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            {niveaux.map((n) => (
              <figure
                key={n.niveau}
                className="flex flex-col overflow-hidden rounded-2xl border border-pink-100 bg-pink-50/40"
              >
                {n.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={n.photoUrl}
                    alt={`Exemple de nail art niveau ${n.niveau}`}
                    className="aspect-square w-full object-cover"
                  />
                ) : (
                  // Sans photo, on le dit plutôt que de laisser un cadre vide
                  // qui passerait pour une image qui n'a pas chargé.
                  <div className="flex aspect-square w-full items-center justify-center bg-pink-100/60 px-4 text-center text-sm text-pink-700">
                    Photo à venir
                  </div>
                )}
                <figcaption className="flex flex-1 flex-col p-4">
                  <p className="font-display text-lg font-bold text-pink-500">
                    Niveau {n.niveau}
                    <span className="ml-2 text-sm font-normal text-foreground/60">{n.titre}</span>
                  </p>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-foreground/80">{n.texte}</p>
                  {n.supplementMinCents !== null && (
                    <p className="mt-3 border-t border-pink-100 pt-3 text-sm font-semibold text-pink-600">
                      {n.supplementMinCents === n.supplementMaxCents
                        ? `+ ${formatPrix(n.supplementMinCents)}`
                        : `de + ${formatPrix(n.supplementMinCents)} à + ${formatPrix(n.supplementMaxCents ?? n.supplementMinCents)}`}
                      <span className="ml-1 font-normal text-foreground/50">selon la technique</span>
                    </p>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>

          <p className="mt-5 text-xs text-foreground/55">
            Ces exemples sont indicatifs : un même dessin peut changer de niveau selon la finesse
            demandée. En cas de doute, je vous le dis avant le rendez-vous.
          </p>
        </div>
      </dialog>
    </>
  );
}
