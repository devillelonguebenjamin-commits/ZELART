"use client";

import { useActionState } from "react";
import { creerCampagne, type EtatCampagne } from "@/actions/campagnes";
import type { Segment } from "@/lib/segments";

type Props = { segments: (Segment & { nombre: number })[] };

export default function FormulaireCampagne({ segments }: Props) {
  const [etat, action, enCours] = useActionState<EtatCampagne, FormData>(creerCampagne, {});

  return (
    <form action={action} className="space-y-4">
      <label className="block text-sm">
        <span className="font-medium">Objet de l&rsquo;e-mail</span>
        <input
          name="objet"
          required
          maxLength={150}
          placeholder="Une petite attention pour vos ongles ce mois-ci 🌸"
          className="mt-1 w-full rounded-xl border border-pink-200 px-4 py-2.5 outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium">Destinataires</span>
        <select
          name="segment"
          defaultValue="toutes"
          className="mt-1 w-full rounded-xl border border-pink-200 bg-white px-4 py-2.5 outline-none focus:border-pink-500"
        >
          {segments.map((s) => (
            <option key={s.id} value={s.id}>
              {s.libelle} — {s.nombre} cliente{s.nombre > 1 ? "s" : ""}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs text-foreground/60">
          {segments.map((s) => `${s.libelle} : ${s.description}`).join(" · ")}
        </span>
      </label>

      <label className="block text-sm">
        <span className="font-medium">Message</span>
        <textarea
          name="contenu"
          required
          rows={9}
          maxLength={5000}
          placeholder={
            "Bonjour {{prenom}},\n\nPour vous remercier de votre fidélité, je vous propose ce mois-ci…\n\nÀ très vite !"
          }
          className="mt-1 w-full rounded-xl border border-pink-200 px-4 py-2.5 font-sans outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
        />
        <span className="mt-1 block text-xs text-foreground/60">
          Écrivez <code>{"{{prenom}}"}</code> pour insérer le prénom de chaque cliente. Votre
          signature, vos coordonnées et le lien de désinscription sont ajoutés automatiquement.
        </span>
      </label>

      {etat.erreur && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {etat.erreur}
        </p>
      )}

      <button
        type="submit"
        disabled={enCours}
        className="rounded-full bg-pink-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-pink-600 disabled:opacity-50"
      >
        {enCours ? "Création…" : "Créer le brouillon"}
      </button>
    </form>
  );
}
