"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { LONGUEUR_MAX, type MessagePublic } from "@/lib/messages-bornes";
import type { EtatMessage } from "@/actions/messages";

// Le fil, vu des deux côtés.
//
// Un seul composant plutôt qu'un par espace : ce sont les mêmes messages, et
// deux affichages finiraient par ne pas montrer la même chose. `cote` dit
// seulement de quel bord on regarde, ce qui décide du côté de l'alignement et
// de la couleur des bulles.

function heure(date: Date): string {
  return new Date(date).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
}

export default function Conversation({
  messages,
  cote,
  action,
  placeholder,
  ouvert = true,
  raisonFermeture,
}: {
  messages: MessagePublic[];
  /** Qui regarde : ses propres messages sont à droite, en rose. */
  cote: "cliente" | "zelia";
  action: (etat: EtatMessage, formData: FormData) => Promise<EtatMessage>;
  placeholder: string;
  /**
   * Faux, le fil se lit mais ne s'écrit pas.
   *
   * Sert au cas de la cliente sans rendez-vous confirmé : son historique reste
   * visible, ce qui vaut mieux que de faire disparaître une conversation dont
   * elle se souvient, mais la zone de saisie cède la place à une explication.
   */
  ouvert?: boolean;
  /** Ce qu'on répond quand le fil est fermé. */
  raisonFermeture?: string;
}) {
  const router = useRouter();
  const formulaire = useRef<HTMLFormElement>(null);
  const [etat, envoyer, enCours] = useActionState<EtatMessage, FormData>(action, {});

  useEffect(() => {
    if (etat.ok) {
      formulaire.current?.reset();
      router.refresh();
    }
  }, [etat, router]);

  return (
    <div>
      {messages.length > 0 && (
        <ul className="mb-4 space-y-3">
          {messages.map((message) => {
            const aMoi = (cote === "zelia") === message.deZelia;
            return (
              <li key={message.id} className={aMoi ? "flex justify-end" : "flex justify-start"}>
                <div className="max-w-[85%]">
                  <div
                    className={`whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm ${
                      aMoi
                        ? "rounded-br-sm bg-pink-500 text-white"
                        : "rounded-bl-sm bg-pink-50 text-foreground"
                    }`}
                  >
                    {message.texte}
                  </div>
                  <p
                    className={`mt-1 text-[11px] text-foreground/45 ${
                      aMoi ? "text-right" : "text-left"
                    }`}
                  >
                    {heure(message.creeLe)}
                    {/* L'accusé de lecture ne s'affiche que sur ses propres
                        messages : savoir si l'autre a lu est utile, savoir si
                        l'on a lu ce qu'on a sous les yeux ne l'est pas. */}
                    {aMoi && (message.luLe ? " · lu" : " · non lu")}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!ouvert && (
        <p className="rounded-2xl bg-pink-50/70 px-4 py-3 text-sm text-foreground/70">
          {raisonFermeture}
        </p>
      )}

      {ouvert && (
      <form ref={formulaire} action={envoyer}>
        <label className="block">
          <span className="sr-only">Votre message</span>
          <textarea
            name="texte"
            rows={3}
            required
            maxLength={LONGUEUR_MAX}
            placeholder={placeholder}
            className="w-full rounded-xl border border-pink-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
          />
        </label>

        {etat.message && (
          <p
            role="status"
            className={`mt-2 rounded-xl px-4 py-2 text-sm ${
              etat.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-700"
            }`}
          >
            {etat.message}
          </p>
        )}

        <button
          type="submit"
          disabled={enCours}
          className="mt-2 rounded-full bg-pink-500 px-6 py-2 text-sm font-medium text-white transition hover:bg-pink-600 disabled:opacity-60"
        >
          {enCours ? "Envoi…" : "Envoyer"}
        </button>
      </form>
      )}
    </div>
  );
}
