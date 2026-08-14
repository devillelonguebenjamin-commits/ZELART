"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { creerPartenaire, type EtatPartenaire } from "@/actions/partenaires";

const CHAMP =
  "mt-1 w-full rounded-xl border border-pink-200 px-3 py-2 outline-none focus:border-pink-500";

export default function FormulaireNouveauPartenaire() {
  const router = useRouter();
  const formulaire = useRef<HTMLFormElement>(null);
  const [ouvert, setOuvert] = useState(false);
  const [etat, action, enCours] = useActionState<EtatPartenaire, FormData>(creerPartenaire, {});

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
        + Ajouter un partenaire
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
        <h2 className="font-semibold">Nouveau partenaire</h2>
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
          <span className="text-foreground/70">Nom de la marque *</span>
          <input name="nom" required placeholder="INAKA" className={CHAMP} />
        </label>
        <label className="block text-sm">
          <span className="text-foreground/70">Catégorie</span>
          <input name="categorie" placeholder="Formation et matériel" className={CHAMP} />
        </label>

        <label className="block text-sm sm:col-span-2">
          <span className="text-foreground/70">Lien d&rsquo;affiliation *</span>
          <input
            name="lienAffilie"
            required
            type="url"
            placeholder="https://…"
            className={CHAMP}
          />
          <span className="mt-1 block text-xs text-foreground/55">
            Collez le lien nominatif tel qu&rsquo;il vous a été donné, sans rien y ajouter.
          </span>
        </label>

        <label className="block text-sm">
          <span className="text-foreground/70">Adresse courte</span>
          <div className="mt-1 flex items-center gap-1 rounded-xl border border-pink-200 px-3 py-2 focus-within:border-pink-500">
            <span className="text-sm text-foreground/45">zelart.fr/</span>
            <input
              name="slug"
              placeholder="inaka"
              className="w-full outline-none"
            />
          </div>
          <span className="mt-1 block text-xs text-foreground/55">
            Laissée vide, elle se déduit du nom.
          </span>
        </label>

        <label className="block text-sm">
          <span className="text-foreground/70">Code promo</span>
          <input name="codePromo" placeholder="ZELART" className={CHAMP} />
        </label>

        <label className="block text-sm sm:col-span-2">
          <span className="text-foreground/70">Ce que vous en dites</span>
          <textarea
            name="description"
            rows={4}
            placeholder="Ce que vous utilisez de chez eux, pourquoi, et ce qui vous plaît moins."
            className={CHAMP}
          />
        </label>

        <label className="block text-sm sm:col-span-2">
          <span className="text-foreground/70">Logo (adresse d&rsquo;image)</span>
          <input name="logoUrl" type="url" placeholder="https://…" className={CHAMP} />
        </label>
      </div>

      {etat.message && (
        <p
          className={`mt-3 text-sm ${etat.ok ? "text-emerald-700" : "text-red-600"}`}
          role="status"
        >
          {etat.message}
        </p>
      )}

      <button
        type="submit"
        disabled={enCours}
        className="mt-4 rounded-full bg-pink-500 px-6 py-2 font-medium text-white transition hover:bg-pink-600 disabled:opacity-60"
      >
        {enCours ? "Enregistrement…" : "Ajouter"}
      </button>
    </form>
  );
}
