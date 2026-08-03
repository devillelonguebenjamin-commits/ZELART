"use client";

import { useActionState } from "react";
import { envoyerEmailTest, type EtatTestEmail } from "@/actions/admin";

export default function TestEmailForm({ defaut }: { defaut: string }) {
  const [etat, action, enCours] = useActionState<EtatTestEmail, FormData>(envoyerEmailTest, {});

  return (
    <div>
      <form action={action} className="flex flex-wrap items-end gap-3">
        <label className="block flex-1 text-sm">
          <span className="text-foreground/70">Envoyer un e-mail de test à</span>
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
          className="rounded-full bg-pink-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-pink-600 disabled:opacity-50"
        >
          {enCours ? "Envoi…" : "Tester l'envoi"}
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
