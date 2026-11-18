"use client";

import { useEffect, useRef } from "react";

// Le montage de l'accueil : la première chose que voit une visiteuse.
//
// Lecture automatique, en boucle et sans le son : un téléphone refuse de
// lancer seule une vidéo sonore, et un son qui part tout seul fait fuir. Le
// fichier est un MP4 léger (H.264, sans piste audio, « faststart » pour qu'il
// démarre avant d'être entièrement chargé), et une image fixe s'affiche le
// temps qu'il arrive.
//
// Une visiteuse qui a demandé à limiter les animations garde l'image fixe : la
// vidéo est mise en pause dès l'affichage.

export default function VideoAccueil() {
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)");
    const appliquer = () => {
      if (reduit.matches) element.pause();
      else element.play().catch(() => {});
    };
    appliquer();
    reduit.addEventListener("change", appliquer);
    return () => reduit.removeEventListener("change", appliquer);
  }, []);

  return (
    <video
      ref={video}
      className="block aspect-[9/16] max-h-[78svh] w-full bg-pink-100 object-cover lg:h-[72vh] lg:max-h-[760px] lg:w-auto lg:rounded-[2rem] lg:shadow-xl lg:ring-1 lg:ring-pink-100"
      src="/videos/accueil.mp4"
      poster="/videos/accueil.jpg"
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-label="Quelques réalisations de Zélia au salon Zelart Nails"
    />
  );
}
