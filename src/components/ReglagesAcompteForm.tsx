"use client";

import { useActionState } from "react";
import { enregistrerReglagesAcompte, type EtatAcompte } from "@/actions/admin";

type Props = { lien: string; montantEuros: string };

export default function ReglagesAcompteForm({ lien, montantEuros }: Props) {
  const [etat, action, enCours] = useActionState<EtatAcompte, FormData>(
    enregistrerReglagesAcompte,
    {}
  );

  return (
    <form action={action} className="space-y-3">
      <label className="block text-sm">
        <span className="text-foreground/70">Lien de paiement SumUp réutilisable</span>
        <input
          name="lienAcompte"
          type="url"
          defaultValue={lien}
          placeholder="https://pay.sumup.com/b2c/XXXXXXX"
          className="mt-1 w-full rounded-xl border border-pink-200 px-3 py-2 outline-none focus:border-pink-500"
        />
      </label>

      <label className="block text-sm">
        <span className="text-foreground/70">Montant de l&rsquo;acompte (€)</span>
        <input
          name="montantAcompte"
          defaultValue={montantEuros}
          inputMode="decimal"
          className="mt-1 w-28 rounded-xl border border-pink-200 px-3 py-2 text-right outline-none focus:border-pink-500"
        />
      </label>

      {etat.message && (
        <p
          role="status"
          className={`rounded-xl px-4 py-3 text-sm ${
            etat.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
          }`}
        >
          {etat.message}
        </p>
      )}

      <button
        type="submit"
        disabled={enCours}
        className="rounded-full bg-pink-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-pink-600 disabled:opacity-50"
      >
        {enCours ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
