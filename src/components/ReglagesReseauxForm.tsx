"use client";

import { useActionState } from "react";
import { enregistrerReseaux, type EtatReseaux } from "@/actions/admin";

const CLASSE_CHAMP =
  "mt-1 w-full rounded-xl border border-pink-200 px-3 py-2 outline-none focus:border-pink-500";

export default function ReglagesReseauxForm({
  instagram,
  tiktok,
  autre,
  autreLibelle,
}: {
  instagram: string;
  tiktok: string;
  autre: string;
  autreLibelle: string;
}) {
  const [etat, action, enCours] = useActionState<EtatReseaux, FormData>(enregistrerReseaux, {});

  return (
    <form action={action} className="rounded-2xl border border-pink-100 bg-white p-6">
      <h2 className="font-semibold">Mes réseaux</h2>
      <p className="mt-1 text-sm text-foreground/70">
        Affichés en bas de chaque page et sur l&rsquo;accueil. Laissez vide ce que vous
        n&rsquo;utilisez pas. Vous pouvez écrire simplement votre pseudo (<code>@zelart</code>) ou
        coller l&rsquo;adresse complète.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium">Instagram</span>
          <input name="instagram" defaultValue={instagram} placeholder="@zelart" className={CLASSE_CHAMP} />
        </label>
        <label className="block text-sm">
          <span className="font-medium">TikTok</span>
          <input name="tiktok" defaultValue={tiktok} placeholder="@zelart" className={CLASSE_CHAMP} />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Autre lien</span>
          <input
            name="autre"
            defaultValue={autre}
            placeholder="https://linktr.ee/…"
            className={CLASSE_CHAMP}
          />
          <span className="mt-1 block text-xs text-foreground/60">
            Adresse complète attendue (Linktree, Pinterest, Snapchat…).
          </span>
        </label>
        <label className="block text-sm">
          <span className="font-medium">Nom de ce lien</span>
          <input
            name="autreLibelle"
            defaultValue={autreLibelle}
            placeholder="Tous mes liens"
            maxLength={30}
            className={CLASSE_CHAMP}
          />
        </label>
      </div>

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

      <button
        type="submit"
        disabled={enCours}
        className="mt-4 rounded-full bg-pink-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-pink-600 disabled:opacity-50"
      >
        {enCours ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
