"use client";

import { useActionState, useState } from "react";
import { fusionnerClientes, type EtatFusion } from "@/actions/fusion-clientes";
import type { FicheDoublon } from "@/lib/doublons";

// Le choix se fait dans un sens explicite : « garder celle-ci, absorber
// celle-là ». Une fusion sans direction affichée laisserait Zélia deviner
// laquelle des deux disparaît, alors que c'est tout l'enjeu — l'une porte un
// espace cliente et un mot de passe, l'autre non.

function Ligne({ fiche }: { fiche: FicheDoublon }) {
  return (
    <span className="block">
      <span className="font-medium">
        {fiche.prenom} {fiche.nom}
      </span>
      <span className="block text-xs text-foreground/60">
        {fiche.sansAdresseReelle ? "sans adresse e-mail" : fiche.email}
        {fiche.telephone && ` · ${fiche.telephone}`}
      </span>
      <span className="block text-xs text-foreground/50">
        {fiche.rendezVous} rendez-vous · {fiche.commandes} commande
        {fiche.commandes > 1 ? "s" : ""}
        {fiche.aUnEspace && " · mot de passe défini"}
      </span>
    </span>
  );
}

export default function FusionDoublon({ fiches }: { fiches: FicheDoublon[] }) {
  // Par défaut, on garde la fiche qui porte une vraie adresse — c'est elle qui
  // permet à la cliente de se connecter. À défaut, la plus ancienne.
  const defaut = fiches.find((f) => !f.sansAdresseReelle) ?? fiches[0];
  const [gardeeId, setGardeeId] = useState(defaut.id);
  const [etat, action, enCours] = useActionState<EtatFusion, FormData>(fusionnerClientes, {});
  const [confirme, setConfirme] = useState(false);

  const absorbees = fiches.filter((f) => f.id !== gardeeId);

  if (etat.ok) {
    return (
      <p className="rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-800">{etat.message}</p>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
          Fiche à garder
        </legend>
        {fiches.map((fiche) => (
          <label
            key={fiche.id}
            className={`flex cursor-pointer gap-3 rounded-2xl border p-3 text-sm transition ${
              gardeeId === fiche.id
                ? "border-pink-500 bg-pink-50"
                : "border-pink-100 bg-white hover:border-pink-300"
            }`}
          >
            <input
              type="radio"
              name="gardeeId"
              value={fiche.id}
              checked={gardeeId === fiche.id}
              onChange={() => {
                setGardeeId(fiche.id);
                setConfirme(false);
              }}
              className="mt-1 accent-pink-500"
            />
            <Ligne fiche={fiche} />
          </label>
        ))}
      </fieldset>

      {/* Une seule fiche est absorbée à la fois : au-delà de deux, Zélia
          recommence l'opération, ce qui lui laisse relire entre chaque. */}
      <input type="hidden" name="absorbeeId" value={absorbees[0]?.id ?? ""} />

      {absorbees.length > 0 && (
        <p className="text-sm text-foreground/70">
          <strong>
            {absorbees[0].prenom} {absorbees[0].nom}
          </strong>{" "}
          ({absorbees[0].sansAdresseReelle ? "sans adresse" : absorbees[0].email}) disparaîtra ; son
          historique passe sur la fiche gardée.
          {absorbees.length > 1 && ` ${absorbees.length - 1} autre fiche restera à traiter ensuite.`}
        </p>
      )}

      {etat.message && !etat.ok && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{etat.message}</p>
      )}

      {confirme ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={enCours}
            className="rounded-full bg-pink-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-pink-600 disabled:opacity-50"
          >
            {enCours ? "Fusion…" : "Oui, fusionner définitivement"}
          </button>
          <button
            type="button"
            onClick={() => setConfirme(false)}
            className="text-sm text-foreground/60 hover:underline"
          >
            Annuler
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirme(true)}
          className="rounded-full border border-pink-300 px-5 py-2 text-sm font-medium text-pink-600 transition hover:bg-pink-50"
        >
          Fusionner ces fiches
        </button>
      )}
    </form>
  );
}
