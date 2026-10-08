"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  laisserAnnule,
  retablirRendezVous,
  type EtatRetablissement,
  type ModeRetablissement,
} from "@/actions/retablissement";

/**
 * Les gestes possibles sur un rendez-vous annulé.
 *
 * Deux façons de rétablir, nommées par ce qu'elles font à la cliente et non par
 * leur mécanique : « sans acompte » la met à l'abri pour de bon, « 48 h pour
 * régler » lui renvoie un lien et un délai neuf. Un seul bouton faisait les
 * deux à moitié — c'est ce qui a réannulé deux fois le même rendez-vous.
 *
 * « Laisser annulé » ne s'affiche que là où une décision reste à prendre (le
 * bloc des annulations à vérifier) : il prévient la cliente sans ambiguïté et
 * sort le rendez-vous de la liste.
 *
 * Le résultat reste affiché, avec le nom en cas de refus : le refus le plus
 * probable — « une autre cliente a pris le créneau » — doit se lire tout de
 * suite, sinon Zélia rappuie en pensant à une panne.
 */
export default function BoutonRetablir({
  rendezVousId,
  acompteDemande,
  aVenir,
  avecLaisser = false,
}: {
  rendezVousId: string;
  /** Un acompte avait été demandé : « 48 h pour régler » a un sens. */
  acompteDemande: boolean;
  /** Le rendez-vous est à venir : il y a quelqu'un à prévenir. */
  aVenir: boolean;
  /** Proposer aussi « Laisser annulé ». */
  avecLaisser?: boolean;
}) {
  const [etat, setEtat] = useState<EtatRetablissement | null>(null);
  const [enCours, demarrer] = useTransition();
  const router = useRouter();

  function agir(geste: () => Promise<EtatRetablissement>) {
    demarrer(async () => setEtat(await geste()));
  }

  if (etat?.ok) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span role="status" className="text-xs font-medium text-emerald-700">
          {etat.message}
        </span>
        <button
          type="button"
          onClick={() => router.refresh()}
          className="rounded-full border border-stone-300 px-3 py-1 text-xs font-medium text-foreground/75 transition hover:bg-stone-50"
        >
          OK
        </button>
      </div>
    );
  }

  const retablir = (mode: ModeRetablissement) => () =>
    agir(() => retablirRendezVous(rendezVousId, mode));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={enCours}
        onClick={retablir("maintenir")}
        className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
        title="La cliente est en règle, ou vous renoncez à l'acompte. Le site ne l'annulera plus."
      >
        {enCours ? "…" : acompteDemande ? "Rétablir sans acompte" : "Rétablir"}
      </button>
      {acompteDemande && aVenir && (
        <button
          type="button"
          disabled={enCours}
          onClick={retablir("relancer")}
          className="rounded-full border border-amber-400 bg-amber-50 px-4 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 disabled:opacity-50"
          title="La cliente reçoit un lien neuf et 48 h pour régler. Sans règlement, le créneau sera de nouveau libéré."
        >
          Rétablir · 48 h pour régler
        </button>
      )}
      {avecLaisser && (
        <button
          type="button"
          disabled={enCours}
          onClick={() => agir(() => laisserAnnule(rendezVousId))}
          className="rounded-full border border-stone-300 px-4 py-1.5 text-xs font-medium text-foreground/75 transition hover:bg-stone-50 disabled:opacity-50"
          title={
            aVenir
              ? "La cliente reçoit un e-mail et un SMS confirmant l'annulation. Le rendez-vous sort de cette liste."
              : "Le rendez-vous sort de cette liste."
          }
        >
          {aVenir ? "Laisser annulé · prévenir la cliente" : "Laisser annulé"}
        </button>
      )}
      {etat?.message && (
        <span role="status" className="basis-full text-xs text-red-700">
          {etat.message}
        </span>
      )}
    </div>
  );
}
