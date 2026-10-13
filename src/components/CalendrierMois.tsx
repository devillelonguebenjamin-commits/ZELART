import Link from "next/link";
import { JOURS_SEMAINE, type GrilleMois } from "@/lib/calendrier";
import { formatHeure } from "@/lib/creneaux";
import CalendrierInteractif from "@/components/CalendrierInteractif";

// Couleurs alignées sur les badges de l'agenda : une pastille bleue dans le
// calendrier et un badge bleu dans la liste doivent dire la même chose.
const TEINTE: Record<string, string> = {
  EN_ATTENTE: "bg-amber-100 text-amber-900 hover:bg-amber-200",
  CONFIRME: "bg-emerald-100 text-emerald-900 hover:bg-emerald-200",
  TERMINE: "bg-sky-100 text-sky-900 hover:bg-sky-200",
  ANNULE: "bg-stone-100 text-stone-500 line-through hover:bg-stone-200",
  NO_SHOW: "bg-red-100 text-red-800 hover:bg-red-200",
  INDISPONIBLE: "bg-neutral-200 text-neutral-700 hover:bg-neutral-300",
};

// L'ordre est celui de la légende, et celui des pastilles dans chaque jour.
const STATUTS: [cle: string, singulier: string, pluriel: string][] = [
  ["EN_ATTENTE", "à confirmer", "à confirmer"],
  ["CONFIRME", "confirmé", "confirmés"],
  ["TERMINE", "réalisé", "réalisés"],
  ["NO_SHOW", "absente", "absentes"],
  ["ANNULE", "annulé", "annulés"],
  ["INDISPONIBLE", "bloqué", "bloqués"],
];

/** Statut d'affichage : une indisponibilité n'a pas de statut de rendez-vous. */
function cleStatut(evenement: { indisponible?: boolean; statut: string }): string {
  return evenement.indisponible ? "INDISPONIBLE" : evenement.statut;
}

/** Annulés masqués par défaut : barrés, ils encombraient sans rien apprendre. */
export const MASQUES_PAR_DEFAUT = ["ANNULE"];

