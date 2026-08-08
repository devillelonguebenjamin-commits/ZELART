"use client";

import { useActionState, useState } from "react";
import { connexionParMotDePasse, type EtatMotDePasse } from "@/actions/espace-cliente";

// Connexion directe, pour celles qui se sont créé un mot de passe.
//
// Repliée par défaut : le lien par e-mail reste la voie normale, et la seule
// que tout le monde peut emprunter. Mettre les deux formulaires côte à côte
// obligerait chaque visiteuse à choisir, alors que la plupart n'ont pas de mot
// de passe et n'en veulent pas.
export default function ConnexionMotDePasse() {
  const [ouvert, setOuvert] = useState(false);
  const [etat, action, enCours] = useActionState<EtatMotDePasse, FormData>(
    connexionParMotDePasse,
    {}
  );

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="mt-4 text-sm font-medium text-pink-600 hover:underline"
      >
        J&rsquo;ai un mot de passe, me connecter directement
      </button>
    );
  }

  return (
    <form action={action} className="mt-4 border-t border-pink-100 pt-4">
      <p className="text-sm font-medium">Connexion avec mot de passe</p>
      <div className="mt-3 space-y-3">
        <label className="block text-sm">
          <span className="font-medium">Votre adresse e-mail</span>
          <input name="email" type="email" required autoComplete="email" className={CHAMP} />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Mot de passe</span>
          <input
            name="motDePasse"
            type="password"
            required
            autoComplete="current-password"
            className={CHAMP}
          />
        </label>
      </div>

      {etat.message && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {etat.message}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={enCours}
          className="rounded-full bg-pink-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-pink-600 disabled:opacity-40"
        >
          {enCours ? "Connexion…" : "Se connecter"}
        </button>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          className="text-xs text-foreground/60 underline hover:text-pink-600"
        >
          Revenir au lien par e-mail
        </button>
      </div>
      <p className="mt-3 text-xs text-foreground/60">
        Mot de passe oublié ? Demandez simplement un lien par e-mail ci-dessus : il vous connecte
        sans mot de passe, et vous pourrez en choisir un nouveau depuis votre espace.
      </p>
    </form>
  );
}

const CHAMP =
  "mt-1 w-full rounded-xl border border-pink-200 bg-white px-4 py-2.5 outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500";
