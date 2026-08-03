import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SEGMENTS } from "@/lib/segments";
import { corpsHtml, destinataires } from "@/lib/campagne";
import { supprimerCampagne } from "@/actions/campagnes";
import EnvoiCampagneBouton from "@/components/EnvoiCampagneBouton";
import TestCampagneForm from "@/components/TestCampagneForm";

export const dynamic = "force-dynamic";

export default async function DetailCampagne({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campagne = await prisma.campagne.findUnique({
    where: { id },
    include: {
      envois: {
        include: { cliente: { select: { prenom: true, nom: true, email: true } } },
        orderBy: { envoyeLe: "asc" },
      },
    },
  });
  if (!campagne) notFound();

  const cibles = await destinataires(campagne.segment);
  const dejaTraites = new Set(campagne.envois.map((e) => e.clienteId));
  const restants = cibles.filter((c) => !dejaTraites.has(c.id));
  const echecs = campagne.envois.filter((e) => !e.ok);
  const reussis = campagne.envois.length - echecs.length;
  const segment = SEGMENTS.find((s) => s.id === campagne.segment);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/campagnes" className="text-sm text-pink-600 hover:underline">
          ← Toutes les campagnes
        </Link>
        <h1 className="font-display mt-2 text-2xl font-bold">{campagne.objet}</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Destinataires : {segment?.libelle ?? campagne.segment} ·{" "}
          {campagne.statut === "ENVOYEE"
            ? `${reussis} envoi(s) réussi(s)`
            : `${restants.length} cliente(s) à contacter`}
        </p>
      </div>

      <section className="rounded-2xl border border-pink-100 bg-white p-6">
        <h2 className="font-semibold">Aperçu du message</h2>
        <div
          className="prose-sm mt-4 rounded-2xl bg-pink-50/60 p-5"
          dangerouslySetInnerHTML={{ __html: corpsHtml(campagne.contenu, null) }}
        />
        <p className="mt-3 text-xs text-foreground/60">
          Aperçu avec un prénom d&rsquo;exemple ; chaque cliente reçoit le sien.
        </p>
      </section>

      {campagne.statut !== "ENVOYEE" && (
        <section className="space-y-5 rounded-2xl border border-pink-100 bg-white p-6">
          <div>
            <h2 className="font-semibold">1. Vérifier</h2>
            <p className="mt-1 text-xs text-foreground/60">
              Envoyez-vous le message pour contrôler le rendu avant la diffusion.
            </p>
            <div className="mt-3">
              <TestCampagneForm campagneId={campagne.id} defaut={process.env.NOTIFY_EMAIL ?? ""} />
            </div>
          </div>
          <div className="border-t border-pink-50 pt-5">
            <h2 className="font-semibold">2. Diffuser</h2>
            <div className="mt-3">
              <EnvoiCampagneBouton campagneId={campagne.id} nombreDestinataires={restants.length} />
            </div>
          </div>
        </section>
      )}

      {campagne.envois.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-bold">
            Envois ({reussis} réussi{reussis > 1 ? "s" : ""}
            {echecs.length > 0 && `, ${echecs.length} en échec`})
          </h2>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-pink-100 bg-white">
            <table className="w-full min-w-[520px] text-sm">
              <tbody>
                {campagne.envois.map((envoi) => (
                  <tr key={envoi.id} className="border-b border-pink-50 last:border-0">
                    <td className="px-5 py-2.5">
                      {envoi.cliente.prenom} {envoi.cliente.nom}
                    </td>
                    <td className="px-5 py-2.5 text-foreground/70">{envoi.cliente.email}</td>
                    <td className="px-5 py-2.5">
                      {envoi.ok ? (
                        <span className="text-emerald-700">✓ envoyé</span>
                      ) : (
                        <span className="text-red-700" title={envoi.erreur ?? ""}>
                          ✕ échec
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {echecs.length > 0 && (
            <p className="mt-2 break-words text-xs text-foreground/60">
              Motif du premier échec : {echecs[0].erreur}
            </p>
          )}
        </section>
      )}

      {campagne.statut === "BROUILLON" && (
        <form action={supprimerCampagne.bind(null, campagne.id)}>
          <button
            type="submit"
            className="rounded-full border border-pink-200 px-5 py-2 text-sm text-pink-600 transition hover:bg-pink-50"
          >
            Supprimer ce brouillon
          </button>
        </form>
      )}
    </div>
  );
}
