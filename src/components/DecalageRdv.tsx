"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  decalerRendezVous,
  proposerDecalage,
  retirerProposition,
  type EtatDecalage,
} from "@/actions/decalage";

type Choix = { valeur: string; libelle: string };

/**
 * « Changer l'horaire » sur une carte de l'agenda : un seul panneau, deux
 * issues, nommées par ce qu'elles font à la cliente.
 *
 *   - **Décaler et prévenir** : c'est déjà convenu avec elle. Le rendez-vous
 *     bouge tout de suite, elle reçoit la confirmation écrite.
 *   - **Proposer cet horaire** : c'est une question. Elle reçoit un lien pour
 *     accepter ou garder son horaire ; rien ne bouge avant sa réponse.
 *
 * Le compte rendu reste affiché jusqu'au clic sur « OK » : la carte change de
 * place dans l'agenda quand sa date change, et un message effacé par ce
 * déplacement ne serait jamais lu.
 */
export default function DecalageRdv({
  rendezVousId,
  debutActuel,
  choixLibres,
}: {
  rendezVousId: string;
  /** Horaire actuel, au format du champ (« 2026-10-20T14:00 »). */
  debutActuel: string;
  choixLibres: Choix[];
}) {
  const [ouvert, setOuvert] = useState(false);
  const [debut, setDebut] = useState(debutActuel);
  const router = useRouter();

  const [etatDecaler, decaler, decalageEnCours] = useActionState(
    decalerRendezVous.bind(null, rendezVousId),
    {} as EtatDecalage
  );
  const [etatProposer, proposer, propositionEnCours] = useActionState(
    proposerDecalage.bind(null, rendezVousId),
    {} as EtatDecalage
  );
  const enCours = decalageEnCours || propositionEnCours;
  const reussi = etatDecaler.ok ? etatDecaler : etatProposer.ok ? etatProposer : null;
  const erreur = [etatDecaler, etatProposer].find((e) => e.ok === false)?.message;

  if (reussi) {
    return (
      <div className="flex basis-full flex-wrap items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5">
        <span role="status" className="text-sm text-emerald-900">
          {reussi.message}
        </span>
        <button
          type="button"
          onClick={() => router.refresh()}
          className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100"
        >
          OK
        </button>
      </div>
    );
  }

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="rounded-full border border-sky-200 px-3 py-1 text-xs font-medium text-sky-800 transition hover:bg-sky-50"
      >
        Changer l&rsquo;horaire
      </button>
    );
  }

  return (
    <form className="basis-full space-y-3 rounded-2xl border border-sky-200 bg-sky-50/60 p-4 text-sm">
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="text-xs font-medium text-foreground/70">Nouvel horaire</span>
          <input
            type="datetime-local"
            name="debut"
            required
            value={debut}
            onChange={(e) => setDebut(e.target.value)}
            className="mt-1 block rounded-xl border border-sky-200 bg-white px-3 py-2 outline-none focus:border-sky-500"
          />
        </label>
        {choixLibres.length > 0 && (
          <label className="block min-w-0">
            <span className="text-xs font-medium text-foreground/70">ou un créneau libre</span>
            <select
              value=""
              onChange={(e) => e.target.value && setDebut(e.target.value)}
              className="mt-1 block max-w-full rounded-xl border border-sky-200 bg-white px-3 py-2 outline-none focus:border-sky-500"
            >
              <option value="">Choisir…</option>
              {choixLibres.map((c) => (
                <option key={c.valeur} value={c.valeur}>
                  {c.libelle}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <label className="block">
        <span className="text-xs font-medium text-foreground/70">Un mot pour la cliente (facultatif)</span>
        <textarea
          name="message"
          rows={2}
          maxLength={500}
          className="mt-1 w-full rounded-xl border border-sky-200 bg-white px-3 py-2 outline-none focus:border-sky-500"
        />
      </label>
      <p className="text-xs text-foreground/60">
        La durée est conservée. Les horaires d&rsquo;ouverture ne s&rsquo;appliquent pas : vous
        choisissez librement, tant que le créneau est libre.
      </p>
      {erreur && (
        <p role="status" className="rounded-xl bg-red-50 px-3 py-2 text-red-700">
          {erreur}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          formAction={decaler}
          disabled={enCours}
          title="Déjà convenu avec la cliente : le rendez-vous bouge tout de suite et elle reçoit la confirmation."
          className="rounded-full bg-sky-700 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-800 disabled:opacity-50"
        >
          {decalageEnCours ? "…" : "Décaler et prévenir la cliente"}
        </button>
        <button
          type="submit"
          formAction={proposer}
          disabled={enCours}
          title="La cliente reçoit un lien pour accepter ou garder son horaire. Rien ne bouge avant sa réponse."
          className="rounded-full border border-sky-400 bg-white px-4 py-1.5 text-xs font-semibold text-sky-800 transition hover:bg-sky-100 disabled:opacity-50"
        >
          {propositionEnCours ? "…" : "Proposer cet horaire"}
        </button>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          className="rounded-full px-3 py-1.5 text-xs text-foreground/60 hover:underline"
        >
          Fermer
        </button>
      </div>
    </form>
  );
}

/** « Retirer la proposition » : son lien cesse de fonctionner. */
export function RetirerProposition({ propositionId }: { propositionId: string }) {
  const [enCours, demarrer] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  if (message) {
    return (
      <span className="flex flex-wrap items-center gap-2 text-xs">
        <span role="status">{message}</span>
        <button type="button" onClick={() => router.refresh()} className="font-medium underline">
          OK
        </button>
      </span>
    );
  }
  return (
    <button
      type="button"
      disabled={enCours}
      onClick={() =>
        demarrer(async () => setMessage((await retirerProposition(propositionId)).message ?? null))
      }
      className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-900 transition hover:bg-amber-100 disabled:opacity-50"
    >
      {enCours ? "…" : "Retirer la proposition"}
    </button>
  );
}
