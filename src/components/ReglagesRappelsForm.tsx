"use client";

import { useActionState } from "react";
import {
  enregistrerReglagesRappels,
  lancerRappelsMaintenant,
  type EtatRappels,
} from "@/actions/rappels";

type Props = {
  actifs: boolean;
  delais: { cle: string; libelle: string; jours: number }[];
};

export default function ReglagesRappelsForm({ actifs, delais }: Props) {
  const [etat, action, enCours] = useActionState<EtatRappels, FormData>(
    enregistrerReglagesRappels,
    {}
  );
  const [etatEssai, actionEssai, essaiEnCours] = useActionState<EtatRappels, FormData>(
    () => lancerRappelsMaintenant(),
    {}
  );

  return (
    <div>
      <form action={action} className="space-y-4">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="rappelsActifs"
            defaultChecked={actifs}
            className="mt-1 accent-pink-500"
          />
          <span>
            <span className="font-medium">Activer les envois automatiques</span>
            <span className="block text-xs text-foreground/60">
              Un rappel la veille de chaque rendez-vous confirmé, et une relance quand la repousse
              arrive.
            </span>
          </span>
        </label>

        <div>
          <p className="text-sm font-medium">Relancer après combien de jours ?</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {delais.map((delai) => (
              <label key={delai.cle} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-foreground/70">{delai.libelle}</span>
                <span className="flex items-center gap-2">
                  <input
                    name={delai.cle}
                    type="number"
                    min={1}
                    max={180}
                    defaultValue={delai.jours}
                    className="w-20 rounded-xl border border-pink-200 px-3 py-2 text-right outline-none focus:border-pink-500"
                  />
                  <span className="text-xs text-foreground/60">jours</span>
                </span>
              </label>
            ))}
          </div>
        </div>

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

      <form action={actionEssai} className="mt-5 border-t border-pink-50 pt-4">
        <p className="text-xs text-foreground/60">
          Les envois ont lieu chaque matin. Vous pouvez aussi les déclencher tout de suite pour
          vérifier — les messages déjà envoyés ne partent jamais deux fois.
        </p>
        <button
          type="submit"
          disabled={essaiEnCours}
          className="mt-3 rounded-full border border-pink-300 px-5 py-2 text-sm font-medium text-pink-600 transition hover:bg-pink-50 disabled:opacity-50"
        >
          {essaiEnCours ? "Envoi en cours…" : "Lancer les envois maintenant"}
        </button>
        {etatEssai.message && (
          <p
            role="status"
            className={`mt-3 rounded-xl px-4 py-3 text-sm ${
              etatEssai.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
            }`}
          >
            {etatEssai.message}
          </p>
        )}
      </form>
    </div>
  );
}
