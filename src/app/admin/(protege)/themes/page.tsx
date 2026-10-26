import Link from "next/link";
import { activerTheme, desactiverTheme } from "@/actions/themes";
import { reglageTheme, themeEnCours, THEMES } from "@/lib/saison";
import { DecorSaison, EMOJI_TITRE } from "@/components/Saisons";
import { jourParis } from "@/lib/creneaux";

export const dynamic = "force-dynamic";

/** « 2026-10-31 » → « 31 octobre 2026 ». */
function jourLisible(cle: string): string {
  const [a, m, j] = cle.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(a, m - 1, j))
  );
}

export default async function Themes() {
  const reglage = await reglageTheme();
  const visible = themeEnCours(reglage);
  const regle = THEMES.find((t) => t.id === reglage.theme);

  let etat: string;
  if (!regle) etat = "Aucun thème : le site a son habillage habituel.";
  else if (visible) {
    etat = `${regle.nom} est affiché sur le site${reglage.fin ? ` jusqu'au ${jourLisible(reglage.fin)} inclus` : ", jusqu'à ce que vous le désactiviez"}.`;
  } else if (reglage.debut && reglage.debut > jourParis(new Date())) {
    etat = `${regle.nom} est programmé : il apparaîtra le ${jourLisible(reglage.debut)}${reglage.fin ? ` et disparaîtra après le ${jourLisible(reglage.fin)}` : ""}.`;
  } else {
    etat = `${regle.nom} est terminé (fin le ${reglage.fin ? jourLisible(reglage.fin) : "?"}) : le site a repris son habillage habituel.`;
  }

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-display text-2xl font-bold">Thèmes de saison</h1>
        <p className="mt-1 max-w-2xl text-sm text-foreground/70">
          Un habillage pour les fêtes : un décor animé en haut de la page d&rsquo;accueil, et un
          bandeau sur toutes les pages qui invite à réserver un nail art de saison. Un seul thème à
          la fois. Les dates sont facultatives : elles permettent de le programmer à l&rsquo;avance
          et qu&rsquo;il disparaisse tout seul.
        </p>
        <div
          className={`mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-4 text-sm ${
            visible ? "bg-emerald-50 text-emerald-900" : "bg-pink-50 text-foreground/80"
          }`}
        >
          <span>
            <strong>En ce moment :</strong> {etat}
          </span>
          {regle && (
            <form action={desactiverTheme}>
              <button
                type="submit"
                className="rounded-full border border-stone-300 bg-white px-4 py-1.5 text-xs font-medium text-foreground/75 transition hover:bg-stone-50"
              >
                Désactiver le thème
              </button>
            </form>
          )}
        </div>
      </section>

      <div className="grid gap-5 sm:grid-cols-2">
        {THEMES.map((t) => {
          const actif = reglage.theme === t.id;
          return (
            <section
              key={t.id}
              className={`overflow-hidden rounded-2xl border bg-white ${actif ? "border-emerald-300 ring-2 ring-emerald-200" : "border-pink-100"}`}
            >
              {/* Aperçu réduit : le vrai décor, posé sur un faux haut de page. */}
              <div className="relative isolate h-48 overflow-hidden bg-[#fff8fb]">
                <DecorSaison theme={t.id} />
                <p className="font-display absolute inset-x-0 top-20 text-center text-xl font-bold">
                  Bienvenue chez <span className="text-pink-500">Zelart</span> {EMOJI_TITRE[t.id]}
                </p>
              </div>
              <div className="space-y-3 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold">
                    {t.emoji} {t.nom}
                  </h2>
                  {actif && (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                      {visible === t.id ? "Affiché" : "Programmé"}
                    </span>
                  )}
                </div>
                <p className="text-sm text-foreground/70">
                  {t.decor} Idéal {t.periode}.
                </p>
                <Link
                  href={`/?apercu=${t.id}`}
                  target="_blank"
                  className="inline-block text-sm font-medium text-pink-600 hover:underline"
                >
                  Voir l&rsquo;aperçu en grand ↗
                </Link>
                <form action={activerTheme.bind(null, t.id)} className="flex flex-wrap items-end gap-3 pt-1">
                  <label className="text-xs text-foreground/70">
                    Du (facultatif)
                    <input
                      type="date"
                      name="debut"
                      defaultValue={actif ? (reglage.debut ?? "") : ""}
                      className="mt-1 block rounded-xl border border-pink-200 px-3 py-1.5 text-sm"
                    />
                  </label>
                  <label className="text-xs text-foreground/70">
                    Au (inclus, facultatif)
                    <input
                      type="date"
                      name="fin"
                      defaultValue={actif ? (reglage.fin ?? "") : ""}
                      className="mt-1 block rounded-xl border border-pink-200 px-3 py-1.5 text-sm"
                    />
                  </label>
                  <button
                    type="submit"
                    className="rounded-full bg-pink-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-pink-600"
                  >
                    {actif ? "Mettre à jour les dates" : "Activer ce thème"}
                  </button>
                </form>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
