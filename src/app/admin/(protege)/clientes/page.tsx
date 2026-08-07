import Link from "next/link";
import { listerClientes } from "@/lib/clientes";
import { formatJour } from "@/lib/creneaux";
import { formatPrix } from "@/lib/format";
import FormulaireNouvelleCliente from "@/components/FormulaireNouvelleCliente";
import CelluleCommentaire from "@/components/CelluleCommentaire";
import BoutonSupprimerCliente from "@/components/BoutonSupprimerCliente";

export const dynamic = "force-dynamic";

export default async function Clientes({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const clientes = await listerClientes(q);

  const consentantes = clientes.filter((c) => c.consentementMarketing && !c.desabonneLe).length;
  const chiffreAffaires = clientes.reduce((somme, c) => somme + c.totalCents, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Clientes</h1>
          <p className="mt-1 text-sm text-foreground/60">
            {clientes.length} fiche{clientes.length > 1 ? "s" : ""}
            {q ? " correspondant à votre recherche" : ""} · {consentantes} accepte
            {consentantes > 1 ? "nt" : ""} les offres · {formatPrix(chiffreAffaires)} de prestations
            honorées
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/api/clientes/export"
            className="rounded-full border border-pink-300 px-5 py-2 text-sm font-medium text-pink-600 transition hover:bg-pink-50"
          >
            ↓ Exporter en CSV
          </a>
          <FormulaireNouvelleCliente />
        </div>
      </div>

      <form className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Rechercher un nom, un e-mail, un téléphone…"
          className="flex-1 rounded-xl border border-pink-200 px-4 py-2 text-sm outline-none focus:border-pink-500"
        />
        <button
          type="submit"
          className="rounded-full border border-pink-200 px-5 py-2 text-sm text-pink-600 transition hover:bg-pink-50"
        >
          Rechercher
        </button>
        {q && (
          <Link
            href="/admin/clientes"
            className="rounded-full px-4 py-2 text-sm text-foreground/60 hover:text-pink-600"
          >
            Effacer
          </Link>
        )}
      </form>

      <div className="overflow-x-auto rounded-2xl border border-pink-100 bg-white">
        <table className="w-full min-w-[1020px] text-sm">
          <thead>
            <tr className="border-b border-pink-100 text-left text-foreground/60">
              <th className="px-5 py-3 font-medium">Cliente</th>
              <th className="px-5 py-3 font-medium">Contact</th>
              <th className="px-5 py-3 font-medium text-right">Poses</th>
              <th className="px-5 py-3 font-medium text-right">Total</th>
              <th className="px-5 py-3 font-medium">Dernière venue</th>
              <th className="px-5 py-3 font-medium">Offres</th>
              <th className="px-5 py-3 font-medium">Commentaire</th>
              <th className="px-5 py-3 font-medium"><span className="sr-only">Supprimer</span></th>
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
                  <span className="block text-xs text-foreground/50">
                    cliente depuis le {formatJour(cliente.creeLe)}
                  </span>
                </td>
                <td className="px-5 py-3 text-foreground/75">
                  <a href={`tel:${cliente.telephone}`} className="hover:underline">
                    {cliente.telephone}
                  </a>
                  <br />
                  <a href={`mailto:${cliente.email}`} className="hover:underline">
                    {cliente.email}
                  </a>
                </td>
                <td className="px-5 py-3 text-right tabular-nums">{cliente.nbHonores}</td>
                <td className="px-5 py-3 text-right tabular-nums">
                  {formatPrix(cliente.totalCents)}
                </td>
                <td className="px-5 py-3 capitalize text-foreground/75">
                  {cliente.dernierRdv ? formatJour(cliente.dernierRdv) : "—"}
                </td>
                <td className="px-5 py-3">
                  {cliente.desabonneLe ? (
                    <span className="rounded-full bg-stone-200 px-2.5 py-0.5 text-xs text-stone-600">
                      désinscrite
                    </span>
                  ) : cliente.consentementMarketing ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                      oui
                    </span>
                  ) : (
                    <span className="text-xs text-foreground/50">non</span>
                  )}
                </td>
                <td className="px-5 py-2 align-top">
                  <CelluleCommentaire clienteId={cliente.id} valeur={cliente.notes ?? ""} />
                </td>
                <td className="px-3 py-2 text-right align-top">
                  <BoutonSupprimerCliente
                    clienteId={cliente.id}
                    nom={`${cliente.prenom} ${cliente.nom}`}
                    nbRendezVous={cliente.nbRendezVous}
                  />
                </td>
              </tr>
            ))}
            {clientes.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-6 text-center text-foreground/60">
                  {q ? "Aucune cliente ne correspond à cette recherche." : "Aucune cliente pour l’instant."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
