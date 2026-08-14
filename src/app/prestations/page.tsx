import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { reglagesRappels } from "@/lib/parametres";
import { formatPrix } from "@/lib/format";
import { niveauxNailArt, techniques } from "@/lib/explications";
import { niveauxExpliques } from "@/lib/nail-art";
import NiveauxNailArt from "@/components/NiveauxNailArt";
import Vagues, { TraitVagues } from "@/components/Vagues";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Les prestations expliquées · Zelart Nails",
  description:
    "Gainage, pose Gel X, Pop-it, vernis semi-permanent : ce que chaque prestation veut dire, ce qu'elle coûte, combien de temps elle tient, et laquelle choisir. Zelart Nails, Saint-Nazaire.",
};

export default async function Prestations() {
  const [catalogue, { delais }] = await Promise.all([
    prisma.prestation.findMany({ where: { active: true }, orderBy: { prixCents: "asc" } }),
    reglagesRappels(),
  ]);

  // Le tableau des tarifs ne montre que ce qui se choisit : avec ou sans nail
  // art. Les trois niveaux restent expliqués et chiffrés dans la fenêtre de
  // comparaison. Les retirer de la vue laisserait un « à partir de » sans
  // plafond visible, ce qui se lit comme une réserve plutôt que comme un tarif.
  const listeTechniques = techniques(
    catalogue.filter((p) => p.choixCliente),
    delais
  );
  // Le supplément de chaque niveau se mesure en revanche sur le catalogue
  // complet, puisque c'est là que vivent les niveaux.
  const niveaux = niveauxNailArt(catalogue);
  const niveauxIllustres = await niveauxExpliques(niveaux);
  const supplementIdentique = (n: { supplementMinCents: number; supplementMaxCents: number }) =>
    n.supplementMinCents === n.supplementMaxCents;

  return (
    <>
      <section className="relative isolate overflow-hidden">
        <Vagues variante="bandeau" />
        <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">
            Les prestations expliquées 💅
          </h1>
          <TraitVagues className="mx-auto mt-4" />
          <p className="mt-4 text-foreground/75">
            Gainage, Gel X, Pop-it, semi-permanent… Si ces mots ne vous disent rien, cette page est
            faite pour vous. Aucune connaissance requise : de quoi choisir en confiance, et savoir
            à quoi vous attendre avant de venir.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-14 px-4 pb-16 sm:px-6">
        {/* ── Les techniques, une carte chacune ─────────────────────────── */}
        <section>
          <h2 className="font-display text-2xl font-bold">Les quatre techniques</h2>
          <p className="mt-2 text-sm text-foreground/70">
            Elles se distinguent par ce qu&rsquo;on pose sur l&rsquo;ongle, et par la longueur
            qu&rsquo;elles permettent d&rsquo;ajouter, ou non.
          </p>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {listeTechniques.map((technique) => (
              <article
                key={technique.categorie}
                className="flex flex-col rounded-3xl border border-pink-100 bg-white p-6 shadow-sm"
              >
                <h3 className="font-display text-xl font-bold text-pink-500">
                  {technique.categorie}
                </h3>
                {technique.description && (
                  <p className="mt-2 leading-relaxed text-foreground/80">{technique.description}</p>
                )}

                <dl className="mt-4 space-y-2 border-t border-pink-100 pt-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-foreground/60">À partir de</dt>
                    <dd className="font-semibold text-pink-600">
                      {formatPrix(technique.aPartirDeCents)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-foreground/60">Prochain rendez-vous</dt>
                    <dd className="font-medium">vers {technique.retourJours} jours</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-foreground/60">Remplissage</dt>
                    <dd className="text-right font-medium">
                      {technique.remplissage ? (
                        <>
                          oui, {formatPrix(technique.remplissage.prixCents, technique.remplissage.aPartirDe)}
                          <span className="block text-xs font-normal text-foreground/50">
                            si la pose a été faite ici
                          </span>
                        </>
                      ) : (
                        <>
                          non
                          <span className="block text-xs font-normal text-foreground/50">
                            {technique.typePose === "GEL_X"
                              ? "les capsules se retirent"
                              : "on repart d’un ongle nu"}
                          </span>
                        </>
                      )}
                    </dd>
                  </div>
                  {technique.depose && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-foreground/60">Dépose seule</dt>
                      <dd className="font-medium">
                        {formatPrix(technique.depose.prixCents, technique.depose.aPartirDe)}
                      </dd>
                    </div>
                  )}
                </dl>
              </article>
            ))}
          </div>
        </section>

        {/* ── Le vocabulaire, source des malentendus les plus fréquents ─── */}
        <section>
          <h2 className="font-display text-2xl font-bold">Trois mots à connaître</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-pink-100 bg-white p-5">
              <p className="font-display text-lg font-bold text-pink-500">La pose</p>
              <p className="mt-2 text-sm leading-relaxed text-foreground/80">
                On part d&rsquo;un ongle nu et on construit : c&rsquo;est le rendez-vous complet.
                C&rsquo;est ce qu&rsquo;il vous faut pour une première fois, ou après une dépose.
              </p>
            </div>
            <div className="rounded-2xl border border-pink-100 bg-white p-5">
              <p className="font-display text-lg font-bold text-pink-500">Le remplissage</p>
              <p className="mt-2 text-sm leading-relaxed text-foreground/80">
                On comble la repousse sans tout retirer. Réservé au gainage et au Pop-it,{" "}
                <strong>que j&rsquo;ai posés moi-même</strong>.
              </p>
            </div>
            <div className="rounded-2xl border border-pink-100 bg-white p-5">
              <p className="font-display text-lg font-bold text-pink-500">La dépose</p>
              <p className="mt-2 text-sm leading-relaxed text-foreground/80">
                On retire proprement ce que vous portez. Elle se réserve seule si vous souhaitez
                revenir aux ongles nus, ou s&rsquo;ajoute avant une nouvelle pose.
              </p>
            </div>
          </div>
        </section>

        {/* ── La règle qui surprend le plus au moment de réserver ───────── */}
        <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
          <h2 className="font-display text-2xl font-bold text-amber-900">
            Vous portez déjà une pose ?
          </h2>
          <p className="mt-3 leading-relaxed text-amber-900/90">
            Une pose ne se recouvre jamais : elle est <strong>soit remplie, soit retirée</strong>.
            Au moment de réserver, on vous demande donc d&rsquo;abord ce que vous portez, et la
            dépose est ajoutée automatiquement à votre demande quand elle s&rsquo;impose. Inutile
            d&rsquo;y penser, et aucune surprise sur le tarif le jour même.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-amber-900/90">
            <li>
              <strong>Pose faite ailleurs :</strong> elle est retirée avant la nouvelle. Je ne
              reprends pas le travail d&rsquo;une autre prothésiste : c&rsquo;est la seule façon de
              garantir ce que je pose.
            </li>
            <li>
              <strong>Capsules Gel X :</strong> elles se retirent, elles ne se remplissent pas.
            </li>
            <li>
              <strong>Vernis semi-permanent :</strong> retiré avant la pose suivante.
            </li>
            <li>
              <strong>Gainage ou Pop-it posé ici :</strong> au choix, un remplissage ou une
              nouvelle pose.
            </li>
          </ul>
        </section>

        {/* ── Les niveaux de nail art, mesurés et non inventés ──────────── */}
        {niveaux.length > 0 && (
          <section>
            <h2 className="font-display text-2xl font-bold">Les niveaux de nail art</h2>
            <p className="mt-2 leading-relaxed text-foreground/75">
              Le niveau dépend de la <strong>complexité du design</strong>, pas du nombre
              d&rsquo;ongles décorés. <strong>Vous n&rsquo;avez pas à le choisir</strong> : à la
              réservation, vous cochez « avec nail art » et vous décrivez ce que vous voulez, en
              joignant une photo si vous en avez une. C&rsquo;est moi qui détermine le niveau à
              partir de là, et je vous confirme le tarif avant le rendez-vous.
            </p>
            <p className="mt-2 leading-relaxed text-foreground/75">
              Pourquoi ainsi : un niveau se juge à l&rsquo;œil et à l&rsquo;expérience, pas sur un
              menu déroulant. Vous demander de deviner, c&rsquo;était vous exposer à découvrir un
              écart de tarif au moment de la pose. Autant que la question soit réglée avant.
            </p>
            <div className="mt-3">
              <NiveauxNailArt
                niveaux={niveauxIllustres}
                libelle="Voir les trois niveaux en photo"
                className="inline-flex items-center gap-1.5 rounded-full border border-pink-300 px-5 py-2 text-sm font-medium text-pink-600 transition hover:bg-pink-50"
              />
            </div>
            <p className="mt-4 text-sm text-foreground/60">
              Voici ce que chaque niveau ajoute à une prestation sans décor :
            </p>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-100 border-collapse text-sm">
                <thead>
                  <tr className="border-b border-pink-200 text-left">
                    <th className="py-2 pr-4 font-semibold">Niveau</th>
                    <th className="py-2 font-semibold">Supplément</th>
                  </tr>
                </thead>
                <tbody>
                  {niveaux.map((n) => (
                    <tr key={n.niveau} className="border-b border-pink-100 last:border-0">
                      <td className="py-3 pr-4 font-medium">Niveau {n.niveau}</td>
                      <td className="py-3 text-pink-600">
                        {supplementIdentique(n)
                          ? `+ ${formatPrix(n.supplementMinCents)}`
                          : `de + ${formatPrix(n.supplementMinCents)} à + ${formatPrix(n.supplementMaxCents)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── Sortie vers l'action ──────────────────────────────────────── */}
        <section className="rounded-3xl border border-pink-100 bg-white p-8 text-center">
          <h2 className="font-display text-2xl font-bold">Prête à choisir ?</h2>
          <p className="mx-auto mt-3 max-w-xl text-foreground/75">
            La réservation vous guide pas à pas : vous indiquez l&rsquo;état de vos ongles, et seules
            les prestations qui vous conviennent vous sont proposées.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/reserver"
              className="rounded-full bg-pink-500 px-8 py-3 font-medium text-white shadow-sm transition hover:bg-pink-600"
            >
              Prendre rendez-vous
            </Link>
            <Link
              href="/#prestations"
              className="rounded-full border border-pink-200 px-8 py-3 font-medium text-pink-600 transition hover:bg-pink-50"
            >
              Voir tous les tarifs
            </Link>
          </div>
          <p className="mt-5 text-sm text-foreground/60">
            Une question avant de réserver ? Je réponds par SMS au{" "}
            <a href="sms:0645292001" className="font-medium text-pink-600 hover:underline">
              06 45 29 20 01
            </a>{" "}
            (je ne prends pas les appels).
          </p>
        </section>
      </div>
    </>
  );
}
