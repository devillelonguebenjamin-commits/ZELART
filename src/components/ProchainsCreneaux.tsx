import Link from "next/link";
import type { Creneau } from "@/lib/creneaux";

// Les premières disponibilités réelles, sur la page d'accueil.
//
// La disponibilité est le premier argument d'un salon, et elle était cachée
// derrière un clic : la page annonçait les horaires théoriques, pas ce qui reste
// libre. Une visiteuse devait ouvrir la réservation pour savoir s'il y avait de
// la place cette semaine, et beaucoup ne l'ouvraient pas.
//
// Le nombre affiché est volontairement petit : trois créneaux disent « il reste
// de la place, mais pas tant que ça », là où une liste de trente dirait
// « personne ne vient ici ».

const A_MONTRER = 3;

export default function ProchainsCreneaux({ creneaux }: { creneaux: Creneau[] }) {
  const prochains = creneaux.slice(0, A_MONTRER);
  if (prochains.length === 0) {
    return (
      <div className="rounded-3xl border border-pink-100 bg-white p-6 text-center">
        <p className="text-foreground/75">
          Tout est réservé sur les deux prochains mois. Inscrivez-vous en liste d&rsquo;attente,
          je vous préviens dès qu&rsquo;une place se libère.
        </p>
        <Link
          href="/reserver"
          className="mt-4 inline-block rounded-full bg-pink-500 px-7 py-2.5 font-medium text-white transition hover:bg-pink-600"
        >
          Être prévenue
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-pink-100 bg-white p-6 sm:p-8">
      <p className="text-center font-display text-xl font-bold">
        Mes prochaines disponibilités
      </p>
      <ul className="mt-5 grid gap-3 sm:grid-cols-3">
        {prochains.map((creneau) => (
          <li key={creneau.debut}>
            <Link
              href="/reserver"
              className="flex h-full flex-col items-center rounded-2xl border border-pink-200 bg-pink-50/60 px-4 py-4 text-center transition hover:border-pink-400 hover:bg-pink-50"
            >
              <span className="font-medium capitalize text-foreground/85">{creneau.jourLabel}</span>
              <span className="mt-1 font-display text-2xl font-bold text-pink-500">
                {creneau.heureLabel}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-center text-sm text-foreground/60">
        {creneaux.length > A_MONTRER
          ? `${creneaux.length} créneaux libres au total sur les deux prochains mois.`
          : creneaux.length === 1
            ? "C'est le dernier créneau libre pour le moment."
            : `Il reste ${creneaux.length} créneaux libres pour le moment.`}
      </p>
      <p className="mt-4 text-center">
        <Link
          href="/reserver"
          className="inline-block rounded-full bg-pink-500 px-8 py-3 font-medium text-white shadow-md transition hover:bg-pink-600"
        >
          Voir tous les créneaux
        </Link>
      </p>
    </div>
  );
}
