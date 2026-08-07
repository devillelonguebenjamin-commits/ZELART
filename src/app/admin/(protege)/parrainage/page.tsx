import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatJour } from "@/lib/creneaux";
import { marquerAvantageUtilise } from "@/actions/avantages";
import {
  classementSquad,
  LIBELLE_AVANTAGE,
  PALIERS,
  REMISE_FILLEULE_POURCENT,
} from "@/lib/parrainage";

export const dynamic = "force-dynamic";

export default async function Parrainage() {
  const [aHonorer, honores, squad] = await Promise.all([
    prisma.avantageParrainage.findMany({
      where: { utiliseLe: null },
      include: { cliente: { select: { id: true, prenom: true, nom: true, bloqueeLe: true } } },
      orderBy: { gagneLe: "desc" },
    }),
    prisma.avantageParrainage.findMany({
      where: { utiliseLe: { not: null } },
      include: { cliente: { select: { id: true, prenom: true, nom: true } } },
      orderBy: { utiliseLe: "desc" },
      take: 10,
    }),
    classementSquad(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Parrainage 💕</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Une filleule ne compte que le jour où elle est <strong>réellement venue</strong>{" "}
          — c&rsquo;est votre validation de venue dans l&rsquo;agenda qui fait monter sa marraine
          d&rsquo;un palier. Vous recevez un e-mail à chaque palier atteint, et l&rsquo;avantage
          apparaît ci-dessous jusqu&rsquo;à ce que vous le marquiez comme honoré.
        </p>
      </div>

      {/* À honorer : la seule section qui demande une action */}
      <section>
        <h2 className="font-display text-xl font-bold">
          Avantages à honorer{" "}
          {aHonorer.length > 0 && (
            <span className="ml-1 align-middle rounded-full bg-pink-100 px-3 py-1 text-sm font-semibold text-pink-700">
              {aHonorer.length}
            </span>
          )}
        </h2>
        <div className="mt-4 grid gap-3">
          {aHonorer.length === 0 ? (
            <p className="rounded-2xl bg-pink-50 px-5 py-4 text-sm text-foreground/70">
              Rien en attente : tous les avantages gagnés ont été honorés 🤍
            </p>
          ) : (
            aHonorer.map((avantage) => (
              <div
                key={avantage.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-pink-100 bg-white px-5 py-4"
              >
                <div>
                  <p className="font-medium">
                    <Link
                      href={`/admin/clientes/${avantage.cliente.id}`}
                      className="text-pink-600 hover:underline"
                    >
                      {avantage.cliente.prenom} {avantage.cliente.nom}
                    </Link>
                    {avantage.cliente.bloqueeLe && (
                      <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                        bloquée
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-sm text-foreground/75">
                    🎁 {LIBELLE_AVANTAGE[avantage.type]}
                    {avantage.periode && (
                      <span className="text-foreground/50"> · {avantage.periode}</span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-foreground/50">
                    Gagné le {formatJour(avantage.gagneLe)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <code className="rounded bg-pink-50 px-2 py-1 text-xs text-pink-700">
                    {avantage.code}
                  </code>
                  <form action={marquerAvantageUtilise.bind(null, avantage.id, true)}>
                    <button
                      type="submit"
                      className="rounded-full bg-pink-500 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-pink-600"
                    >
                      Honoré
                    </button>
                  </form>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Classement : qui amène du monde, et qui approche d'un palier */}
      <section>
        <h2 className="font-display text-xl font-bold">La squad</h2>
        <div className="mt-4 grid gap-3">
          {squad.length === 0 ? (
            <p className="rounded-2xl bg-pink-50 px-5 py-4 text-sm text-foreground/70">
              Personne n&rsquo;a encore parrainé. Les codes sont dans l&rsquo;espace de chaque
              cliente, à elles de les partager.
            </p>
          ) : (
            squad.map((marraine) => (
              <div
                key={marraine.id}
                className="rounded-2xl border border-pink-100 bg-white px-5 py-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">
                    <Link
                      href={`/admin/clientes/${marraine.id}`}
                      className="text-pink-600 hover:underline"
                    >
                      {marraine.prenom} {marraine.nom}
                    </Link>{" "}
                    <code className="ml-1 rounded bg-pink-50 px-2 py-0.5 text-xs text-pink-700">
                      {marraine.codeParrainage}
                    </code>
                  </p>
                  <span className="rounded-full bg-pink-100 px-3 py-1 text-xs font-semibold text-pink-700">
                    {marraine.statut.palier.emoji} {marraine.statut.palier.nom}
                  </span>
                </div>
                <p className="mt-1 text-sm text-foreground/75">
                  {marraine.statut.filleulesVenues} filleule
                  {marraine.statut.filleulesVenues > 1 ? "s" : ""} venue
                  {marraine.statut.filleulesVenues > 1 ? "s" : ""}
                  {/* Inscrite sans être venue : le code a servi, la pose non — ça
                      explique un palier qui semble en retard. */}
                  {marraine.filleulesInscrites > marraine.statut.filleulesVenues && (
                    <span className="text-foreground/50">
                      {" "}
                      · {marraine.filleulesInscrites - marraine.statut.filleulesVenues} inscrite
                      {marraine.filleulesInscrites - marraine.statut.filleulesVenues > 1
                        ? "s"
                        : ""}{" "}
                      pas encore venue
                      {marraine.filleulesInscrites - marraine.statut.filleulesVenues > 1
                        ? "s"
                        : ""}
                    </span>
                  )}
                </p>
                {marraine.statut.ambassadriceEnSommeil && (
                  <p className="mt-1 text-xs text-amber-700">
                    ⚠ Statut Ambassadrice en sommeil — aucune filleule venue depuis plus
                    d&rsquo;un an.
                  </p>
                )}
                {marraine.statut.suivant && (
                  <p className="mt-1 text-xs text-foreground/60">
                    Encore {marraine.statut.restantes} pour {marraine.statut.suivant.emoji}{" "}
                    {marraine.statut.suivant.nom} — {marraine.statut.suivant.avantage}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* Historique court : de quoi retrouver un code présenté deux fois */}
      {honores.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-bold">Derniers avantages honorés</h2>
          <ul className="mt-4 divide-y divide-pink-100 rounded-2xl border border-pink-100 bg-white px-5">
            {honores.map((avantage) => (
              <li key={avantage.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                <span>
                  <Link
                    href={`/admin/clientes/${avantage.cliente.id}`}
                    className="font-medium text-pink-600 hover:underline"
                  >
                    {avantage.cliente.prenom} {avantage.cliente.nom}
                  </Link>{" "}
                  — {LIBELLE_AVANTAGE[avantage.type]}
                </span>
                <span className="text-foreground/50">
                  {avantage.utiliseLe && formatJour(avantage.utiliseLe)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Rappel des règles : Zélia n'a pas à rouvrir la stratégie pour répondre */}
      <section className="rounded-2xl border border-pink-100 bg-white p-5">
        <h2 className="font-semibold">Les paliers</h2>
        <p className="mt-1 text-xs text-foreground/60">
          La filleule, elle, bénéficie de −{REMISE_FILLEULE_POURCENT}
          {" % "}sur sa première prestation, déduits à l&rsquo;encaissement.
        </p>
        <ul className="mt-3 space-y-1 text-sm">
          {PALIERS.filter((palier) => palier.seuil > 0).map((palier) => (
            <li key={palier.cle}>
              <span className="font-medium">
                {palier.emoji} {palier.nom}
              </span>{" "}
              <span className="text-foreground/50">
                — {palier.seuil} filleule{palier.seuil > 1 ? "s" : ""} :
              </span>{" "}
              {palier.avantage}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-foreground/60">
          Le statut Ambassadrice se maintient avec au moins une filleule venue par an ; sans
          cela il redescend à Icône jusqu&rsquo;à réactivation. Les paliers inférieurs restent
          acquis.
        </p>
      </section>
    </div>
  );
}
