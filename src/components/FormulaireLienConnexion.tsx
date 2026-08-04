"use client";

import { useActionState } from "react";
import { demanderLienConnexion, type EtatLien } from "@/actions/espace-cliente";

export default function FormulaireLienConnexion() {
  const [etat, action, enCours] = useActionState<EtatLien, FormData>(demanderLienConnexion, {});

  return (
    <div>
      <form action={action} className="flex flex-wrap items-end gap-3">
        <label className="block flex-1 text-sm">
          <span className="font-medium">Votre adresse e-mail</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="celle utilisée pour votre rendez-vous"
            className="mt-1 w-full min-w-56 rounded-xl border border-pink-200 bg-white px-4 py-2.5 outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
          />
        </label>
        <button
          type="submit"
          disabled={enCours}
          className="rounded-full bg-pink-500 px-6 py-2.5 font-medium text-white transition hover:bg-pink-600 disabled:opacity-50"
        >
          {enCours ? "Envoi…" : "Recevoir mon lien"}
        </button>
      </form>

      {etat.message && (
        <p
          role="status"
          className={`mt-4 rounded-xl px-4 py-3 text-sm ${
            etat.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
          }`}
        >
          {etat.message}
        </p>
      )}
    </div>
  );
}
