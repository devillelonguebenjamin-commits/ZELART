"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { compresserImage } from "@/lib/image-client";
import { retirerPhotoModelePressOn } from "@/actions/admin-press-on";

// La vignette d'un modèle, cliquable pour la remplacer.
//
// Pas de formulaire séparé : la photo se change là où le set est déjà listé,
// d'un seul clic sur l'image. Le champ de fichier est masqué derrière le
// visuel, qui sert de bouton — c'est le geste attendu quand on voit une photo
// à changer.

export default function PhotoModelePressOn({
  modeleId,
  nom,
  photoUrl,
}: {
  modeleId: string;
  nom: string;
  photoUrl: string | null;
}) {
  const router = useRouter();
  const champ = useRef<HTMLInputElement>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function choisir(fichier: File) {
    if (!fichier.type.startsWith("image/")) {
      setErreur("Ce fichier n'est pas une image.");
      return;
    }
    setEnCours(true);
    setErreur(null);
    try {
      const image = await compresserImage(fichier);
      const envoi = new FormData();
      envoi.append("modeleId", modeleId);
      envoi.append("fichier", image, fichier.name);

      const reponse = await fetch("/api/press-on/modeles/photo", { method: "POST", body: envoi });
      if (!reponse.ok) {
        const { error } = (await reponse.json().catch(() => ({}))) as { error?: string };
        throw new Error(error ?? `Erreur ${reponse.status}`);
      }
      router.refresh();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setEnCours(false);
      if (champ.current) champ.current.value = "";
    }
  }

  return (
    <span className="flex flex-col items-center">
      <button
        type="button"
        onClick={() => champ.current?.click()}
        disabled={enCours}
        title={photoUrl ? "Changer la photo" : "Ajouter une photo"}
        className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-pink-200 bg-pink-50 text-xs text-pink-600 transition hover:border-pink-400 disabled:opacity-50"
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={nom} className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center">photo</span>
        )}
        {enCours && (
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

      {photoUrl && (
        <button
          type="submit"
          formAction={retirerPhotoModelePressOn.bind(null, modeleId)}
          className="mt-1 text-[11px] text-pink-600 hover:underline"
        >
          retirer
        </button>
      )}

      {erreur && <span className="mt-1 max-w-28 text-[11px] text-red-600">{erreur}</span>}
    </span>
  );
}
