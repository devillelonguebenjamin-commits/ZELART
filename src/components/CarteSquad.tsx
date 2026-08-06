import { LIBELLE_AVANTAGE, PALIERS, type StatutParrainage } from "@/lib/parrainage";
import PartageCodeParrainage from "@/components/PartageCodeParrainage";
import type { TypeAvantage } from "@/generated/prisma/client";

type Avantage = { id: string; type: TypeAvantage; code: string; utiliseLe: Date | null };

export default function CarteSquad({
  code,
  lienSite,
  statut,
  avantages,
  filleules,
}: {
  code: string;
  lienSite: string;
  statut: StatutParrainage;
  avantages: Avantage[];
  filleules: { id: string; prenom: string }[];
}) {
  const disponibles = avantages.filter((a) => !a.utiliseLe);
  const utilises = avantages.filter((a) => a.utiliseLe);
  // Le palier « Squad en formation » n'est qu'un point de départ : on n'affiche
  // que les échelons réellement atteignables.
  const echelons = PALIERS.filter((p) => p.seuil > 0);
  const progression = statut.suivant
    ? Math.min(100, Math.round((statut.filleulesVenues / statut.suivant.seuil) * 100))
    : 100;

  return (
    <section className="rounded-3xl bg-pink-50 p-6 sm:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display text-xl font-bold">Ma squad {statut.palier.emoji}</h2>
        {statut.filleulesVenues > 0 && (
          <span className="rounded-full bg-pink-500 px-4 py-1 text-sm font-semibold text-white">
            {statut.palier.nom}
          </span>
        )}
      </div>

      <p className="mt-2 text-sm text-foreground/75">
        Partagez votre code : la personne le saisit à sa première réservation, elle repart avec{" "}
        <strong>−15 %</strong>, et votre squad s&rsquo;agrandit.
      </p>

      <p className="mt-4 inline-block rounded-2xl border-2 border-dashed border-pink-300 bg-white px-6 py-3 font-display text-2xl font-bold tracking-wider text-pink-600">
        {code}
      </p>
      <PartageCodeParrainage code={code} lien={lienSite} />

      {/* Progression vers le palier suivant */}
      <div className="mt-6">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium">
            {statut.filleulesVenues} filleule{statut.filleulesVenues > 1 ? "s" : ""} venue
            {statut.filleulesVenues > 1 ? "s" : ""}
          </span>
          {statut.suivant && (
            <span className="text-foreground/60">
              plus que {statut.restantes} pour {statut.suivant.nom}
            </span>
          )}
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white">
          <div
            className="h-full rounded-full bg-pink-500 transition-[width] duration-500"
            style={{ width: `${progression}%` }}
          />
        </div>
      </div>

      {/* Les échelons, pour donner envie du suivant */}
      <ul className="mt-5 grid gap-2 text-sm">
        {echelons.map((echelon) => {
          const atteint = statut.filleulesVenues >= echelon.seuil;
          return (
            <li
              key={echelon.cle}
              className={`flex items-start gap-3 rounded-2xl px-4 py-2.5 ${
                atteint ? "bg-white" : "bg-white/50 text-foreground/55"
              }`}
            >
              <span aria-hidden className="text-lg leading-6">
                {atteint ? echelon.emoji : "🔒"}
              </span>
              <span>
                <span className="font-medium">
                  {echelon.nom}
                  <span className="font-normal text-foreground/55">
                    {" "}
                    · {echelon.seuil} filleule{echelon.seuil > 1 ? "s" : ""}
                  </span>
                </span>
                <span className="block text-xs">{echelon.avantage}</span>
              </span>
            </li>
          );
        })}
      </ul>

      {statut.ambassadriceEnSommeil && (
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Votre statut Ambassadrice est en pause : il se réactive dès qu&rsquo;une nouvelle
          filleule vient. Les avantages déjà gagnés vous restent acquis.
        </p>
      )}

      {disponibles.length > 0 && (
        <div className="mt-5 rounded-2xl bg-white p-5">
          <p className="text-sm font-semibold">À utiliser à votre prochain rendez-vous</p>
          <ul className="mt-2 grid gap-2 text-sm">
            {disponibles.map((avantage) => (
              <li key={avantage.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>{LIBELLE_AVANTAGE[avantage.type]}</span>
                <code className="rounded-lg bg-pink-50 px-3 py-1 text-xs font-semibold text-pink-700">
                  {avantage.code}
                </code>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-foreground/55">
            Il suffit de le mentionner à Zélia — elle s&rsquo;occupe du reste.
          </p>
        </div>
      )}

      {utilises.length > 0 && (
        <p className="mt-3 text-xs text-foreground/50">
          {utilises.length} avantage{utilises.length > 1 ? "s" : ""} déjà utilisé
          {utilises.length > 1 ? "s" : ""}.
        </p>
      )}

      {filleules.length > 0 && (
        <p className="mt-4 text-sm font-medium text-foreground/80">
          🎉 Merci à {filleules.map((f) => f.prenom).join(", ")}
        </p>
      )}
    </section>
  );
}
