import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatPrix } from "@/lib/format";
import { LIBELLE_REMISE } from "@/lib/press-on";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Commande envoyée — Zelart Nails",
  robots: { index: false },
};

export default async function ConfirmationPressOn({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const commande = await prisma.commandePressOn.findUnique({
    where: { id },
    include: { cliente: true, modele: true },
  });
  if (!commande) notFound();

  const postal = commande.modeRemise === "POSTAL";

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <div className="rounded-3xl border border-pink-100 bg-white p-8 text-center shadow-sm sm:p-10">
        <p className="text-5xl">💅</p>
        <h1 className="font-display mt-4 text-3xl font-bold">Commande envoyée !</h1>
        <p className="mt-3 text-foreground/70">
          Merci {commande.cliente.prenom}, votre demande de press-on est bien arrivée.
        </p>

        <div className="mt-8 rounded-2xl bg-pink-50 p-6 text-left">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-foreground/60">Set</dt>
              <dd className="text-right font-medium">{commande.modele.nom}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-foreground/60">Remise</dt>
              <dd className="text-right font-medium">{LIBELLE_REMISE[commande.modeRemise]}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-pink-200 pt-3">
              <dt className="font-semibold">{postal ? "Set (hors envoi)" : "Total"}</dt>
              <dd className="text-right text-base font-bold text-pink-600">
                {formatPrix(commande.prixCents, commande.aPartirDe)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-8 space-y-3 text-left text-sm leading-relaxed text-foreground/75">
          <p>
            ✉️ Zélia revient vers vous pour valider le design{" "}
            {postal && (
              <>
                et vous communiquer les <strong>frais d&rsquo;envoi</strong>
              </>
            )}
            , puis vous envoie le lien de paiement.
          </p>
          <p>
            💳 Les press-on étant réalisés sur-mesure, le{" "}
            <strong>règlement précède la fabrication</strong>.
            {!postal && " En main propre, vous pouvez aussi régler au moment de la remise."}
          </p>
          <p>
            🤍 Vous suivez l&rsquo;avancement de votre set depuis votre espace, avec le lien de
            connexion envoyé par e-mail.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            href="/mon-espace"
            className="rounded-full bg-pink-500 px-8 py-3 font-medium text-white shadow-sm transition hover:bg-pink-600"
          >
            Mon espace
          </Link>
          <Link
            href="/"
            className="rounded-full border border-pink-300 px-8 py-3 font-medium text-pink-500 transition hover:bg-pink-50"
          >
            Retour à l&rsquo;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
