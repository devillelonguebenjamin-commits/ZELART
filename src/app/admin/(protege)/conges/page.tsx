import { prisma } from "@/lib/prisma";
import { formatJour } from "@/lib/creneaux";
import { ajouterConge, supprimerConge } from "@/actions/admin";

export const dynamic = "force-dynamic";

export default async function Conges() {
  const conges = await prisma.indisponibilite.findMany({ orderBy: { debut: "asc" } });
  const maintenant = new Date();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Congés &amp; fermetures</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Les jours bloqués n&rsquo;apparaissent plus dans les créneaux proposés aux clientes.
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
            <span className="text-foreground/70">Au (inclus — laisser vide pour un seul jour)</span>
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
            return (
              <div
                key={conge.id}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-pink-100 bg-white px-5 py-3 text-sm ${passe ? "opacity-50" : ""}`}
              >
                <span className="capitalize">
                  {formatJour(conge.debut)} → {formatJour(dernierJour)}
                  {conge.motif && <span className="text-foreground/60"> · {conge.motif}</span>}
                </span>
                <form action={supprimerConge.bind(null, conge.id)}>
                  <button
                    type="submit"
                    className="rounded-full border border-pink-200 px-4 py-1.5 text-xs text-pink-600 transition hover:bg-pink-50"
                  >
                    Supprimer
                  </button>
                </form>
              </div>
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
