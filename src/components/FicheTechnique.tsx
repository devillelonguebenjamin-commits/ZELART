"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { compresserImage } from "@/lib/image-client";
import {
  basculerPublicationRealisation,
  enregistrerFicheTechnique,
  supprimerRealisation,
} from "@/actions/fiche-technique";

export type RealisationVue = { id: string; url: string; publiee: boolean };

type Props = {
  rendezVousId: string;
  forme: string | null;
  longueur: string | null;
  produits: string | null;
  noteTechnique: string | null;
  realisations: RealisationVue[];
  stockagePret: boolean;
};

const FORMES = ["Amande", "Ballerine", "Carré", "Carré rond", "Ovale", "Stiletto"];

export default function FicheTechnique({
  rendezVousId,
  forme,
  longueur,
  produits,
  noteTechnique,
  realisations,
  stockagePret,
}: Props) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const remplie = Boolean(forme || longueur || produits || noteTechnique);

  async function envoyerPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const fichier = event.target.files?.[0];
    event.target.value = "";
    if (!fichier) return;

    setEnCours(true);
    setErreur(null);
    try {
      const envoi = new FormData();
      envoi.append("fichier", await compresserImage(fichier), fichier.name);
      envoi.append("rendezVousId", rendezVousId);

      const reponse = await fetch("/api/realisations/upload", { method: "POST", body: envoi });
      if (!reponse.ok) {
        const { error } = (await reponse.json().catch(() => ({}))) as { error?: string };
        throw new Error(error ?? `Erreur ${reponse.status}`);
      }
      router.refresh();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setEnCours(false);
    }
  }

  if (!ouvert) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setOuvert(true)}
          className="rounded-full border border-pink-200 px-4 py-1.5 text-xs font-medium text-pink-600 transition hover:bg-pink-50"
        >
          {remplie ? "Voir la fiche technique" : "Remplir la fiche technique"}
        </button>
        {remplie && (
          <span className="text-xs text-foreground/60">
            {[forme, longueur].filter(Boolean).join(" · ")}
          </span>
        )}
        {realisations.length > 0 && (
          <span className="flex gap-1">
            {realisations.slice(0, 4).map((r) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={r.id}
                src={r.url}
                alt="Réalisation"
                className="h-8 w-8 rounded-lg border border-pink-200 object-cover"
              />
            ))}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-pink-200 bg-pink-50/40 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold">Fiche technique</h3>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          className="text-xs text-pink-600 hover:underline"
        >
          Fermer
        </button>
      </div>

      <form action={enregistrerFicheTechnique.bind(null, rendezVousId)} className="mt-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-xs text-foreground/60">Forme</span>
            <input
              name="forme"
              defaultValue={forme ?? ""}
              list={`formes-${rendezVousId}`}
              placeholder="Amande"
              className="mt-1 w-full rounded-xl border border-pink-200 bg-white px-3 py-2 outline-none focus:border-pink-500"
            />
            <datalist id={`formes-${rendezVousId}`}>
              {FORMES.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </label>
          <label className="block text-sm">
            <span className="text-xs text-foreground/60">Longueur</span>
            <input
              name="longueur"
              defaultValue={longueur ?? ""}
              placeholder="Moyenne, +2 mm…"
              className="mt-1 w-full rounded-xl border border-pink-200 bg-white px-3 py-2 outline-none focus:border-pink-500"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-xs text-foreground/60">
              Produits utilisés (gels, couleurs, marques)
            </span>
            <input
              name="produits"
              defaultValue={produits ?? ""}
              placeholder="Base rubber X, couleur n°12, top mat"
              className="mt-1 w-full rounded-xl border border-pink-200 bg-white px-3 py-2 outline-none focus:border-pink-500"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-xs text-foreground/60">
              Notes techniques (tenue, réactions, points de vigilance)
            </span>
            <textarea
              name="noteTechnique"
              rows={2}
              defaultValue={noteTechnique ?? ""}
              className="mt-1 w-full rounded-xl border border-pink-200 bg-white px-3 py-2 outline-none focus:border-pink-500"
            />
          </label>
        </div>
        <button
          type="submit"
          className="mt-3 rounded-full bg-pink-500 px-5 py-2 text-xs font-medium text-white transition hover:bg-pink-600"
        >
          Enregistrer la fiche
        </button>
      </form>

      <div className="mt-4 border-t border-pink-100 pt-3">
        <p className="text-xs font-semibold">Photos de la pose</p>
        {realisations.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-3">
            {realisations.map((realisation) => (
              <div key={realisation.id} className="w-24">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={realisation.url}
                  alt="Réalisation"
                  className="h-24 w-24 rounded-xl border border-pink-200 object-cover"
                />
                <form
                  action={basculerPublicationRealisation.bind(
                    null,
                    realisation.id,
                    !realisation.publiee
                  )}
                >
                  <button
                    type="submit"
                    className={`mt-1 w-full rounded-full px-2 py-1 text-[11px] font-medium transition ${
                      realisation.publiee
                        ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                        : "border border-pink-200 text-pink-600 hover:bg-pink-50"
                    }`}
                  >
                    {realisation.publiee ? "Dans la galerie" : "Publier"}
                  </button>
                </form>
                <form action={supprimerRealisation.bind(null, realisation.id)}>
                  <button
                    type="submit"
                    className="mt-1 w-full text-[11px] text-foreground/50 hover:text-red-600"
                  >
                    Supprimer
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        {stockagePret ? (
          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full border border-pink-300 bg-white px-4 py-1.5 text-xs font-medium text-pink-600 transition hover:bg-pink-50">
            <input
              type="file"
              accept="image/*"
              onChange={envoyerPhoto}
              disabled={enCours}
              className="hidden"
            />
            {enCours ? "Envoi…" : "📷 Ajouter une photo"}
          </label>
        ) : (
          <p className="mt-2 text-xs text-foreground/60">
            Le stockage des photos n&rsquo;est pas configuré.
          </p>
        )}

        {erreur && (
          <p role="alert" className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
            {erreur}
          </p>
        )}
      </div>
    </div>
  );
}
