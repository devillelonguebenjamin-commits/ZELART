"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { compresserImage } from "@/lib/image-client";
import {
  enregistrerTexteNiveau,
  retirerPhotoNiveau,
  type EtatNiveau,
} from "@/actions/nail-art";
import type { NiveauExplique } from "@/lib/nail-art";

// Une carte par niveau : la photo que verront les clientes, et les mots de
// Zélia. Le champ est pré-rempli avec la formulation en vigueur — la sienne si
// elle en a écrit une, celle par défaut sinon — pour qu'elle corrige plutôt
// qu'elle ne reparte de rien.

export default function ReglagesNiveauNailArt({ niveau }: { niveau: NiveauExplique }) {
  const router = useRouter();
  const champ = useRef<HTMLInputElement>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [etat, action, enCours] = useActionState<EtatNiveau, FormData>(
    enregistrerTexteNiveau.bind(null, niveau.niveau),
    {}
  );

  async function choisir(fichier: File) {
    if (!fichier.type.startsWith("image/")) {
      setErreur("Ce fichier n'est pas une image.");
      return;
    }
    setEnvoi(true);
    setErreur(null);
    try {
      const image = await compresserImage(fichier);
      const donnees = new FormData();
      donnees.append("niveau", String(niveau.niveau));
      donnees.append("fichier", image, fichier.name);
      const reponse = await fetch("/api/nail-art/photo", { method: "POST", body: donnees });
      if (!reponse.ok) {
        const { error } = (await reponse.json().catch(() => ({}))) as { error?: string };
        throw new Error(error ?? `Erreur ${reponse.status}`);
      }
      router.refresh();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setEnvoi(false);
      if (champ.current) champ.current.value = "";
    }
  }

  return (
    <div className="rounded-2xl border border-pink-100 bg-white p-4">
      <p className="font-semibold">
        Niveau {niveau.niveau}
        <span className="ml-2 text-sm font-normal text-foreground/50">{niveau.titre}</span>
      </p>

      <button
        type="button"
        onClick={() => champ.current?.click()}
        disabled={envoi}
        className="relative mt-3 aspect-square w-full overflow-hidden rounded-xl border border-pink-200 bg-pink-50 text-sm text-pink-600 transition hover:border-pink-400 disabled:opacity-50"
      >
        {niveau.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={niveau.photoUrl}
            alt={`Exemple de nail art niveau ${niveau.niveau}`}
            className="size-full object-cover"
          />
        ) : (
          <span className="flex size-full items-center justify-center px-3 text-center">
            Ajouter une photo d&rsquo;exemple
          </span>
        )}
        {envoi && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/80">…</span>
        )}
      </button>
      <input
        ref={champ}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const fichier = e.target.files?.[0];
          if (fichier) void choisir(fichier);
        }}
      />
      {niveau.photoUrl && (
        <form action={retirerPhotoNiveau.bind(null, niveau.niveau)} className="mt-1 text-right">
          <button type="submit" className="text-xs text-pink-600 hover:underline">
            retirer la photo
          </button>
        </form>
      )}
      {erreur && <p className="mt-1 text-xs text-red-600">{erreur}</p>}

      <form action={action} className="mt-3">
        <label className="block text-sm">
          <span className="text-foreground/70">Ce que les clientes liront</span>
          <textarea
            name="texte"
            rows={5}
            maxLength={400}
            defaultValue={niveau.texte}
            className="mt-1 w-full rounded-xl border border-pink-200 px-3 py-2 text-sm outline-none focus:border-pink-500"
          />
        </label>
        <div className="mt-2 flex items-center justify-between gap-3">
          <button
            type="submit"
            disabled={enCours}
            className="rounded-full bg-pink-500 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-pink-600 disabled:opacity-50"
          >
            {enCours ? "Enregistrement…" : "Enregistrer"}
          </button>
          {etat.message && (
            <span className={`text-xs ${etat.ok ? "text-green-700" : "text-red-600"}`}>
              {etat.message}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
