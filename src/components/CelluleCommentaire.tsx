"use client";

import { useRef, useState, useTransition } from "react";
import { enregistrerCommentaire } from "@/actions/clientes";

type Props = { clienteId: string; valeur: string };

export default function CelluleCommentaire({ clienteId, valeur }: Props) {
  const [texte, setTexte] = useState(valeur);
  const [etat, setEtat] = useState<"repos" | "enregistre" | "erreur">("repos");
  const [enCours, demarrer] = useTransition();
  const dernierEnregistre = useRef(valeur);

  function enregistrer() {
    if (texte === dernierEnregistre.current) return;
    demarrer(async () => {
      try {
        await enregistrerCommentaire(clienteId, texte);
        dernierEnregistre.current = texte;
        setEtat("enregistre");
        setTimeout(() => setEtat("repos"), 2000);
      } catch {
        setEtat("erreur");
      }
    });
  }

  return (
    <div className="min-w-52">
      <textarea
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        onBlur={enregistrer}
        rows={2}
        maxLength={2000}
        placeholder="Ajouter un commentaire…"
        aria-label="Commentaire sur la cliente"
        className="w-full resize-y rounded-xl border border-transparent bg-pink-50/50 px-3 py-2 text-sm outline-none transition focus:border-pink-300 focus:bg-white"
      />
      <span className="block h-4 text-xs text-foreground/50">
        {enCours && "Enregistrement…"}
        {!enCours && etat === "enregistre" && <span className="text-emerald-700">Enregistré ✓</span>}
        {!enCours && etat === "erreur" && (
          <span className="text-red-600">Échec — réessayez</span>
        )}
      </span>
    </div>
  );
}
