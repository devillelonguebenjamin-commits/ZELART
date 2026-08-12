"use client";

import { useActionState, useRef } from "react";
import { creerCompte, type EtatInscription } from "@/actions/inscription";

const CHAMP =
  "mt-1 w-full rounded-xl border border-pink-200 bg-white px-4 py-2.5 outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500";

export default function FormulaireInscription() {
  const formulaire = useRef<HTMLFormElement>(null);
  const [etat, action, enCours] = useActionState<EtatInscription, FormData>(creerCompte, {});

  // Une fois le lien parti, le formulaire n'a plus lieu d'être : le laisser
  // afficherait un bouton qui renverrait un second lien et annulerait le
  // premier, alors que la cliente doit simplement aller voir sa boîte.
  if (etat.ok) {
    return (
      <p className="rounded-2xl bg-emerald-50 px-5 py-4 text-emerald-900" role="status">
        {etat.message}
      </p>
    );
  }

  return (
    <form ref={formulaire} action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-foreground/70">Prénom *</span>
          <input name="prenom" required autoComplete="given-name" className={CHAMP} />
        </label>
        <label className="block text-sm">
          <span className="text-foreground/70">Nom *</span>
          <input name="nom" required autoComplete="family-name" className={CHAMP} />
        </label>
      </div>

      <label className="block text-sm">
        <span className="text-foreground/70">Adresse e-mail *</span>
        <input name="email" type="email" required autoComplete="email" className={CHAMP} />
        <span className="mt-1 block text-xs text-foreground/55">
          C&rsquo;est elle qui vous connectera à votre espace.
        </span>
      </label>

      <label className="block text-sm">
        <span className="text-foreground/70">Téléphone *</span>
        <input
          name="telephone"
          type="tel"
          required
          autoComplete="tel"
          placeholder="06 12 34 56 78"
          className={CHAMP}
        />
      </label>

      {/* Pas de champ de mot de passe ici, et ce n'est pas un oubli : le site
          n'en laisse choisir un que depuis l'espace connecté, pour qu'on ait
          toujours prouvé posséder l'adresse avant qu'une clé existe. */}
      <p className="rounded-2xl bg-pink-50/60 px-4 py-3 text-sm text-foreground/70">
        Aucun mot de passe à retenir : vous vous connectez par un lien envoyé à votre adresse. Si
        vous en voulez un malgré tout, vous pourrez le choisir une fois dans votre espace.
      </p>

      <label className="flex items-start gap-2.5 text-sm">
        <input
          type="checkbox"
          name="consentementMarketing"
          className="mt-0.5 size-4 accent-pink-500"
        />
        <span>
          J&rsquo;accepte de recevoir les nouveautés et les offres de Zelart Nails
          <span className="block text-xs text-foreground/60">
            Facultatif, et révocable d&rsquo;un clic depuis chaque message.
          </span>
        </span>
      </label>

      {etat.message && !etat.ok && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {etat.message}
        </p>
      )}

      <button
        type="submit"
        disabled={enCours}
        className="w-full rounded-full bg-pink-500 px-6 py-3 font-medium text-white shadow-sm transition hover:bg-pink-600 disabled:opacity-60"
      >
        {enCours ? "Création…" : "Créer mon compte"}
      </button>
    </form>
  );
}
