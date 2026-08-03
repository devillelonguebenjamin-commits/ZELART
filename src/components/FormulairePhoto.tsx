"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { compresserImage } from "@/lib/image-client";

export default function FormulairePhoto() {
  const router = useRouter();
  const formulaire = useRef<HTMLFormElement>(null);
  const [enCours, setEnCours] = useState(false);
  const [etat, setEtat] = useState<{ ok: boolean; message: string } | null>(null);

  async function envoyer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const donnees = new FormData(event.currentTarget);
    const fichier = donnees.get("fichier");
    const legende = String(donnees.get("legende") ?? "");

    if (!(fichier instanceof File) || fichier.size === 0) {
      setEtat({ ok: false, message: "Choisissez une image à envoyer." });
      return;
    }
    if (!fichier.type.startsWith("image/")) {
      setEtat({ ok: false, message: "Ce fichier n'est pas une image." });
      return;
    }

    setEnCours(true);
    setEtat(null);
    try {
      const image = await compresserImage(fichier);
      const envoi = new FormData();
      envoi.append("fichier", image, fichier.name);
      envoi.append("legende", legende);

      const reponse = await fetch("/api/galerie/upload", { method: "POST", body: envoi });
      if (!reponse.ok) {
        const { error } = (await reponse.json().catch(() => ({}))) as { error?: string };
        throw new Error(error ?? `Erreur ${reponse.status}`);
      }

      formulaire.current?.reset();
      setEtat({ ok: true, message: "Photo ajoutée ✨" });
      router.refresh();
    } catch (erreur) {
      const message = erreur instanceof Error ? erreur.message : String(erreur);
      setEtat({ ok: false, message: `Envoi impossible : ${message}` });
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div>
      <form ref={formulaire} onSubmit={envoyer} className="flex flex-wrap items-end gap-4">
        <label className="block text-sm">
          <span className="text-foreground/70">Image</span>
          <input
            type="file"
            name="fichier"
            accept="image/*"
            required
            className="mt-1 block text-sm file:mr-3 file:rounded-full file:border-0 file:bg-pink-500 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-pink-600"
          />
        </label>
        <label className="block flex-1 text-sm">
          <span className="text-foreground/70">Légende (facultatif)</span>
          <input
            name="legende"
            placeholder="Pose Gel X — nail art fleuri"
            className="mt-1 block w-full min-w-40 rounded-xl border border-pink-200 px-3 py-2 outline-none focus:border-pink-500"
          />
        </label>
        <button
          type="submit"
          disabled={enCours}
          className="rounded-full bg-pink-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-pink-600 disabled:opacity-50"
        >
          {enCours ? "Envoi…" : "Ajouter"}
        </button>
      </form>

      <p className="mt-2 text-xs text-foreground/60">
        Les photos sont réduites automatiquement avant l&rsquo;envoi — inutile de les préparer.
      </p>

      {etat && (
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
