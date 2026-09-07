import Link from "next/link";
import { formatPrix } from "@/lib/format";
import { formatMois } from "@/lib/creneaux";
import { MOIS_AFFICHES, tableauDeBord } from "@/lib/chiffres";
import { libelleProvenance } from "@/lib/provenance";

export const dynamic = "force-dynamic";

export default async function AdminChiffres() {
  const bord = await tableauDeBord();
  const maximum = Math.max(...bord.mois.map((m) => m.totalCents), 1);
  const meilleure = bord.prestations[0];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Mes chiffres</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Sur les {MOIS_AFFICHES} derniers mois, d&rsquo;après les rendez-vous marqués{" "}
          <strong>terminés</strong> et les commandes de press-on <strong>remises</strong>. Pensez à
          clôturer vos rendez-vous dans l&rsquo;agenda : c&rsquo;est ce qui alimente ces chiffres.
        </p>
      </div>

      {/* En un coup d'œil */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            titre: "Ce mois-ci",
            valeur: formatPrix(bord.moisCourant.totalCents),
            detail: `${bord.moisCourant.poses} pose${bord.moisCourant.poses > 1 ? "s" : ""}${
              bord.moisCourant.pressOn > 0 ? ` · ${bord.moisCourant.pressOn} press-on` : ""
            }`,
          },
          {
            titre: `Sur ${MOIS_AFFICHES} mois`,
            valeur: formatPrix(bord.caTotalCents),
            detail: `${bord.posesHonorees} pose${bord.posesHonorees > 1 ? "s" : ""} honorée${bord.posesHonorees > 1 ? "s" : ""}`,
          },
          {
            titre: "Panier moyen",
            valeur: formatPrix(bord.panierMoyenCents),
            detail: "par rendez-vous, press-on non compris",
          },
          {
            titre: "Remplissage",
            valeur: `${bord.remplissage.part} %`,
            detail: `${bord.remplissage.occupes} créneaux pris sur ${bord.remplissage.ouverts} ouverts (30 j)`,
          },
        ].map((carte) => (
          <div key={carte.titre} className="rounded-2xl border border-pink-100 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-pink-500">
              {carte.titre}
            </p>
            <p className="font-display mt-2 text-2xl font-bold">{carte.valeur}</p>
            <p className="mt-1 text-xs text-foreground/60">{carte.detail}</p>
          </div>
        ))}
      </section>

      {bord.prixIndicatifs && (
        <p className="rounded-2xl bg-amber-50 px-5 py-3 text-sm text-amber-900">
          Certaines prestations sont tarifées « à partir de » : les montants ci-dessus sont donc un{" "}
          <strong>minimum</strong>, hors suppléments convenus sur place.
        </p>
      )}

      {/* Chiffre d'affaires mois par mois */}
      <section>
        <h2 className="font-display text-xl font-bold">Mois par mois</h2>
        <div className="mt-4 space-y-2">
          {bord.mois.map((mois) => (
            <div key={mois.cle} className="flex items-center gap-3 text-sm">
              <span className="w-32 shrink-0 capitalize text-foreground/70">
                {formatMois(mois.cle)}
              </span>
              <span className="h-6 flex-1 overflow-hidden rounded-full bg-pink-50">
                <span
                  className="flex h-full items-center rounded-full bg-pink-400"
                  style={{ width: `${Math.round((mois.totalCents / maximum) * 100)}%` }}
                />
              </span>
              <span className="w-24 shrink-0 text-right font-medium text-pink-600">
                {mois.totalCents > 0 ? formatPrix(mois.totalCents) : "0 €"}
              </span>
              <span className="hidden w-32 shrink-0 text-right text-xs text-foreground/50 sm:block">
                {mois.poses > 0 && `${mois.poses} pose${mois.poses > 1 ? "s" : ""}`}
                {mois.pressOn > 0 && ` · ${mois.pressOn} press-on`}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Prestations les plus demandées */}
      <section>
        <h2 className="font-display text-xl font-bold">Ce qu&rsquo;on vous demande le plus</h2>
        {bord.prestations.length === 0 ? (
          <p className="mt-3 rounded-2xl bg-pink-50 px-5 py-4 text-sm text-foreground/70">
            Aucune pose terminée sur la période.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {bord.prestations.slice(0, 10).map((prestation) => (
              <li
                key={prestation.nom}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-pink-100 bg-white px-5 py-3 text-sm"
              >
                <span className="min-w-40 flex-1 font-medium">{prestation.nom}</span>
                <span className="text-xs text-foreground/50">{prestation.categorie}</span>
                <span className="w-24 text-right">
                  {prestation.fois} fois
                  {meilleure && (
                    <span className="ml-2 inline-block h-1.5 w-10 rounded-full bg-pink-100 align-middle">
                      <span
                        className="block h-full rounded-full bg-pink-400"
                        style={{
                          width: `${Math.round((prestation.fois / meilleure.fois) * 100)}%`,
                        }}
                      />
                    </span>
                  )}
                </span>
                <span className="w-24 text-right font-medium text-pink-600">
                  {formatPrix(prestation.totalCents)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Clientes */}
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-pink-100 bg-white p-5">
          <h2 className="font-semibold">Vos clientes reviennent-elles ?</h2>
          <p className="font-display mt-2 text-2xl font-bold">{bord.clientes.part} %</p>
          <p className="mt-1 text-sm text-foreground/70">
            {bord.clientes.fidelisees} cliente{bord.clientes.fidelisees > 1 ? "s" : ""} sur{" "}
            {bord.clientes.total} ayant déjà eu une pose sont revenues au moins une fois.
          </p>
          <p className="mt-3 text-xs text-foreground/60">
            {bord.clientes.nouvellesCeMois} première
            {bord.clientes.nouvellesCeMois > 1 ? "s" : ""} venue
            {bord.clientes.nouvellesCeMois > 1 ? "s" : ""} ce mois-ci.
          </p>
        </div>

        <div className="rounded-2xl border border-pink-100 bg-white p-5">
          <h2 className="font-semibold">Créneaux perdus</h2>
          <p className="font-display mt-2 text-2xl font-bold">
            {bord.annulations.annules + bord.annulations.absences}
          </p>
          <p className="mt-1 text-sm text-foreground/70">
            {bord.annulations.annules} annulation{bord.annulations.annules > 1 ? "s" : ""} et{" "}
            {bord.annulations.absences} absence{bord.annulations.absences > 1 ? "s" : ""} sur la
            période.
          </p>
          <p className="mt-3 text-xs text-foreground/60">
            L&rsquo;acompte des nouvelles clientes limite les rendez-vous non honorés.
          </p>
        </div>
      </section>

      {/* Durées : le prévu contre le réel */}
      <section>
        <h2 className="font-display text-xl font-bold">Vos durées tiennent-elles ?</h2>
        {bord.durees.mesurees === 0 ? (
          <p className="mt-3 rounded-2xl bg-pink-50 px-5 py-4 text-sm text-foreground/70">
            Aucune heure de sortie notée pour l&rsquo;instant. Elle se saisit au moment de valider
            une venue, avec « à l&rsquo;heure » ou « +15 min » — deux secondes. Ce sont les durées
            du catalogue qui décident des créneaux proposés aux clientes : mesurées, elles cessent
            d&rsquo;être des estimations.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-foreground/60">
              Sur <strong>{bord.durees.mesurees}</strong> visite
              {bord.durees.mesurees > 1 ? "s" : ""} mesurée{bord.durees.mesurees > 1 ? "s" : ""} sur{" "}
              {bord.durees.total}. {bord.durees.debordent} ont dépassé l&rsquo;heure prévue, avec un
              écart médian de{" "}
              <strong className={bord.durees.ecartMedianMin > 0 ? "text-amber-700" : "text-emerald-700"}>
                {bord.durees.ecartMedianMin > 0 ? "+" : ""}
                {bord.durees.ecartMedianMin} min
              </strong>
              .
            </p>
            {bord.durees.parPrestation.length > 0 && (
              <div className="mt-4 overflow-x-auto rounded-2xl border border-pink-100 bg-white">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-pink-100 text-left text-foreground/60">
                      <th className="px-4 py-2.5 font-medium">Prestation</th>
                      <th className="px-4 py-2.5 font-medium">Prévu</th>
                      <th className="px-4 py-2.5 font-medium">Réel</th>
                      <th className="px-4 py-2.5 font-medium">Écart</th>
                      <th className="px-4 py-2.5 font-medium">Mesures</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bord.durees.parPrestation.map((d) => (
                      <tr key={d.nom} className="border-b border-pink-50 last:border-0">
                        <td className="px-4 py-2.5">{d.nom}</td>
                        <td className="px-4 py-2.5 tabular-nums text-foreground/60">
                          {d.prevuMin} min
                        </td>
                        <td className="px-4 py-2.5 tabular-nums">{d.reelMin} min</td>
                        <td
                          className={`px-4 py-2.5 font-medium tabular-nums ${
                            d.ecartMin > 0 ? "text-amber-700" : "text-emerald-700"
                          }`}
                        >
                          {d.ecartMin > 0 ? "+" : ""}
                          {d.ecartMin} min
                        </td>
                        <td className="px-4 py-2.5 tabular-nums text-foreground/50">{d.mesures}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-2 text-xs text-foreground/60">
              Le détail ne porte que sur les visites à <strong>une seule prestation</strong> : sur
              un rendez-vous à trois lignes, un débordement ne dit pas laquelle a débordé. Corrigez
              une durée depuis l&rsquo;écran Prestations dès qu&rsquo;un écart se confirme sur
              plusieurs mesures.
            </p>
          </>
        )}
      </section>

      {/* Délai de réponse et demandes en attente */}
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-pink-100 bg-white p-5">
          <h2 className="font-semibold">Vous répondez en combien de temps ?</h2>
          {bord.reponses.mesurees === 0 ? (
            <p className="mt-2 text-sm text-foreground/70">
              Le délai est mesuré depuis peu : il apparaîtra dès les prochaines demandes reçues par
              le site.
            </p>
          ) : (
            <>
              <p className="font-display mt-2 text-2xl font-bold">
                {bord.reponses.medianeHeures} h
              </p>
              <p className="mt-1 text-sm text-foreground/70">
                en médiane, sur {bord.reponses.mesurees} demande
                {bord.reponses.mesurees > 1 ? "s" : ""}. {bord.reponses.sousDeuxHeures} traitée
                {bord.reponses.sousDeuxHeures > 1 ? "s" : ""} en moins de deux heures.
              </p>
            </>
          )}
          <p className="mt-3 text-xs text-foreground/60">
            Une demande qui attend est une cliente qui peut réserver ailleurs entre-temps.
          </p>
        </div>

        <div
          className={`rounded-2xl border p-5 ${
            bord.reponses.plusVieilleHeures >= 24
              ? "border-amber-300 bg-amber-50"
              : "border-pink-100 bg-white"
          }`}
        >
          <h2 className="font-semibold">Demandes en attente</h2>
          <p className="font-display mt-2 text-2xl font-bold">{bord.reponses.enAttente}</p>
          {bord.reponses.enAttente > 0 ? (
            <p className="mt-1 text-sm text-foreground/70">
              La plus ancienne attend depuis{" "}
              <strong>
                {bord.reponses.plusVieilleHeures} heure
                {bord.reponses.plusVieilleHeures > 1 ? "s" : ""}
              </strong>
              .{" "}
              <Link href="/admin" className="font-medium text-pink-600 hover:underline">
                Les traiter
              </Link>
            </p>
          ) : (
            <p className="mt-1 text-sm text-foreground/70">Rien n&rsquo;attend de réponse. 🤍</p>
          )}
        </div>
      </section>

      {/* Marge et fiabilité */}
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-pink-100 bg-white p-5">
          <h2 className="font-semibold">Ce qu&rsquo;il vous reste</h2>
          {bord.marge.couvertureCents === 0 ? (
            <p className="mt-2 text-sm text-foreground/70">
              Aucun coût matière renseigné. Indiquez-en un par prestation depuis l&rsquo;écran
              Prestations : votre chiffre d&rsquo;affaires deviendra une marge, et le nail art
              élaboré cessera d&rsquo;être compté comme le semi-permanent, qui ne consomme presque
              rien.
            </p>
          ) : (
            <>
              <p className="font-display mt-2 text-2xl font-bold">
                {formatPrix(bord.marge.margeCents)}
              </p>
              <p className="mt-1 text-sm text-foreground/70">
                soit <strong>{bord.marge.part} %</strong>, après{" "}
                {formatPrix(bord.marge.coutCents)} de matière.
              </p>
              <p className="mt-3 text-xs text-foreground/60">
                Calculé sur {formatPrix(bord.marge.couvertureCents)} de prestations dont le coût est
                renseigné, soit{" "}
                {Math.round((bord.marge.couvertureCents / Math.max(bord.fiabilite.totalCents, 1)) * 100)} %
                du total. Le reste n&rsquo;est pas compté ici.
              </p>
            </>
          )}
        </div>

        <div className="rounded-2xl border border-pink-100 bg-white p-5">
          <h2 className="font-semibold">Fiabilité de ces chiffres</h2>
          <p className="font-display mt-2 text-2xl font-bold">{bord.fiabilite.part} %</p>
          <p className="mt-1 text-sm text-foreground/70">
            du chiffre d&rsquo;affaires vient de montants <strong>confirmés à
            l&rsquo;encaissement</strong>. Le reste est repris du catalogue.
          </p>
          <p className="mt-3 text-xs text-foreground/60">
            C&rsquo;est ce pourcentage qui dit combien croire à tout le reste de cette page.
            Confirmez le montant au moment de valider une venue : c&rsquo;est le seul instant où il
            est connu.
          </p>
        </div>
      </section>

      {/* D'où viennent les clientes */}
      <section className="rounded-2xl border border-pink-100 bg-white p-5">
        <h2 className="font-semibold">D&rsquo;où viennent vos clientes</h2>
        {bord.provenances.repondues === 0 ? (
          <p className="mt-2 text-sm text-foreground/70">
            La question « comment m&rsquo;avez-vous connue ? » est posée depuis peu, à la première
            réservation seulement et sans obligation de répondre. Les premières réponses
            apparaîtront ici.
          </p>
        ) : (
          <>
            <ul className="mt-3 space-y-2">
              {bord.provenances.lignes.map((ligne) => (
                <li key={ligne.id} className="text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-foreground/85">{libelleProvenance(ligne.id)}</span>
                    <span className="shrink-0 tabular-nums text-foreground/60">
                      {ligne.nombre} ({ligne.part} %)
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-pink-50">
                    <div
                      className="h-2 rounded-full bg-pink-400"
                      style={{ width: `${Math.max(ligne.part, 2)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-foreground/60">
              Sur {bord.provenances.repondues} cliente
              {bord.provenances.repondues > 1 ? "s" : ""} ayant répondu. La question étant
              facultative, ce sont des proportions, pas un décompte de toutes vos clientes.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
