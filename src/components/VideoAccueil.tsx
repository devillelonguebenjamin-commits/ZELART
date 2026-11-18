"use client";

import { useEffect, useRef } from "react";

// Le montage de l'accueil : la première chose que voit une visiteuse.
//
// Lecture automatique, en boucle et sans le son : un téléphone refuse de
// lancer seule une vidéo sonore. Le fichier est un MP4 léger (H.264, sans piste
// audio, « faststart » pour qu'il démarre avant d'être entièrement chargé), et
// une image fixe s'affiche le temps qu'il arrive.
//
// Trois précautions pour qu'elle démarre vraiment toute seule :
//   - « muted » est posé aussi en attribut et en propriété : React ne l'écrit
//     pas toujours dans le HTML, et Safari bloque alors la lecture automatique
//     d'une vidéo qu'il croit sonore ;
//   - si le téléphone refuse quand même (mode économie d'énergie d'un iPhone,
//     par exemple), la lecture repart au premier geste de la visiteuse — un
//     défilement, un toucher — sans qu'elle ait à viser la vidéo ;
//   - le bouton de lecture que Safari superpose est masqué : il donnait
//     l'impression qu'il fallait appuyer.

export default function VideoAccueil() {
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    element.muted = true;
    element.defaultMuted = true;
    element.setAttribute("muted", "");
    element.setAttribute("playsinline", "");

    const evenements = ["touchstart", "pointerdown", "scroll", "keydown"] as const;
    const relancer = () => {
      element.play().then(retirer).catch(() => {});
    };
    function retirer() {
      for (const e of evenements) window.removeEventListener(e, relancer);
    }

    element.play().catch(() => {
      for (const e of evenements) window.addEventListener(e, relancer, { passive: true });
    });
    return retirer;
  }, []);

  return (
    <>
      <style>{`.video-accueil::-webkit-media-controls-start-playback-button { display: none !important; -webkit-appearance: none; }
.video-accueil::-webkit-media-controls { display: none !important; }`}</style>
      <video
        ref={video}
        className="video-accueil block aspect-[9/16] max-h-[78svh] w-full bg-pink-100 object-cover lg:h-[72vh] lg:max-h-[760px] lg:w-auto lg:rounded-[2rem] lg:shadow-xl lg:ring-1 lg:ring-pink-100"
        src="/videos/accueil.mp4"
        poster="/videos/accueil.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        disablePictureInPicture
        disableRemotePlayback
        aria-label="Quelques réalisations de Zélia au salon Zelart Nails"
      />
    </>
  );
}
