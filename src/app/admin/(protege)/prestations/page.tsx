import { prisma } from "@/lib/prisma";
import { grouperParCategorie } from "@/lib/format";
import { modifierPrestation } from "@/actions/admin";
import { niveauxNailArt } from "@/lib/explications";
import { niveauxExpliques } from "@/lib/nail-art";
import ReglagesNiveauNailArt from "@/components/ReglagesNiveauNailArt";

export const dynamic = "force-dynamic";

export default async function Prestations() {
  const prestations = await prisma.prestation.findMany({ orderBy: { ordre: "asc" } });
  const categories = grouperParCategorie(prestations);
  const niveaux = await niveauxExpliques(niveauxNailArt(prestations.filter((p) => p.active)));

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Prestations &amp; tarifs</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Modifiez le prix, la durée ou décochez « visible » pour retirer une prestation de la
        réservation sans la supprimer. Chaque ligne s&rsquo;enregistre avec son bouton ✓.
      </p>
      <p className="mt-2 text-sm text-foreground/60">
        <strong>« Au choix »</strong> décide si la cliente peut cocher la prestation elle-même. Les
        trois niveaux de nail art sont décochés : la cliente demande « avec nail art » et décrit ce
        qu&rsquo;elle veut, c&rsquo;est vous qui fixez le niveau depuis l&rsquo;agenda, avec
        « Ajuster le niveau ». Les niveaux restent affichés et tarifés sur le site public, ils ne
        sont simplement plus cochables.
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
                    <th className="px-4 py-2.5 font-medium">Au choix</th>
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
                        <input
                          form={`form-${p.id}`}
                          type="checkbox"
                          name="choixCliente"
                          defaultChecked={p.choixCliente}
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

      {/* ── Les niveaux de nail art, tels que les clientes les verront ──── */}
      <section className="mt-12">
        <h2 className="font-display text-lg font-bold text-pink-500">Les trois niveaux de nail art</h2>
        <p className="mt-1 max-w-3xl text-sm text-foreground/60">
          Une fenêtre de comparaison s&rsquo;ouvre depuis la page des prestations et depuis le
          choix de la prestation à la réservation. « Niveau 2 » ne veut rien dire tant qu&rsquo;on
          n&rsquo;a pas vu : ce sont surtout les <strong>photos</strong> qui répondent.
        </p>
        <p className="mt-1 max-w-3xl text-sm text-foreground/60">
          Les textes ci-dessous sont un point de départ, écrits prudemment : vous seule savez ce
          qui sépare un niveau 2 d&rsquo;un niveau 3. Remplacez-les par vos mots. Vider un champ
          fait revenir la formulation par défaut plutôt qu&rsquo;un blanc.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {niveaux.map((niveau) => (
            <ReglagesNiveauNailArt key={niveau.niveau} niveau={niveau} />
          ))}
        </div>
      </section>
    </div>
  );
}
