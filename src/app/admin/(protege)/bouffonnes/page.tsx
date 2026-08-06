import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatJour } from "@/lib/creneaux";
import { debloquerCliente } from "@/actions/blocage";
import FormulaireBlocage from "@/components/FormulaireBlocage";

export const dynamic = "force-dynamic";

export default async function Bouffonnes() {
  const bloquees = await prisma.cliente.findMany({
    where: { bloqueeLe: { not: null } },
    orderBy: { bloqueeLe: "desc" },
    include: {
      _count: { select: { rendezVous: true } },
      rendezVous: {
        where: { statut: { not: "ANNULE" }, debut: { gt: new Date() } },
        select: { id: true, debut: true },
        orderBy: { debut: "asc" },
      },
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Bouffonnes 🤡</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Les clientes listées ici ne peuvent plus réserver de rendez-vous ni commander de
          press-on, ni avec leur adresse, ni avec leur numéro. Elles ne sont prévenues de rien :
          le site leur demande simplement de vous écrire par SMS.
        </p>
      </div>

      <section className="rounded-2xl border border-pink-100 bg-white p-5">
        <h2 className="font-semibold">Bloquer une cliente</h2>
        <p className="mt-1 text-xs text-foreground/60">
          Reprenez l&rsquo;adresse exacte de sa fiche — retrouvable dans l&rsquo;onglet{" "}
          <Link href="/admin/clientes" className="font-medium text-pink-600 hover:underline">
            Clientes
          </Link>
          .
        </p>
        <div className="mt-4">
          <FormulaireBlocage />
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl font-bold">
          Bloquées{" "}
          {bloquees.length > 0 && (
            <span className="ml-1 rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-800 align-middle">
              {bloquees.length}
            </span>
          )}
        </h2>
        <div className="mt-4 grid gap-3">
          {bloquees.length === 0 ? (
            <p className="rounded-2xl bg-pink-50 px-5 py-4 text-sm text-foreground/70">
              Personne n&rsquo;est bloqué. Tant mieux 🤍
            </p>
          ) : (
            bloquees.map((cliente) => (
              <div
                key={cliente.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-red-100 bg-white px-5 py-4"
              >
                <div className="text-sm">
                  <p className="font-medium">
                    <Link
                      href={`/admin/clientes/${cliente.id}`}
                      className="text-pink-600 hover:underline"
                    >
                      {cliente.prenom} {cliente.nom}
                    </Link>
                  </p>
                  <p className="mt-0.5 text-foreground/70">
                    {cliente.email} · {cliente.telephone}
                  </p>
                  {cliente.motifBlocage && (
                    <p className="mt-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-800">
                      {cliente.motifBlocage}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-foreground/50">
                    Bloquée le {formatJour(cliente.bloqueeLe!)} · {cliente._count.rendezVous}{" "}
                    rendez-vous au total
                  </p>
                  {cliente.rendezVous.length > 0 && (
                    <p className="mt-1 text-xs font-medium text-amber-800">
                      ⚠ {cliente.rendezVous.length} rendez-vous encore à venir (
                      {cliente.rendezVous.map((r) => formatJour(r.debut)).join(", ")}) — à annuler
                      depuis l&rsquo;agenda si besoin.
                    </p>
                  )}
                </div>
                <form action={debloquerCliente.bind(null, cliente.id)}>
                  <button
                    type="submit"
                    className="rounded-full border border-pink-200 px-4 py-1.5 text-xs font-medium text-pink-600 transition hover:bg-pink-50"
                  >
                    Débloquer
                  </button>
                </form>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
