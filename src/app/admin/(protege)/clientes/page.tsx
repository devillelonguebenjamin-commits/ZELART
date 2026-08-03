import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatJour } from "@/lib/creneaux";

export const dynamic = "force-dynamic";

export default async function Clientes() {
  const clientes = await prisma.cliente.findMany({
    include: {
      rendezVous: { orderBy: { debut: "desc" }, take: 1, select: { debut: true } },
      _count: { select: { rendezVous: true } },
    },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Clientes ({clientes.length})</h1>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-pink-100 bg-white">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-pink-100 text-left text-foreground/60">
              <th className="px-5 py-3 font-medium">Nom</th>
              <th className="px-5 py-3 font-medium">Contact</th>
              <th className="px-5 py-3 font-medium">RDV</th>
              <th className="px-5 py-3 font-medium">Dernier RDV</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((cliente) => (
              <tr key={cliente.id} className="border-b border-pink-50 last:border-0">
                <td className="px-5 py-3">
                  <Link
                    href={`/admin/clientes/${cliente.id}`}
                    className="font-medium text-pink-600 hover:underline"
                  >
                    {cliente.prenom} {cliente.nom}
                  </Link>
                  {cliente.notes && <span title={cliente.notes}> 📝</span>}
                </td>
                <td className="px-5 py-3 text-foreground/75">
                  {cliente.telephone}
                  <br />
                  {cliente.email}
                </td>
                <td className="px-5 py-3">{cliente._count.rendezVous}</td>
                <td className="px-5 py-3 capitalize text-foreground/75">
                  {cliente.rendezVous[0] ? formatJour(cliente.rendezVous[0].debut) : "—"}
                </td>
              </tr>
            ))}
            {clientes.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center text-foreground/60">
                  Aucune cliente pour l&rsquo;instant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
