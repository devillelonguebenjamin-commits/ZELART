import Link from "next/link";
import type { IdTheme } from "@/lib/saison";
import { DecorHalloween } from "@/components/Halloween";
import { DecorNoel } from "@/components/Noel";
import { DecorSaintValentin } from "@/components/SaintValentin";
import { DecorPaques } from "@/components/Paques";

/** Le décor du haut de la page d'accueil, à poser dans une section `relative`. */
export function DecorSaison({ theme }: { theme: IdTheme }) {
  switch (theme) {
    case "halloween":
      return <DecorHalloween />;
    case "noel":
      return <DecorNoel />;
    case "saint-valentin":
      return <DecorSaintValentin />;
    case "paques":
      return <DecorPaques />;
  }
}

/** Le mot d'accueil remplace ✨ dans le titre de la page d'accueil. */
export const EMOJI_TITRE: Record<IdTheme, string> = {
  halloween: "🎃",
  noel: "🎄",
  "saint-valentin": "💕",
  paques: "🐣",
};

const BANDEAUX: Record<
  IdTheme,
  { fond: string; texte: string; lien: string; debut: string; fin: string; message: string }
> = {
  halloween: {
    fond: "bg-[#2e1065]",
    texte: "text-orange-100",
    lien: "text-orange-300",
    debut: "🎃",
    fin: "🦇",
    message: "Envie d’un nail art d’Halloween ? Citrouilles, toiles d’araignée, fantômes…",
  },
  noel: {
    fond: "bg-[#14532d]",
    texte: "text-emerald-50",
    lien: "text-amber-300",
    debut: "🎄",
    fin: "✨",
    message: "Des ongles de fête pour Noël ? Paillettes, sapins, flocons…",
  },
  "saint-valentin": {
    fond: "bg-[#9f1239]",
    texte: "text-rose-50",
    lien: "text-pink-200",
    debut: "💕",
    fin: "💌",
    message: "Pour la Saint-Valentin, des ongles qui ont du cœur : rouge, rose, petits cœurs…",
  },
  paques: {
    fond: "bg-[#6d28d9]",
    texte: "text-violet-50",
    lien: "text-amber-200",
    debut: "🐣",
    fin: "🌷",
    message: "Un nail art printanier pour Pâques ? Pastels, fleurs, petits œufs…",
  },
};

/** Bandeau du haut, sur toutes les pages, aux couleurs du thème. */
export function BandeauSaison({ theme }: { theme: IdTheme }) {
  const b = BANDEAUX[theme];
  return (
    <div className={`px-4 py-2 text-center text-sm ${b.fond} ${b.texte}`}>
      <span aria-hidden className="mr-2">
        {b.debut}
      </span>
      {b.message}{" "}
      <Link href="/reserver" className={`font-semibold underline-offset-2 hover:underline ${b.lien}`}>
        Décrivez votre idée en réservant
      </Link>
      <span aria-hidden className="ml-2">
        {b.fin}
      </span>
    </div>
  );
}
