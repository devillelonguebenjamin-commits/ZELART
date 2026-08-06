import type { Reseau } from "@/lib/parametres";

// Icônes dessinées ici : aucune requête externe, et le rendu reste net à toute
// taille. Toute plateforme non reconnue reçoit une icône de lien générique.
function Icone({ libelle }: { libelle: string }) {
  const commun = { width: 20, height: 20, viewBox: "0 0 24 24", "aria-hidden": true } as const;

  if (libelle === "Instagram") {
    return (
      <svg {...commun} fill="none" stroke="currentColor" strokeWidth={1.8}>
        <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
        <circle cx="12" cy="12" r="4.2" />
        <circle cx="17.6" cy="6.4" r="1.15" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (libelle === "TikTok") {
    return (
      <svg {...commun} fill="currentColor">
        <path d="M12.5 2h3.1c.2 1.4.9 2.7 2 3.6 1 .8 2.2 1.2 3.4 1.3v3.4c-1.4-.05-2.8-.4-4-1.1v6.4c0 1.3-.4 2.6-1.2 3.7a6.1 6.1 0 0 1-4.6 2.5 6 6 0 0 1-3.5-.9 6.2 6.2 0 0 1-2.9-4.6c-.05-.4-.05-.9 0-1.3a5.9 5.9 0 0 1 2.2-4 6 6 0 0 1 4.8-1.2v3.5a2.8 2.8 0 0 0-2.4.3 2.5 2.5 0 0 0-1.1 1.5c-.1.4-.1.8 0 1.2a2.7 2.7 0 0 0 2.8 2.1 2.7 2.7 0 0 0 2.2-1.3c.15-.25.25-.55.25-.85V2Z" />
      </svg>
    );
  }

  return (
    <svg {...commun} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <path d="M10.5 13.5a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.2 1.2" />
      <path d="M13.5 10.5a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.2-1.2" />
    </svg>
  );
}

export default function LiensReseaux({
  reseaux,
  variante = "discret",
}: {
  reseaux: Reseau[];
  variante?: "discret" | "boutons";
}) {
  if (reseaux.length === 0) return null;

  return (
    <ul className={`flex flex-wrap ${variante === "boutons" ? "gap-3" : "gap-x-4 gap-y-2"}`}>
      {reseaux.map((reseau) => (
        <li key={reseau.url}>
          <a
            href={reseau.url}
            target="_blank"
            rel="noreferrer noopener"
            className={
              variante === "boutons"
                ? "inline-flex items-center gap-2 rounded-full bg-pink-500 px-6 py-3 font-medium text-white shadow-sm transition hover:bg-pink-600"
                : "inline-flex items-center gap-1.5 transition hover:text-pink-500"
            }
          >
            <Icone libelle={reseau.libelle} />
            {reseau.libelle}
          </a>
        </li>
      ))}
    </ul>
  );
}
