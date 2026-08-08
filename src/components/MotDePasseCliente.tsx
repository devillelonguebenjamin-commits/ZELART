"use client";

import { useActionState, useState } from "react";
import {
  definirMotDePasse,
  supprimerMotDePasse,
  type EtatMotDePasse,
} from "@/actions/espace-cliente";
import { LONGUEUR_MIN } from "@/lib/mot-de-passe-bornes";

// Création, changement et retrait du mot de passe, depuis l'espace connecté.
//
// C'est le seul endroit où il se définit : il faut déjà être entrée pour en
// choisir un, et l'on n'entre que par le lien reçu sur sa propre boîte. La
// possession de l'adresse est donc toujours prouvée avant qu'un mot de passe
// existe — sans écran de validation supplémentaire à traverser.
export default function MotDePasseCliente({ enPlace }: { enPlace: boolean }) {
  const [ouvert, setOuvert] = useState(false);
  const [etat, action, enCours] = useActionState<EtatMotDePasse, FormData>(definirMotDePasse, {});

  return (
    <section className="rounded-2xl border border-pink-100 bg-white px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">Mot de passe</h2>
          <p className="mt-1 text-sm text-foreground/70">
            {enPlace
              ? "Vous pouvez vous connecter directement, sans passer par votre boîte mail."
              : "Facultatif. Sans lui, vous continuez à recevoir un lien de connexion par e-mail — ce qui marche très bien."}
          </p>
        </div>
        {!ouvert && (
          <button
            type="button"
            onClick={() => setOuvert(true)}
            className="rounded-full border border-pink-200 px-4 py-1.5 text-sm font-medium text-pink-600 transition hover:bg-pink-50"
          >
            {enPlace ? "Changer" : "En créer un"}
          </button>
        )}
      </div>

      {etat.ok && etat.message && (
        <p role="status" className="mt-3 rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {etat.message}
        </p>
      )}

      {ouvert && (
        <form action={action} className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium">Nouveau mot de passe</span>
              <input
                name="motDePasse"
                type="password"
                required
                minLength={LONGUEUR_MIN}
                autoComplete="new-password"
                className={CHAMP}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Répétez-le</span>
              <input
                name="confirmation"
                type="password"
                required
                minLength={LONGUEUR_MIN}
                autoComplete="new-password"
                className={CHAMP}
              />
            </label>
          </div>
          <p className="mt-2 text-xs text-foreground/60">
            {LONGUEUR_MIN} caractères au minimum. Si vous l&rsquo;oubliez, demandez un lien par
            e-mail : rien n&rsquo;est perdu.
          </p>

          {etat.message && !etat.ok && (
            <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">
              {etat.message}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={enCours}
              className="rounded-full bg-pink-500 px-6 py-2 text-sm font-medium text-white transition hover:bg-pink-600 disabled:opacity-40"
            >
              {enCours ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button
              type="button"
              onClick={() => setOuvert(false)}
              className="text-xs text-foreground/60 underline hover:text-pink-600"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {enPlace && !ouvert && (
        <form action={supprimerMotDePasse} className="mt-3">
          <button
            type="submit"
            className="text-xs text-foreground/60 underline hover:text-pink-600"
          >
            Retirer mon mot de passe et revenir au lien par e-mail
          </button>
        </form>
      )}
    </section>
  );
}

const CHAMP =
  "mt-1 w-full rounded-xl border border-pink-200 bg-white px-4 py-2.5 outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500";
