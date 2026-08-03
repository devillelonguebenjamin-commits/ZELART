import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SEGMENTS } from "@/lib/segments";
import { destinataires } from "@/lib/campagne";
import FormulaireCampagne from "@/components/FormulaireCampagne";

export const dynamic = "force-dynamic";

const LIBELLES_STATUT: Record<string, { texte: string; classes: string }> = {
  BROUILLON: { texte: "Brouillon", classes: "bg-stone-200 text-stone-700" },
  EN_COURS: { texte: "Envoi en cours", classes: "bg-amber-100 text-amber-800" },
  ENVOYEE: { texte: "Envoyée", classes: "bg-emerald-100 text-emerald-800" },
};

export default async function Campagnes() {
  const [campagnes, consentantes, total] = await Promise.all([
    prisma.campagne.findMany({
      orderBy: { creeLe: "desc" },
      include: { _count: { select: { envois: true } } },
    }),
    prisma.cliente.count({ where: { consentementMarketing: true, desabonneLe: null } }),
    prisma.cliente.count(),
  ]);

  const segments = await Promise.all(
    SEGMENTS.map(async (s) => ({ ...s, nombre: (await destinataires(s.id)).length }))
  );

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-2xl font-bold">Campagnes e-mail</h1>
        <p className="mt-1 text-sm text-foreground/60">
          {consentantes} cliente{consentantes > 1 ? "s" : ""} sur {total} ont accepté de recevoir vos
          offres. Seules celles-là peuvent être contactées, conformément à la réglementation.
        </p>
      </div>

      <section className="rounded-2xl border border-pink-100 bg-white p-6">
        <h2 className="font-display text-lg font-bold">Nouvelle campagne</h2>
        <div className="mt-4">
          <FormulaireCampagne segments={segments} />
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl font-bold">Historique</h2>
        <div className="mt-3 grid gap-2">
          {campagnes.map((campagne) => {
            const statut = LIBELLES_STATUT[campagne.statut] ?? LIBELLES_STATUT.BROUILLON;
            return (
              <Link
                key={campagne.id}
                href={`/admin/campagnes/${campagne.id}`}
                className="flex flex-wrap items-baseline justify-between gap-3 rounded-2xl border border-pink-100 bg-white px-5 py-4 transition hover:border-pink-300"
              >
                <span>
                  <span className="block font-medium">{campagne.objet}</span>
                  <span className="block text-xs text-foreground/60">
                    {SEGMENTS.find((s) => s.id === campagne.segment)?.libelle ?? campagne.segment}
                    {campagne._count.envois > 0 && ` · ${campagne._count.envois} envoi(s)`}
                  </span>
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statut.classes}`}>
                  {statut.texte}
                </span>
              </Link>
            );
          })}
          {campagnes.length === 0 && (
            <p className="rounded-2xl bg-pink-50 px-5 py-4 text-sm text-foreground/70">
              Aucune campagne pour l&rsquo;instant.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
