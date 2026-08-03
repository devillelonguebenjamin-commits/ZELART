"use client";

import { useState } from "react";
import { compresserImage } from "@/lib/image-client";

const MAX_IMAGES = 3;

type Image = { url: string; apercu: string };

export default function ChampInspiration({ actif }: { actif: boolean }) {
  const [images, setImages] = useState<Image[]>([]);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function ajouter(event: React.ChangeEvent<HTMLInputElement>) {
    const choisis = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (choisis.length === 0) return;

    const place = MAX_IMAGES - images.length;
    if (place <= 0) {
      setErreur(`${MAX_IMAGES} images au maximum.`);
      return;
    }

    setEnCours(true);
    setErreur(null);
    try {
      const envoi = new FormData();
      for (const fichier of choisis.slice(0, place)) {
        envoi.append("fichiers", await compresserImage(fichier), fichier.name);
      }

      const reponse = await fetch("/api/inspirations/upload", { method: "POST", body: envoi });
      const resultat = (await reponse.json()) as { urls?: string[]; error?: string };
      if (!reponse.ok || !resultat.urls) {
        throw new Error(resultat.error ?? `Erreur ${reponse.status}`);
      }

      setImages((precedentes) => [
        ...precedentes,
        ...resultat.urls!.map((url) => ({ url, apercu: url })),
      ]);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-pink-100 bg-pink-50/50 p-5">
      <h3 className="font-display text-lg font-bold">Votre inspiration 💅</h3>
      <p className="mt-1 text-sm text-foreground/70">
        Décrivez vos envies — couleurs, formes, ambiance — et joignez si vous le souhaitez des photos
        qui vous plaisent. Zélia prépare ainsi votre rendez-vous à l&rsquo;avance.
      </p>

      <textarea
        name="inspiration"
        rows={3}
        maxLength={1000}
        placeholder="Ex. : des tons nude avec un peu de chrome, forme amande, plutôt discret…"
        className="mt-3 w-full rounded-xl border border-pink-200 bg-white px-4 py-2.5 outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
      />

      {actif && (
        <div className="mt-3">
          {images.map((image) => (
            <input key={image.url} type="hidden" name="inspirationImages" value={image.url} />
          ))}

          {images.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {images.map((image) => (
                <div key={image.url} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.apercu}
                    alt="Inspiration"
                    className="h-20 w-20 rounded-xl border border-pink-200 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setImages((p) => p.filter((i) => i.url !== image.url))}
                    aria-label="Retirer cette image"
                    className="absolute -right-1.5 -top-1.5 h-6 w-6 rounded-full border border-pink-200 bg-white text-xs text-pink-600 shadow-sm"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {images.length < MAX_IMAGES && (
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-pink-300 bg-white px-4 py-2 text-sm font-medium text-pink-600 transition hover:bg-pink-50">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={ajouter}
                disabled={enCours}
                className="hidden"
              />
              {enCours ? "Envoi en cours…" : "📷 Ajouter une photo d'inspiration"}
            </label>
          )}

          <p className="mt-2 text-xs text-foreground/60">
            {images.length}/{MAX_IMAGES} image{images.length > 1 ? "s" : ""} · les photos sont
            réduites automatiquement.
          </p>

          {erreur && (
            <p role="alert" className="mt-2 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">
              {erreur}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
