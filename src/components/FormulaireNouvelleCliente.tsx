"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { creerCliente, type EtatCliente } from "@/actions/clientes";

export default function FormulaireNouvelleCliente() {
  const router = useRouter();
  const formulaire = useRef<HTMLFormElement>(null);
  const [ouvert, setOuvert] = useState(false);
  const [etat, action, enCours] = useActionState<EtatCliente, FormData>(creerCliente, {});

  useEffect(() => {
    if (etat.ok) {
      formulaire.current?.reset();
      router.refresh();
    }
  }, [etat, router]);

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="rounded-full bg-pink-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-pink-600"
      >
        + Ajouter une cliente
      </button>
    );
  }

  return (
    <form
      ref={formulaire}
      action={action}
      className="rounded-2xl border border-pink-200 bg-white p-5"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-semibold">Nouvelle cliente</h2>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          className="text-sm text-pink-600 hover:underline"
        >
          Fermer
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-foreground/70">Prénom *</span>
          <input
            name="prenom"
            required
            className="mt-1 w-full rounded-xl border border-pink-200 px-3 py-2 outline-none focus:border-pink-500"
          />
        </label>
        <label className="block text-sm">
          <span className="text-foreground/70">Nom *</span>
          <input
            name="nom"
            required
            className="mt-1 w-full rounded-xl border border-pink-200 px-3 py-2 outline-none focus:border-pink-500"
          />
        </label>
        <label className="block text-sm">
          <span className="text-foreground/70">E-mail *</span>
          <input
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded-xl border border-pink-200 px-3 py-2 outline-none focus:border-pink-500"
          />
        </label>
        <label className="block text-sm">
          <span className="text-foreground/70">Téléphone *</span>
          <input
            name="telephone"
            type="tel"
            required
            placeholder="06 12 34 56 78"
            className="mt-1 w-full rounded-xl border border-pink-200 px-3 py-2 outline-none focus:border-pink-500"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="text-foreground/70">Notes de suivi (facultatif)</span>
          <textarea
            name="notes"
            rows={2}
            maxLength={2000}
            className="mt-1 w-full rounded-xl border border-pink-200 px-3 py-2 outline-none focus:border-pink-500"
          />
        </label>
      </div>

      <label className="mt-3 flex items-start gap-3 text-sm">
        <input type="checkbox" name="consentementMarketing" className="mt-1 accent-pink-500" />
        <span>
          Elle m&rsquo;a donné son accord pour recevoir mes offres par e-mail.
          <span className="block text-xs text-foreground/60">
            À ne cocher que si l&rsquo;accord a réellement été donné : c&rsquo;est ce qui autorise
            l&rsquo;envoi des campagnes.
          </span>
        </span>
      </label>

      {etat.message && (
        <p
          role="status"
          className={`mt-3 rounded-xl px-4 py-3 text-sm ${
            etat.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
          }`}
        >
          {etat.message}
        </p>
      )}

      <button
        type="submit"
        disabled={enCours}
        className="mt-4 rounded-full bg-pink-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-pink-600 disabled:opacity-50"
      >
        {enCours ? "Enregistrement…" : "Enregistrer la cliente"}
      </button>
    </form>
  );
}
