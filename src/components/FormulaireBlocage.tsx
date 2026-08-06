"use client";

import { useActionState } from "react";
import { bloquerCliente, type EtatBlocage } from "@/actions/blocage";

export default function FormulaireBlocage() {
  const [etat, action, enCours] = useActionState<EtatBlocage, FormData>(bloquerCliente, {});

  return (
    <div>
      <form action={action} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="block text-sm">
          <span className="font-medium">Adresse e-mail</span>
          <input
            name="email"
            type="email"
            required
            placeholder="celle utilisée pour réserver"
            className="mt-1 w-full rounded-xl border border-pink-200 px-3 py-2 outline-none focus:border-pink-500"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">
            Motif <span className="font-normal text-foreground/50">(pour vous)</span>
          </span>
          <input
            name="motif"
            maxLength={300}
            placeholder="Ex. 3 lapins de suite"
            className="mt-1 w-full rounded-xl border border-pink-200 px-3 py-2 outline-none focus:border-pink-500"
          />
        </label>
        <button
          type="submit"
          disabled={enCours}
          className="rounded-full bg-pink-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-pink-600 disabled:opacity-50"
        >
          {enCours ? "Blocage…" : "Bloquer"}
        </button>
      </form>

      {etat.message && (
        <p
          role="status"
          className={`mt-3 rounded-xl px-4 py-2.5 text-sm ${
            etat.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
          }`}
        >
          {etat.message}
        </p>
      )}
    </div>
  );
}
