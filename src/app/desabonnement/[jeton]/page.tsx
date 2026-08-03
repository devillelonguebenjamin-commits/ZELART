import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { desabonner } from "@/actions/campagnes";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Désinscription — Zelart Nails",
  robots: { index: false },
};

export default async function Desabonnement({
  params,
}: {
  params: Promise<{ jeton: string }>;
}) {
  const { jeton } = await params;
  const cliente = await prisma.cliente.findUnique({
    where: { jetonDesabonnement: jeton },
    select: { prenom: true, email: true, desabonneLe: true, consentementMarketing: true },
  });
  if (!cliente) notFound();

  const desinscrite = Boolean(cliente.desabonneLe) || !cliente.consentementMarketing;

  return (
    <div className="mx-auto max-w-lg px-4 py-20 sm:px-6">
      <div className="rounded-3xl border border-pink-100 bg-white p-8 text-center shadow-sm">
        {desinscrite ? (
          <>
            <p className="text-4xl">🤍</p>
            <h1 className="font-display mt-4 text-2xl font-bold">C&rsquo;est fait</h1>
            <p className="mt-3 text-sm text-foreground/70">
              L&rsquo;adresse {cliente.email} ne recevra plus d&rsquo;offres ni d&rsquo;actualités.
              Vous continuerez bien sûr à recevoir les confirmations de vos rendez-vous.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl font-bold">Ne plus recevoir d&rsquo;offres</h1>
            <p className="mt-3 text-sm text-foreground/70">
              Bonjour {cliente.prenom}, confirmez-vous vouloir vous désinscrire des offres et
              actualités envoyées à {cliente.email} ? Les confirmations de rendez-vous continueront
              de vous parvenir.
            </p>
            <form action={desabonner.bind(null, jeton)} className="mt-6">
              <button
                type="submit"
                className="rounded-full bg-pink-500 px-8 py-3 font-medium text-white transition hover:bg-pink-600"
              >
                Confirmer ma désinscription
              </button>
            </form>
          </>
        )}
        <Link href="/" className="mt-8 inline-block text-sm text-pink-600 hover:underline">
          Retour à l&rsquo;accueil
        </Link>
      </div>
    </div>
  );
}
