"use client";

import { useActionState } from "react";
import { envoyerCampagneTest, type EtatTest } from "@/actions/campagnes";

export default function TestCampagneForm({
  campagneId,
  defaut,
}: {
  campagneId: string;
  defaut: string;
}) {
  const action = envoyerCampagneTest.bind(null, campagneId);
  const [etat, formAction, enCours] = useActionState<EtatTest, FormData>(action, {});

  return (
    <div>
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <label className="block flex-1 text-sm">
          <span className="text-foreground/70">S&rsquo;envoyer un test à</span>
          <input
            name="destinataire"
            type="email"
            required
            defaultValue={defaut}
            className="mt-1 block w-full min-w-56 rounded-xl border border-pink-200 px-3 py-2 outline-none focus:border-pink-500"
          />
        </label>
        <button
          type="submit"
          disabled={enCours}
          className="rounded-full border border-pink-300 px-5 py-2.5 text-sm font-medium text-pink-600 transition hover:bg-pink-50 disabled:opacity-50"
        >
          {enCours ? "Envoi…" : "Envoyer un test"}
        </button>
      </form>
      {etat.message && (
        <p
          role="status"
          className={`mt-3 break-words rounded-xl px-4 py-3 text-sm ${
            etat.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
          }`}
        >
          {etat.message}
        </p>
      )}
    </div>
  );
}
