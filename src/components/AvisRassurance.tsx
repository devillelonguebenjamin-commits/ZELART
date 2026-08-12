import type { FicheAvis } from "@/lib/avis";

// Deux avis, juste avant le formulaire de réservation.
//
// Les avis vivaient en bas de la page d'accueil, c'est-à-dire loin de l'endroit
// où la décision se prend. Une personne qui hésite à laisser ses coordonnées
// cherche à savoir si elle peut faire confiance, et c'est ici qu'elle se le
// demande, pas trois pages plus tôt.
//
// Deux seulement, et courts : le bloc doit rassurer sans repousser le formulaire
// sous la ligne de flottaison.

const LONGUEUR_MAX = 150;

export default function AvisRassurance({ fiche }: { fiche: FicheAvis | null }) {
  if (!fiche || fiche.avis.length === 0) return null;

  // Les avis les plus courts sont les plus lisibles ici, et ce sont eux qui
  // tiennent sans coupure. Les conditions de Google interdisent de les
  // retoucher : on choisit donc parmi ceux qui entrent tels quels.
  const retenus = fiche.avis
    .filter((a) => a.note >= 4 && a.texte.length <= LONGUEUR_MAX)
    .slice(0, 2);
  if (retenus.length === 0) return null;

  return (
    <div className="mx-auto mt-8 max-w-3xl">
      <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-foreground/70">
        {fiche.note !== null && (
          <span className="font-semibold text-amber-500">
            {fiche.note.toFixed(1).replace(".", ",")} / 5 ★
          </span>
        )}
        {fiche.nombre !== null && <span>sur {fiche.nombre} avis Google</span>}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {retenus.map((avis) => (
          <figure
            key={`${avis.auteur}-${avis.texte.slice(0, 20)}`}
            className="rounded-2xl border border-pink-100 bg-white px-5 py-4"
          >
            <blockquote className="text-sm leading-relaxed text-foreground/80">
              « {avis.texte} »
            </blockquote>
            <figcaption className="mt-2 text-xs text-foreground/55">{avis.auteur}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
