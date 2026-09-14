import Image from "next/image";

/** Taille réelle du fichier. Rien ne doit s'afficher plus grand. */
export const LOGO_SOURCE_PX = 150;

/**
 * Le logo de Zelart, tel que Zélia l'utilise sur ses réseaux.
 *
 * C'est une **vignette carrée de 150 px, fond zébré compris** : la version qui
 * existe, et la seule. Il n'y a pas de variante détourée, donc pas de lettrage
 * qu'on pourrait poser à même la page. D'où le parti pris de la pastille
 * ronde — le fond fait partie du logo, autant lui donner une forme nette
 * plutôt que de laisser un carré chargé cogner contre la navigation.
 *
 * 150 px de source pour 36 à 48 px d'affichage : la marge couvre les écrans à
 * haute densité sans rien agrandir. C'est la limite du fichier, et la raison
 * pour laquelle il ne sert nulle part en grand.
 *
 * Le fichier vit dans `public/` et nulle part ailleurs : les e-mails ont besoin
 * d'une URL publique, et une seconde copie importée finirait par diverger.
 */
export default function Logo({
  taille = 40,
  className = "",
}: {
  taille?: number;
  className?: string;
}) {
  return (
    <Image
      src="/logo-zelart.png"
      alt="Zelart Nails"
      width={taille}
      height={taille}
      // Le logo de l'en-tête est visible d'emblée : le charger en priorité
      // évite qu'il apparaisse après le reste.
      priority
      className={`rounded-full ring-1 ring-pink-200/70 ${className}`}
    />
  );
}
