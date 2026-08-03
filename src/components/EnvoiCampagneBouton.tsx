"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { campagneId: string; nombreDestinataires: number };

export default function EnvoiCampagneBouton({ campagneId, nombreDestinataires }: Props) {
  const router = useRouter();
  const [confirme, setConfirme] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [progression, setProgression] = useState({ envoyes: 0, echecs: 0 });
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);

  async function envoyer() {
    setEnCours(true);
    setMessage(null);
    let envoyes = 0;
    let echecs = 0;

    try {
      for (;;) {
        const reponse = await fetch("/api/campagnes/envoyer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campagneId }),
        });
        if (!reponse.ok) {
          const { error } = (await reponse.json().catch(() => ({}))) as { error?: string };
          throw new Error(error ?? `Erreur ${reponse.status}`);
        }
        const lot = (await reponse.json()) as {
          restant: number;
          envoyes: number;
          echecs: number;
          termine: boolean;
        };
        envoyes += lot.envoyes;
        echecs += lot.echecs;
        setProgression({ envoyes, echecs });
        if (lot.termine) break;
      }

      setMessage({
        ok: echecs === 0,
        texte:
          echecs === 0
            ? `Campagne envoyée à ${envoyes} cliente${envoyes > 1 ? "s" : ""} ✨`
            : `${envoyes} envoi(s) réussi(s), ${echecs} en échec — le détail est listé ci-dessous.`,
      });
      router.refresh();
    } catch (erreur) {
      const texte = erreur instanceof Error ? erreur.message : String(erreur);
      setMessage({ ok: false, texte: `Envoi interrompu : ${texte}` });
      router.refresh();
    } finally {
      setEnCours(false);
    }
  }

  if (nombreDestinataires === 0) {
    return (
      <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Aucune destinataire dans ce groupe pour l&rsquo;instant. Seules les clientes ayant accepté de
        recevoir vos offres peuvent être contactées.
      </p>
    );
  }

  return (
    <div>
      {!confirme ? (
        <button
          type="button"
          onClick={() => setConfirme(true)}
          className="rounded-full bg-pink-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-pink-600"
        >
          Envoyer la campagne…
        </button>
      ) : (
        <div className="rounded-2xl border border-pink-200 bg-pink-50 px-5 py-4">
          <p className="text-sm font-semibold">
            Envoyer ce message à {nombreDestinataires} cliente
            {nombreDestinataires > 1 ? "s" : ""} ?
          </p>
          <p className="mt-1 text-xs text-foreground/70">
            L&rsquo;envoi est définitif : un e-mail parti ne peut pas être rappelé. Pensez à vous
            envoyer un test avant.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={envoyer}
              disabled={enCours}
              className="rounded-full bg-pink-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-pink-600 disabled:opacity-50"
            >
              {enCours
                ? `Envoi… ${progression.envoyes}/${nombreDestinataires}`
                : "Oui, envoyer maintenant"}
            </button>
            <button
              type="button"
              onClick={() => setConfirme(false)}
              disabled={enCours}
              className="rounded-full border border-pink-200 px-5 py-2.5 text-sm text-pink-600 transition hover:bg-white disabled:opacity-50"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {message && (
        <p
          role="status"
          className={`mt-3 rounded-xl px-4 py-3 text-sm ${
            message.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
          }`}
        >
          {message.texte}
        </p>
      )}
    </div>
  );
}
