import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { reglagesRoue } from "@/lib/parametres";
import { partEffective, totalChances } from "@/lib/roue";
import { formatJour } from "@/lib/creneaux";
import { cadeauxADonner, clientesEligibles, historiqueRoue } from "@/lib/roue-suivi";
import { enregistrerPosesParTour, modifierLot, supprimerLot } from "@/actions/lots";
import { marquerRecompenseUtilisee } from "@/actions/clientes";
import FormulaireNouveauLot from "@/components/FormulaireNouveauLot";
import RoueFidelite from "@/components/RoueFidelite";

export const dynamic = "force-dynamic";

export default async function AdminRoue() {
  const [lots, { lots: lotsActifs, posesParTour }, gains, aDonner, eligibles, historique] =
    await Promise.all([
      prisma.lotFidelite.findMany({
        orderBy: { ordre: "asc" },
        include: { _count: { select: { recompenses: true } } },
      }),
      reglagesRoue(),
      prisma.recompense.groupBy({ by: ["lotId"], _count: { _all: true } }),
      cadeauxADonner(),
      clientesEligibles(),
      historiqueRoue(),
    ]);

  const total = totalChances(lotsActifs);
  const gainsParLot = new Map(gains.map((g) => [g.lotId, g._count._all]));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Roue de fidélité</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Vos clientes gagnent un tour toutes les {posesParTour} poses réalisées. La roue est
            toujours gagnante : chaque lot est tiré selon son poids.
          </p>
        </div>
        <FormulaireNouveauLot />
      </div>

      {/* Ce qui attend un geste : les cadeaux gagnés et pas encore remis. */}
      <section>
        <h2 className="font-display text-xl font-bold">
          Cadeaux à remettre{" "}
          {aDonner.length > 0 && (
            <span className="ml-1 align-middle rounded-full bg-pink-500 px-3 py-1 text-sm font-semibold text-white">
              {aDonner.length}
            </span>
          )}
        </h2>
        {aDonner.length === 0 ? (
          <p className="mt-3 rounded-2xl bg-pink-50 px-5 py-4 text-sm text-foreground/70">
            Aucun cadeau en attente. Tout ce qui a été gagné a été honoré 🤍
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {aDonner.map((gain) => (
              <li
                key={gain.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-pink-200 bg-white px-5 py-3 text-sm"
              >
                <Link
                  href={`/admin/clientes/${gain.cliente.id}`}
                  className="font-medium text-pink-600 hover:underline"
                >
                  {gain.cliente.prenom} {gain.cliente.nom}
                </Link>
                <span className="min-w-40 flex-1">{gain.libelle}</span>
                {gain.aRetirerAuSalon ? (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                    à retirer au salon
                  </span>
                ) : (
                  <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800">
                    à appliquer sur sa prochaine pose
                  </span>
                )}
                <span className="text-xs text-foreground/55">
                  gagné le {formatJour(gain.gagneLe)} · <code>{gain.code}</code>
                </span>
                <form action={marquerRecompenseUtilisee.bind(null, gain.id, true)}>
                  <button
                    type="submit"
                    className="rounded-full bg-pink-500 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-pink-600"
                  >
                    Remis
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Une occasion, pas une tâche : Zélia ne peut pas tourner à leur place. */}
      <section>
        <h2 className="font-display text-xl font-bold">Elles peuvent tourner</h2>
        {eligibles.length === 0 ? (
          <p className="mt-3 rounded-2xl bg-pink-50 px-5 py-4 text-sm text-foreground/70">
            Personne n&rsquo;a de tour en attente pour l&rsquo;instant.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-foreground/60">
              Leur jauge est pleine et elles n&rsquo;ont pas encore joué. Rien à faire de votre
              côté : le tour se lance depuis leur espace. Un mot au fauteuil suffit souvent, elles
              ne pensent pas toujours à regarder.
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {eligibles.map((cliente) => (
                <li key={cliente.id}>
                  <Link
                    href={`/admin/clientes/${cliente.id}`}
                    className="flex items-center gap-2 rounded-full border border-pink-200 bg-white px-4 py-1.5 text-sm transition hover:bg-pink-50"
                  >
                    <span className="font-medium">
                      {cliente.prenom} {cliente.nom}
                    </span>
                    <span className="text-xs text-foreground/55">
                      {cliente.posesRealisees} pose{cliente.posesRealisees > 1 ? "s" : ""}
                    </span>
                    {cliente.tours > 1 && (
                      <span className="rounded-full bg-pink-100 px-2 py-0.5 text-[11px] font-bold text-pink-700">
                        {cliente.tours} tours
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* Historique */}
      <section>
        <h2 className="font-display text-xl font-bold">Historique des tours</h2>
        {historique.total === 0 ? (
          <p className="mt-3 rounded-2xl bg-pink-50 px-5 py-4 text-sm text-foreground/70">
            Aucun tour joué pour l&rsquo;instant.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-foreground/60">
              {historique.total} tour{historique.total > 1 ? "s" : ""} joué
              {historique.total > 1 ? "s" : ""} depuis la mise en place
              {historique.total > historique.lignes.length &&
                ` · les ${historique.lignes.length} plus récents ci-dessous`}
              .
            </p>
            <div className="mt-3 overflow-x-auto rounded-2xl border border-pink-100 bg-white">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-pink-100 text-left text-foreground/60">
                    <th className="px-4 py-2.5 font-medium">Cliente</th>
                    <th className="px-4 py-2.5 font-medium">Lot</th>
                    <th className="px-4 py-2.5 font-medium">Gagné le</th>
                    <th className="px-4 py-2.5 font-medium">État</th>
                  </tr>
                </thead>
                <tbody>
                  {historique.lignes.map((ligne) => (
                    <tr key={ligne.id} className="border-b border-pink-50 last:border-0">
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/admin/clientes/${ligne.cliente.id}`}
                          className="text-pink-600 hover:underline"
                        >
                          {ligne.cliente.prenom} {ligne.cliente.nom}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">{ligne.libelle}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap capitalize text-foreground/70">
                        {formatJour(ligne.gagneLe)}
                      </td>
                      <td className="px-4 py-2.5">
                        {ligne.utiliseLe ? (
                          <span className="text-emerald-700">
                            remis le {formatJour(ligne.utiliseLe)}
                          </span>
                        ) : (
                          <span className="font-medium text-amber-800">à remettre</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* Cadence */}
      <section className="rounded-2xl border border-pink-100 bg-white p-5">
        <h2 className="font-semibold">Nombre de poses pour gagner un tour</h2>
        <form action={enregistrerPosesParTour} className="mt-3 flex flex-wrap items-end gap-3">
          <input
            name="posesParTour"
            type="number"
            min={1}
            max={20}
            defaultValue={posesParTour}
            className="w-24 rounded-xl border border-pink-200 px-3 py-2 text-right outline-none focus:border-pink-500"
          />
          <button
            type="submit"
            className="rounded-full bg-pink-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-pink-600"
          >
            Enregistrer
          </button>
        </form>
      </section>

      {/* Lots */}
      <section>
        <h2 className="font-display text-xl font-bold">Les lots</h2>
        <p className="mt-1 text-sm text-foreground/60">
          La <strong>chance</strong> est un poids, pas forcément un pourcentage : la part réelle est
          calculée sur le total des lots actifs (actuellement {total}). Vous pouvez donc mettre 1,
          10, 30 et 59 comme aujourd&rsquo;hui, ou 1, 2, 3 : seule la proportion compte.
        </p>

        <div className="mt-4 space-y-3">
          {lots.map((lot) => {
            const gagnes = gainsParLot.get(lot.id) ?? 0;
            const part = lot.actif ? partEffective(lot, lotsActifs) : 0;
            return (
              <form
                key={lot.id}
                action={modifierLot}
                className="rounded-2xl border border-pink-100 bg-white p-4"
              >
                <input type="hidden" name="id" value={lot.id} />
                <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
                  <label className="block text-sm">
                    <span className="text-xs text-foreground/60">Libellé annoncé</span>
                    <input
                      name="libelle"
                      defaultValue={lot.libelle}
                      className="mt-1 w-full rounded-xl border border-pink-200 px-3 py-2 outline-none focus:border-pink-500"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-xs text-foreground/60">Sur la roue</span>
                    <input
                      name="texteSurRoue"
                      defaultValue={lot.texteSurRoue}
                      maxLength={16}
                      className="mt-1 w-32 rounded-xl border border-pink-200 px-3 py-2 outline-none focus:border-pink-500"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-xs text-foreground/60">Chance</span>
                    <input
                      name="chance"
                      type="number"
                      min={0}
                      defaultValue={lot.chance}
                      className="mt-1 w-20 rounded-xl border border-pink-200 px-3 py-2 text-right outline-none focus:border-pink-500"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-xs text-foreground/60">Couleur</span>
                    <input
                      name="couleur"
                      type="color"
                      defaultValue={lot.couleur}
                      className="mt-1 h-10 w-16 rounded-xl border border-pink-200 px-1"
                    />
                  </label>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="actif"
                      defaultChecked={lot.actif}
                      className="accent-pink-500"
                    />
                    <span>Sur la roue</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="aRetirerAuSalon"
                      defaultChecked={lot.aRetirerAuSalon}
                      className="accent-pink-500"
                    />
                    <span>À retirer au salon</span>
                  </label>
                  <span className="text-xs text-foreground/60">
                    {lot.actif ? `${part.toFixed(1)} % de chances` : "désactivé"} · {gagnes} fois
                    gagné
                  </span>
                  <span className="ml-auto flex gap-2">
                    <button
                      type="submit"
                      className="rounded-full bg-pink-500 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-pink-600"
                    >
                      Enregistrer
                    </button>
                    <button
                      type="submit"
                      formAction={supprimerLot.bind(null, lot.id)}
                      className="rounded-full border border-pink-200 px-4 py-1.5 text-xs text-pink-600 transition hover:bg-pink-50"
                    >
                      {gagnes > 0 ? "Retirer de la roue" : "Supprimer"}
                    </button>
                  </span>
                </div>
              </form>
            );
          })}
        </div>

        {lotsActifs.length === 0 && (
          <p className="mt-4 rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-900">
            Aucun lot actif : la roue n&rsquo;est pas jouable. Ajoutez-en au moins un.
          </p>
        )}
      </section>

      {/* Essai */}
      <section>
        <h2 className="font-display text-xl font-bold">Tester</h2>
        <p className="mt-1 text-sm text-foreground/60">
          Le rendu ci-dessous est exactement celui que voient vos clientes.
        </p>
        <div className="mt-4">
          <RoueFidelite
            lots={lotsActifs}
            posesParTour={posesParTour}
            posesRealisees={0}
            toursJoues={0}
            essai
          />
        </div>
      </section>
    </div>
  );
}
