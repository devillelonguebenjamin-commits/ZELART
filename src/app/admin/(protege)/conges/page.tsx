import { prisma } from "@/lib/prisma";
import { formatHeure, formatJour, jourParis, partiesParis } from "@/lib/creneaux";
import { ajouterConge, modifierConge, supprimerConge } from "@/actions/admin";

export const dynamic = "force-dynamic";

const CHAMP =
  "mt-1 block w-full rounded-xl border border-pink-200 px-3 py-2 text-sm outline-none focus:border-pink-500";

/**
 * Une même table porte deux choses : les congés posés ici en journées entières,
 * et les créneaux personnels posés à l'heure près depuis le tableau de bord.
 * Les distinguer n'est pas cosmétique — éditer un blocage de 14 h à 15 h avec un
 * formulaire de dates en ferait une journée fermée.
 *
 * La marque est la seule que les données portent : une période qui commence et
 * finit à minuit, heure de Paris, est une affaire de journées.
 */
function estJourneesEntieres(debut: Date, fin: Date): boolean {
  const d = partiesParis(debut);
  const f = partiesParis(fin);
  return d.heure === 0 && d.minute === 0 && f.heure === 0 && f.minute === 0;
}

function valeurDateHeure(date: Date): string {
  const { heure, minute } = partiesParis(date);
  return `${jourParis(date)}T${String(heure).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export default async function Conges({
  searchParams,
}: {
  searchParams: Promise<{ conflit?: string }>;
}) {
  const [conges, { conflit }] = await Promise.all([
    prisma.indisponibilite.findMany({ orderBy: { debut: "asc" } }),
    searchParams,
  ]);
  const maintenant = new Date();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Congés &amp; fermetures</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Les jours bloqués n&rsquo;apparaissent plus dans les créneaux proposés aux clientes.
          Chaque période reste modifiable : rallonger des congés ne demande pas de les supprimer
          puis de les reposer.
        </p>
      </div>

      <section className="rounded-2xl border border-pink-100 bg-white p-5">
        <h2 className="font-semibold">Bloquer une période</h2>
        <form action={ajouterConge} className="mt-3 flex flex-wrap items-end gap-4">
          <label className="block text-sm">
            <span className="text-foreground/70">Du</span>
            <input
              type="date"
              name="dateDebut"
              required
              className="mt-1 block rounded-xl border border-pink-200 px-3 py-2 outline-none focus:border-pink-500"
            />
          </label>
          <label className="block text-sm">
            <span className="text-foreground/70">Au (inclus ; laisser vide pour un seul jour)</span>
            <input
              type="date"
              name="dateFin"
              className="mt-1 block rounded-xl border border-pink-200 px-3 py-2 outline-none focus:border-pink-500"
            />
          </label>
          <label className="block flex-1 text-sm">
            <span className="text-foreground/70">Motif (facultatif)</span>
            <input
              name="motif"
              placeholder="Vacances, formation…"
              className="mt-1 block w-full min-w-40 rounded-xl border border-pink-200 px-3 py-2 outline-none focus:border-pink-500"
            />
          </label>
          <button
            type="submit"
            className="rounded-full bg-pink-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-pink-600"
          >
            Bloquer
          </button>
        </form>
      </section>

      <section>
        <h2 className="font-display text-xl font-bold">Périodes bloquées</h2>
        <div className="mt-3 grid gap-2">
          {conges.map((conge) => {
            const dernierJour = new Date(conge.fin.getTime() - 12 * 60 * 60 * 1000);
            const passe = conge.fin < maintenant;
            const journees = estJourneesEntieres(conge.debut, conge.fin);
            const dureeMin = Math.round((conge.fin.getTime() - conge.debut.getTime()) / 60_000);

            return (
              <details
                key={conge.id}
                open={conflit === conge.id}
                className={`group rounded-2xl border border-pink-100 bg-white ${passe ? "opacity-50" : ""}`}
              >
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                  <span className="capitalize">
                    {journees ? (
                      <>
                        {formatJour(conge.debut)} → {formatJour(dernierJour)}
                      </>
                    ) : (
                      <>
                        {formatJour(conge.debut)}, {formatHeure(conge.debut)} →{" "}
                        {formatHeure(conge.fin)}
                      </>
                    )}
                    {conge.motif && <span className="text-foreground/60"> · {conge.motif}</span>}
                  </span>
                  <span className="text-xs text-pink-600 group-open:hidden">Modifier</span>
                </summary>

                <div className="border-t border-pink-50 px-5 py-4">
                  {conflit === conge.id && (
                    <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      Une cliente a rendez-vous sur la période demandée : rien n&rsquo;a été
                      modifié. Bloquer ce créneau n&rsquo;annulerait pas son rendez-vous, vous
                      auriez les deux. Annulez-le d&rsquo;abord depuis le tableau de bord, ou
                      choisissez d&rsquo;autres dates.
                    </p>
                  )}

                  <form
                    action={modifierConge.bind(null, conge.id)}
                    className="grid gap-3 sm:grid-cols-3"
                  >
                    <input type="hidden" name="forme" value={journees ? "journees" : "heure"} />

                    {journees ? (
                      <>
                        <label className="block text-sm">
                          <span className="text-foreground/70">Du</span>
                          <input
                            type="date"
                            name="dateDebut"
                            required
                            defaultValue={jourParis(conge.debut)}
                            className={CHAMP}
                          />
                        </label>
                        <label className="block text-sm">
                          <span className="text-foreground/70">Au (inclus)</span>
                          <input
                            type="date"
                            name="dateFin"
                            required
                            defaultValue={jourParis(dernierJour)}
                            className={CHAMP}
                          />
                        </label>
                      </>
                    ) : (
                      <>
                        <label className="block text-sm">
                          <span className="text-foreground/70">Début</span>
                          <input
                            type="datetime-local"
                            name="debut"
                            required
                            defaultValue={valeurDateHeure(conge.debut)}
                            className={CHAMP}
                          />
                        </label>
                        <label className="block text-sm">
                          <span className="text-foreground/70">Durée (minutes)</span>
                          <input
                            type="number"
                            name="dureeMin"
                            min={15}
                            max={720}
                            step={15}
                            required
                            defaultValue={dureeMin}
                            className={CHAMP}
                          />
                        </label>
                      </>
                    )}

                    <label className="block text-sm">
                      <span className="text-foreground/70">Motif</span>
                      <input
                        name="motif"
                        defaultValue={conge.motif ?? ""}
                        placeholder="Vacances, formation…"
                        className={CHAMP}
                      />
                    </label>

                    <div className="flex flex-wrap items-center gap-2 sm:col-span-3">
                      <button
                        type="submit"
                        className="rounded-full bg-pink-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-pink-600"
                      >
                        Enregistrer
                      </button>
                      <button
                        type="submit"
                        formAction={supprimerConge.bind(null, conge.id)}
                        className="rounded-full border border-pink-200 px-5 py-2 text-sm text-pink-600 transition hover:bg-pink-50"
                      >
                        Supprimer
                      </button>
                      <span className="text-xs text-foreground/50">
                        {journees
                          ? "Période en journées entières."
                          : "Créneau posé à l’heure près depuis le tableau de bord."}
                      </span>
                    </div>
                  </form>
                </div>
              </details>
            );
          })}
          {conges.length === 0 && (
            <p className="rounded-2xl bg-pink-50 px-5 py-4 text-sm text-foreground/70">
              Aucune période bloquée.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
