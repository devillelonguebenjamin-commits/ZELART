import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrix } from "@/lib/format";
import { formatJour } from "@/lib/creneaux";
import {
  COULEUR_STATUT,
  enCours,
  grouperParCollection,
  LIBELLE_REMISE,
  LIBELLE_STATUT,
  totalCommande,
} from "@/lib/press-on";
import { modifierModelePressOn, supprimerModelePressOn } from "@/actions/admin-press-on";
import FormulaireNouveauModelePressOn from "@/components/FormulaireNouveauModelePressOn";

export const dynamic = "force-dynamic";

export default async function AdminPressOn() {
  const [commandes, modeles] = await Promise.all([
    prisma.commandePressOn.findMany({
      orderBy: { creeLe: "desc" },
      include: { cliente: true, modele: true },
    }),
    prisma.modelePressOn.findMany({
      orderBy: { ordre: "asc" },
      include: { _count: { select: { commandes: true } } },
    }),
  ]);

  const aTraiter = commandes.filter((c) => enCours(c.statut));
  const archivees = commandes.filter((c) => !enCours(c.statut));
  const collections = [...new Set(modeles.map((m) => m.collection))];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-2xl font-bold">Press-on nails</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Les commandes reçues depuis le site, et le catalogue affiché sur la page publique.
        </p>
      </div>

      {/* Commandes en cours */}
      <section>
        <h2 className="font-display text-xl font-bold">
          À traiter{aTraiter.length > 0 && ` (${aTraiter.length})`}
        </h2>

        {aTraiter.length === 0 ? (
          <p className="mt-3 rounded-2xl bg-pink-50 px-5 py-4 text-sm text-foreground/70">
            Aucune commande en cours.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {aTraiter.map((commande) => {
              const total = totalCommande(commande);
              return (
                <li key={commande.id}>
                  <Link
                    href={`/admin/press-on/${commande.id}`}
                    className="block rounded-2xl border border-pink-100 bg-white p-4 transition hover:border-pink-300"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <span className="font-medium">
                        {commande.cliente.prenom} {commande.cliente.nom}
                        <span className="ml-2 font-normal text-foreground/60">
                          — {commande.modele.nom}
                        </span>
                      </span>
                      <span className="font-semibold text-pink-500">
                        {formatPrix(total.prixCents, total.aPartirDe)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-foreground/60">
                      <span
                        className={`rounded-full px-3 py-1 font-semibold ${COULEUR_STATUT[commande.statut]}`}
                      >
                        {LIBELLE_STATUT[commande.statut]}
                      </span>
                      <span>{LIBELLE_REMISE[commande.modeRemise]}</span>
                      <span>· reçue le {formatJour(commande.creeLe)}</span>
                      {commande.modeRemise === "POSTAL" && commande.fraisPortCents === null && (
                        <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800">
                          Frais d&rsquo;envoi à chiffrer
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Historique */}
      {archivees.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-bold">Terminées</h2>
          <ul className="mt-4 space-y-2">
            {archivees.map((commande) => (
              <li key={commande.id}>
                <Link
                  href={`/admin/press-on/${commande.id}`}
                  className="flex flex-wrap items-baseline justify-between gap-3 rounded-2xl border border-pink-50 bg-white px-4 py-3 text-sm transition hover:border-pink-200"
                >
                  <span>
                    {commande.cliente.prenom} {commande.cliente.nom}
                    <span className="ml-2 text-foreground/60">— {commande.modele.nom}</span>
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${COULEUR_STATUT[commande.statut]}`}
                  >
                    {LIBELLE_STATUT[commande.statut]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Catalogue */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold">Le catalogue</h2>
            <p className="mt-1 text-sm text-foreground/60">
              Décochez « en vitrine » pour retirer un set du site sans le supprimer.
            </p>
          </div>
          <FormulaireNouveauModelePressOn collections={collections} />
        </div>

        <div className="mt-5 space-y-6">
          {grouperParCollection(modeles).map((collection) => (
            <div key={collection.nom}>
              <h3 className="font-semibold text-pink-500">{collection.nom}</h3>
              <div className="mt-2 space-y-2">
                {collection.modeles.map((modele) => (
                  <form
                    key={modele.id}
                    action={modifierModelePressOn}
                    className="flex flex-wrap items-center gap-3 rounded-2xl border border-pink-100 bg-white px-4 py-3 text-sm"
                  >
                    <input type="hidden" name="id" value={modele.id} />
                    <span className="min-w-40 flex-1 font-medium">
                      {modele.nom}
                      {modele.surMesure && (
                        <span className="ml-2 rounded-full bg-pink-50 px-2 py-0.5 text-xs font-normal text-pink-600">
                          sur-mesure
                        </span>
                      )}
                    </span>
                    <label className="flex items-center gap-2">
                      <input
                        name="prixEuros"
                        type="number"
                        min={0}
                        step="0.01"
                        defaultValue={(modele.prixCents / 100).toFixed(2)}
                        className="w-24 rounded-xl border border-pink-200 px-3 py-1.5 text-right outline-none focus:border-pink-500"
                      />
                      <span className="text-foreground/60">€</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="aPartirDe"
                        defaultChecked={modele.aPartirDe}
                        className="accent-pink-500"
                      />
                      <span className="text-xs">à partir de</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="actif"
                        defaultChecked={modele.actif}
                        className="accent-pink-500"
                      />
                      <span className="text-xs">en vitrine</span>
                    </label>
                    <span className="text-xs text-foreground/50">
                      {modele._count.commandes} commande
                      {modele._count.commandes > 1 ? "s" : ""}
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
                        formAction={supprimerModelePressOn.bind(null, modele.id)}
                        className="rounded-full border border-pink-200 px-4 py-1.5 text-xs text-pink-600 transition hover:bg-pink-50"
                      >
                        {modele._count.commandes > 0 ? "Retirer" : "Supprimer"}
                      </button>
                    </span>
                  </form>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
