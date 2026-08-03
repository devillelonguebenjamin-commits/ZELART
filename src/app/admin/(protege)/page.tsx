import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatHeure, formatJour } from "@/lib/creneaux";
import { formatPrix } from "@/lib/format";
import { changerStatutRendezVous } from "@/actions/admin";
import type { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

type RdvComplet = Prisma.RendezVousGetPayload<{
  include: { cliente: true; prestation: true; inspirations: true };
}>;

const BADGES: Record<string, { label: string; classes: string }> = {
  EN_ATTENTE: { label: "En attente", classes: "bg-amber-100 text-amber-800" },
  CONFIRME: { label: "Confirmé", classes: "bg-emerald-100 text-emerald-800" },
  ANNULE: { label: "Annulé", classes: "bg-stone-200 text-stone-600" },
  TERMINE: { label: "Terminé", classes: "bg-sky-100 text-sky-800" },
  NO_SHOW: { label: "Absente", classes: "bg-red-100 text-red-700" },
};

function BoutonStatut({ id, statut, label }: { id: string; statut: string; label: string }) {
  return (
    <form action={changerStatutRendezVous.bind(null, id, statut)}>
      <button
        type="submit"
        className="rounded-full border border-pink-200 px-3 py-1 text-xs font-medium text-pink-600 transition hover:bg-pink-50"
      >
        {label}
      </button>
    </form>
  );
}

function CarteRdv({ rdv }: { rdv: RdvComplet }) {
  const badge = BADGES[rdv.statut] ?? BADGES.EN_ATTENTE;
  return (
    <div className="rounded-2xl border border-pink-100 bg-white px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold capitalize">
          {formatJour(rdv.debut)} · {formatHeure(rdv.debut)}
        </p>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.classes}`}>
          {badge.label}
        </span>
      </div>
      <p className="mt-1 text-sm">
        {rdv.prestation.nom} —{" "}
        <span className="font-medium text-pink-600">
          {formatPrix(rdv.prestation.prixCents, rdv.prestation.aPartirDe)}
        </span>
      </p>
      <p className="mt-1 text-sm text-foreground/70">
        <Link href={`/admin/clientes/${rdv.cliente.id}`} className="font-medium text-pink-600 hover:underline">
          {rdv.cliente.prenom} {rdv.cliente.nom}
        </Link>{" "}
        · <a href={`tel:${rdv.cliente.telephone}`} className="hover:underline">{rdv.cliente.telephone}</a>{" "}
        · <a href={`mailto:${rdv.cliente.email}`} className="hover:underline">{rdv.cliente.email}</a>
      </p>
      {rdv.noteCliente && (
        <p className="mt-2 rounded-xl bg-pink-50 px-4 py-2 text-sm text-foreground/80">
          💬 {rdv.noteCliente}
        </p>
      )}
      {(rdv.inspiration || rdv.inspirations.length > 0) && (
        <div className="mt-2 rounded-xl bg-pink-50 px-4 py-3 text-sm text-foreground/80">
          <p className="text-xs font-semibold uppercase tracking-wide text-pink-500">Inspiration</p>
          {rdv.inspiration && <p className="mt-1">{rdv.inspiration}</p>}
          {rdv.inspirations.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {rdv.inspirations.map((image) => (
                <a key={image.id} href={image.url} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.url}
                    alt="Inspiration de la cliente"
                    className="h-24 w-24 rounded-xl border border-pink-200 object-cover transition hover:opacity-90"
                  />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {rdv.statut === "EN_ATTENTE" && (
          <>
            <BoutonStatut id={rdv.id} statut="CONFIRME" label="✓ Confirmer" />
            <BoutonStatut id={rdv.id} statut="ANNULE" label="✕ Annuler" />
          </>
        )}
        {rdv.statut === "CONFIRME" && (
          <>
            <BoutonStatut id={rdv.id} statut="TERMINE" label="Terminé" />
            <BoutonStatut id={rdv.id} statut="NO_SHOW" label="Absente" />
            <BoutonStatut id={rdv.id} statut="ANNULE" label="✕ Annuler" />
          </>
        )}
        {(rdv.statut === "ANNULE" || rdv.statut === "NO_SHOW") && (
          <BoutonStatut id={rdv.id} statut="CONFIRME" label="Réactiver" />
        )}
      </div>
    </div>
  );
}

export default async function Agenda() {
  const maintenant = new Date();
  const ilYa14Jours = new Date(maintenant.getTime() - 14 * 24 * 60 * 60 * 1000);

  const rdvs = await prisma.rendezVous.findMany({
    where: { debut: { gte: ilYa14Jours } },
    include: { cliente: true, prestation: true, inspirations: true },
    orderBy: { debut: "asc" },
  });

  const enAttente = rdvs.filter((r) => r.statut === "EN_ATTENTE" && r.fin >= maintenant);
  const aVenir = rdvs.filter((r) => r.statut === "CONFIRME" && r.fin >= maintenant);
  const passes = rdvs.filter((r) => r.fin < maintenant).reverse();

  return (
    <div className="space-y-10">
      <section>
        <h1 className="font-display text-2xl font-bold">
          Demandes à confirmer{" "}
          {enAttente.length > 0 && (
            <span className="ml-1 rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800 align-middle">
              {enAttente.length}
            </span>
          )}
        </h1>
        <p className="mt-1 text-sm text-foreground/60">
          Pensez à envoyer le lien SumUp de l&rsquo;acompte aux nouvelles clientes avant de confirmer.
        </p>
        <div className="mt-4 grid gap-3">
          {enAttente.length === 0 ? (
            <p className="rounded-2xl bg-pink-50 px-5 py-4 text-sm text-foreground/70">
              Aucune demande en attente 🤍
            </p>
          ) : (
            enAttente.map((rdv) => <CarteRdv key={rdv.id} rdv={rdv} />)
          )}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl font-bold">Rendez-vous confirmés à venir</h2>
        <div className="mt-4 grid gap-3">
          {aVenir.length === 0 ? (
            <p className="rounded-2xl bg-pink-50 px-5 py-4 text-sm text-foreground/70">
              Aucun rendez-vous confirmé à venir.
            </p>
          ) : (
            aVenir.map((rdv) => <CarteRdv key={rdv.id} rdv={rdv} />)
          )}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl font-bold">Passés récents (14 jours)</h2>
        <div className="mt-4 grid gap-3">
          {passes.length === 0 ? (
            <p className="rounded-2xl bg-pink-50 px-5 py-4 text-sm text-foreground/70">
              Rien sur les 14 derniers jours.
            </p>
          ) : (
            passes.map((rdv) => <CarteRdv key={rdv.id} rdv={rdv} />)
          )}
        </div>
      </section>
    </div>
  );
}
