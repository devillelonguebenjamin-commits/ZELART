import { prisma } from "@/lib/prisma";
import { reglagesRoue } from "@/lib/parametres";
import { partEffective, totalChances } from "@/lib/roue";
import { enregistrerPosesParTour, modifierLot, supprimerLot } from "@/actions/lots";
import FormulaireNouveauLot from "@/components/FormulaireNouveauLot";
import RoueFidelite from "@/components/RoueFidelite";

export const dynamic = "force-dynamic";

export default async function AdminRoue() {
  const [lots, { lots: lotsActifs, posesParTour }, gains] = await Promise.all([
    prisma.lotFidelite.findMany({
      orderBy: { ordre: "asc" },
      include: { _count: { select: { recompenses: true } } },
    }),
    reglagesRoue(),
    prisma.recompense.groupBy({ by: ["lotId"], _count: { _all: true } }),
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
          10, 30 et 59 comme aujourd&rsquo;hui, ou 1, 2, 3 — seule la proportion compte.
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
