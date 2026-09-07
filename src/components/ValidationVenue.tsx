"use client";

import { useActionState, useState, useTransition } from "react";
import { annulerVenue, validerVenue, type EtatVenue } from "@/actions/venue";

/** « 16:45 » décalé de n minutes, sans quitter la journée. */
function decaler(heure: string, minutes: number): string {
  const m = heure.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return heure;
  const total = (Number(m[1]) * 60 + Number(m[2]) + minutes) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export type LigneASolder = {
  id: string;
  nom: string;
  /** Montant actuellement enregistré, en centimes. */
  prixCents: number;
  /** Vrai s'il a déjà été confirmé plutôt que recopié du catalogue. */
  prixConfirme: boolean;
  aPartirDe: boolean;
};

export default function ValidationVenue({
  rendezVousId,
  prenomMarraine,
  dejaValide = false,
  commentaire,
  passe = true,
  lignes = [],
  finPrevue,
  finReelle,
}: {
  rendezVousId: string;
  /** Renseigné quand la cliente est une filleule : sa venue compte pour sa marraine. */
  prenomMarraine?: string | null;
  dejaValide?: boolean;
  commentaire?: string | null;
  /** Les prestations à solder, pour confirmer ce qui a réellement été encaissé. */
  lignes?: LigneASolder[];
  /** Heure de fin prévue, « 16:45 », qui sert de valeur de départ. */
  finPrevue?: string;
  /** Heure de fin réelle déjà notée, le cas échéant. */
  finReelle?: string | null;
  /**
   * L'heure de fin du rendez-vous est dépassée.
   *
   * Faux, le bouton de validation ne s'affiche pas : on ne peut pas être venue
   * à un rendez-vous qui n'a pas eu lieu, et c'est exactement l'erreur qui a
   * motivé ce garde-fou. Un clic sur la mauvaise carte marquait « venue » une
   * cliente attendue dans un mois.
   */
  passe?: boolean;
}) {
  const [etat, action, enCours] = useActionState<EtatVenue, FormData>(
    validerVenue.bind(null, rendezVousId),
    {}
  );
  const [ouvert, setOuvert] = useState(false);
  const [retour, setRetour] = useState<EtatVenue | null>(null);
  const [annulationEnCours, demarrerAnnulation] = useTransition();
  const [heureSortie, setHeureSortie] = useState(finReelle ?? finPrevue ?? "");

  const message = retour ?? (etat.message ? etat : null);
  if (message?.message) {
    return (
      <p
        role="status"
        className={`mt-3 rounded-xl px-4 py-2.5 text-sm ${
          message.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-700"
        }`}
      >
        {message.message}
      </p>
    );
  }

  // Rendez-vous à venir et pas encore validé : rien à proposer, mais on le dit,
  // sinon l'absence du bouton passerait pour une panne.
  if (!passe && !dejaValide) {
    return (
      <span className="text-xs text-foreground/45">
        Validable une fois le rendez-vous passé
      </span>
    );
  }

  if (!ouvert) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOuvert(true)}
          className={
            dejaValide
              ? "rounded-full border border-pink-200 px-3 py-1 text-xs font-medium text-pink-600 transition hover:bg-pink-50"
              : "rounded-full bg-pink-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-pink-600"
          }
        >
          {dejaValide ? "Modifier le commentaire" : "✓ Elle est bien venue"}
        </button>
        {dejaValide && (
          <button
            type="button"
            disabled={annulationEnCours}
            onClick={() =>
              demarrerAnnulation(async () => setRetour(await annulerVenue(rendezVousId)))
            }
            className="rounded-full border border-stone-300 px-3 py-1 text-xs font-medium text-foreground/70 transition hover:bg-stone-50 disabled:opacity-50"
          >
            {annulationEnCours ? "Annulation…" : "↩ Annuler la validation"}
          </button>
        )}
      </>
    );
  }

  return (
    <form action={action} className="mt-2 rounded-xl border border-pink-200 bg-white p-4">
      {prenomMarraine && !dejaValide && (
        <p className="mb-2 rounded-lg bg-pink-50 px-3 py-2 text-xs text-pink-800">
          💕 Filleule de <strong>{prenomMarraine}</strong>, valider sa venue peut débloquer un
          palier de parrainage.
        </p>
      )}

      {/* Heure réelle de sortie : deux boutons couvrent la quasi-totalité des
          cas, le champ reste là pour le reste. */}
      {finPrevue && (
        <div className="mb-4">
          <span className="text-sm font-medium">
            Elle est partie à{" "}
            <span className="font-normal text-foreground/50">(facultatif)</span>
          </span>
          <span className="mt-0.5 block text-xs text-foreground/60">
            C&rsquo;est ce qui corrige les durées du catalogue, donc les créneaux proposés.
          </span>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <input
              type="time"
              name="finReelle"
              value={heureSortie}
              onChange={(e) => setHeureSortie(e.target.value)}
              className="rounded-xl border border-pink-200 px-3 py-2 text-sm tabular-nums outline-none focus:border-pink-500"
            />
            {[0, 15, 30].map((retard) => (
              <button
                key={retard}
                type="button"
                onClick={() => setHeureSortie(decaler(finPrevue, retard))}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  heureSortie === decaler(finPrevue, retard)
                    ? "border-pink-500 bg-pink-50 text-pink-700"
                    : "border-pink-200 hover:bg-pink-50"
                }`}
              >
                {retard === 0 ? "à l’heure" : `+${retard} min`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Montants encaissés : le seul moment où ils sont connus. */}
      {lignes.length > 0 && (
        <div className="mb-4 rounded-xl border border-pink-100 bg-pink-50/50 p-3">
          <p className="text-sm font-medium">
            Encaissé <span className="font-normal text-foreground/50">(facultatif)</span>
          </p>
          <span className="mt-0.5 block text-xs text-foreground/60">
            Sans confirmation, un tarif « à partir de » compte pour son minimum.
          </span>
          <div className="mt-2 space-y-1.5">
            {lignes.map((ligne) => (
              <div key={ligne.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="min-w-32 flex-1">
                  {ligne.nom}
                  {ligne.aPartirDe && !ligne.prixConfirme && (
                    <span className="ml-1.5 text-xs text-amber-700">à partir de</span>
                  )}
                </span>
                <span className="flex items-center gap-1">
                  <input
                    type="text"
                    inputMode="decimal"
                    name={`prix_${ligne.id}`}
                    defaultValue={
                      ligne.prixConfirme ? (ligne.prixCents / 100).toFixed(2).replace(".", ",") : ""
                    }
                    placeholder={(ligne.prixCents / 100).toFixed(2).replace(".", ",")}
                    aria-label={`Montant encaissé pour ${ligne.nom}, en euros`}
                    className="w-24 rounded-lg border border-pink-200 bg-white px-2 py-1 text-right text-sm tabular-nums outline-none focus:border-pink-500"
                  />
                  <span className="text-xs text-foreground/60">€</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <label className="block text-sm">
        <span className="font-medium">
          Commentaire sur la visite{" "}
          <span className="font-normal text-foreground/50">(facultatif)</span>
        </span>
        <span className="mt-0.5 block text-xs text-foreground/60">
          Gardé dans sa fiche, visible de vous seule.
        </span>
        <textarea
          name="commentaire"
          rows={3}
          maxLength={1000}
          defaultValue={commentaire ?? ""}
          placeholder="Ex. très ponctuelle, a adoré le chrome, veut essayer le Pop-it la prochaine fois."
          className="mt-1 w-full rounded-xl border border-pink-200 px-3 py-2 text-sm outline-none focus:border-pink-500"
        />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={enCours}
          className="rounded-full bg-pink-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-pink-600 disabled:opacity-50"
        >
          {enCours ? "Enregistrement…" : dejaValide ? "Enregistrer" : "Confirmer la venue"}
        </button>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          className="rounded-full border border-pink-200 px-4 py-2 text-sm text-foreground/70 transition hover:bg-pink-50"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
