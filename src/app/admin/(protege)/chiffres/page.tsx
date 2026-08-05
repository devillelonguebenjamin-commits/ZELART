import { formatPrix } from "@/lib/format";
import { formatMois } from "@/lib/creneaux";
import { MOIS_AFFICHES, tableauDeBord } from "@/lib/chiffres";

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
                {mois.totalCents > 0 ? formatPrix(mois.totalCents) : "—"}
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
    </div>
  );
}