export default function CalendrierMois({
  grille,
  masques = MASQUES_PAR_DEFAUT,
  detail = false,
}: {
  grille: GrilleMois;
  /** Statuts masqués, retenus d'une visite à l'autre. */
  masques?: string[];
  /** Jours dépliés d'office. */
  detail?: boolean;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold capitalize">{grille.libelle}</h2>
        <div className="flex items-center gap-1">
          <Lien cible={grille.precedent} libelle="Mois précédent">
            ←
          </Lien>
          {/* Sans paramètre, la page retombe sur le mois courant : c'est le
              retour au présent, sans avoir à calculer la date du jour ici. */}
          <Link
            href="/admin"
            className="rounded-full border border-pink-200 px-4 py-1.5 text-sm font-medium text-pink-600 transition hover:bg-pink-50"
          >
            Aujourd&rsquo;hui
          </Link>
          <Lien cible={grille.suivant} libelle="Mois suivant">
            →
          </Lien>
        </div>
      </div>

      <CalendrierInteractif
        legende={STATUTS.map(([cle, singulier]) => ({
          cle,
          libelle: singulier,
          teinte: (TEINTE[cle] ?? "").split(" ")[0],
        }))}
        masquesInitiaux={masques}
        detailInitial={detail}
      >
      <div className="mt-3 overflow-x-auto">
        <div className="min-w-3xl overflow-hidden rounded-2xl border border-pink-100 bg-white">
          <div className="grid grid-cols-7 border-b border-pink-100 bg-pink-50/60">
            {JOURS_SEMAINE.map((jour) => (
              <div
                key={jour}
                className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-foreground/60"
              >
                {jour}
              </div>
            ))}
          </div>

          {grille.semaines.map((semaine, i) => (
            <div key={i} className="grid grid-cols-7 border-b border-pink-50 last:border-0">
              {semaine.map((jour) => (
                <div
                  key={jour.cle}
                  className={`min-h-24 border-r border-pink-50 p-1.5 last:border-0 ${
                    !jour.duMois
                      ? "bg-pink-50/30"
                      : jour.ferme
                        ? // Repos : hachures légères plutôt qu'un aplat, pour
                          // que la case reste lisible si un rendez-vous y a
                          // malgré tout été noté à la main.
                          "bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,rgb(0_0_0/0.035)_6px,rgb(0_0_0/0.035)_12px)]"
                        : ""
                  }`}
                >
                  <p
                    className={`mb-1 text-right text-xs ${
                      jour.aujourdhui
                        ? "font-bold text-pink-600"
                        : jour.duMois
                          ? "text-foreground/60"
                          : "text-foreground/30"
                    }`}
                  >
                    {jour.aujourdhui ? (
                      <span className="rounded-full bg-pink-500 px-1.5 py-0.5 text-white">
                        {jour.numero}
                      </span>
                    ) : (
                      jour.numero
                    )}
                  </p>

                  {jour.evenements.length > 0 && (
                  // Chaque jour se résume à une pastille comptée par statut, et
                  // se déplie au clic. Les pastilles disparaissent une fois le
                  // jour déplié : elles redoubleraient le détail.
                  <details data-jour open={detail} className="group/jour">
                    <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                      <span className="flex flex-col gap-1 group-open/jour:hidden">
                        {STATUTS.map(([cle, singulier, pluriel]) => {
                          const n = jour.evenements.filter((e) => cleStatut(e) === cle).length;
                          if (n === 0) return null;
                          return (
                            <span
                              key={cle}
                              data-statut={cle}
                              className={`block truncate rounded-md px-1.5 py-1 text-[11px] font-medium leading-tight ${TEINTE[cle]}`}
                            >
                              {n} {n > 1 ? pluriel : singulier}
                            </span>
                          );
                        })}
                      </span>
                      <span className="hidden text-right text-[10px] text-foreground/45 group-open/jour:block">
                        replier ▴
                      </span>
                    </summary>
                  <div className="mt-1 space-y-1">
                    {jour.evenements.map((evenement) => {
                      // Un congé couvre des journées entières : l'heure n'y veut
                      // rien dire. Un créneau personnel, si — c'est même la
                      // seule chose qu'on ait besoin de lire d'un coup d'œil.
                      const journeeEntiere =
                        evenement.fin.getTime() - evenement.debut.getTime() >= 20 * 3600_000;
                      const contenu = (
                        <>
                          <span className="font-medium">
                            {evenement.indisponible && journeeEntiere
                              ? "🚫"
                              : formatHeure(evenement.debut)}
                          </span>{" "}
                          {evenement.titre}
                          {evenement.soustitre && (
                            <span className="block truncate opacity-70">{evenement.soustitre}</span>
                          )}
                        </>
                      );
                      const classe = `block w-full truncate rounded-md px-1.5 py-1 text-left text-[11px] leading-tight transition ${
                        TEINTE[evenement.indisponible ? "INDISPONIBLE" : evenement.statut] ??
                        TEINTE.EN_ATTENTE
                      }`;
                      return evenement.lien ? (
                        <Link
                          key={evenement.id}
                          href={evenement.lien}
                          data-statut={cleStatut(evenement)}
                          className={classe}
                        >
                          {contenu}
                        </Link>
                      ) : (
                        <span key={evenement.id} data-statut={cleStatut(evenement)} className={classe}>
                          {contenu}
                        </span>
                      );
                    })}
                  </div>
                  </details>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <p className="mt-2 flex items-center gap-1.5 text-xs text-foreground/55">
        <span className="h-3 w-3 rounded-sm border border-pink-100 bg-[repeating-linear-gradient(135deg,transparent,transparent_2px,rgb(0_0_0/0.12)_2px,rgb(0_0_0/0.12)_4px)]" />
        jour de repos · cliquez sur un jour pour voir ses rendez-vous
      </p>
      </CalendrierInteractif>
    </div>
  );
}

function Lien({
  cible,
  libelle,
  children,
}: {
  cible: string;
  libelle: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={`/admin?mois=${cible}`}
      aria-label={libelle}
      title={libelle}
      className="rounded-full border border-pink-200 px-3 py-1.5 text-sm font-medium text-pink-600 transition hover:bg-pink-50"
    >
      {children}
    </Link>
  );
}
