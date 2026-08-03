import { prisma } from "@/lib/prisma";
import { grouperParCategorie } from "@/lib/format";
import { modifierPrestation } from "@/actions/admin";

export const dynamic = "force-dynamic";

export default async function Prestations() {
  const prestations = await prisma.prestation.findMany({ orderBy: { ordre: "asc" } });
  const categories = grouperParCategorie(prestations);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Prestations &amp; tarifs</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Modifiez le prix, la durée ou décochez « visible » pour retirer une prestation de la
        réservation sans la supprimer. Chaque ligne s&rsquo;enregistre avec son bouton ✓.
      </p>
      <div className="mt-6 space-y-8">
        {categories.map((categorie) => (
          <section key={categorie.nom}>
            <h2 className="font-display text-lg font-bold text-pink-500">{categorie.nom}</h2>
            <div className="mt-2 overflow-x-auto rounded-2xl border border-pink-100 bg-white">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-pink-100 text-left text-foreground/60">
                    <th className="px-4 py-2.5 font-medium">Prestation</th>
                    <th className="px-4 py-2.5 font-medium">Prix (€)</th>
                    <th className="px-4 py-2.5 font-medium">« à partir de »</th>
                    <th className="px-4 py-2.5 font-medium">Durée (min)</th>
                    <th className="px-4 py-2.5 font-medium">Visible</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {categorie.prestations.map((p) => (
                    <tr key={p.id} className="border-b border-pink-50 last:border-0">
                      <td className="px-4 py-2.5">{p.nom}</td>
                      <td className="px-4 py-2.5">
                        <input
                          form={`form-${p.id}`}
                          name="prixEuros"
                          defaultValue={(p.prixCents / 100).toString().replace(".", ",")}
                          inputMode="decimal"
                          className="w-20 rounded-lg border border-pink-200 px-2 py-1 text-right outline-none focus:border-pink-500"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          form={`form-${p.id}`}
                          type="checkbox"
                          name="aPartirDe"
                          defaultChecked={p.aPartirDe}
                          className="accent-pink-500"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          form={`form-${p.id}`}
                          name="dureeMin"
                          type="number"
                          min={15}
                          step={15}
                          defaultValue={p.dureeMin}
                          className="w-20 rounded-lg border border-pink-200 px-2 py-1 text-right outline-none focus:border-pink-500"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          form={`form-${p.id}`}
                          type="checkbox"
                          name="active"
                          defaultChecked={p.active}
                          className="accent-pink-500"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <form id={`form-${p.id}`} action={modifierPrestation}>
                          <input type="hidden" name="id" value={p.id} />
                          <button
                            type="submit"
                            title="Enregistrer"
                            className="rounded-full bg-pink-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-pink-600"
                          >
                            ✓
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
