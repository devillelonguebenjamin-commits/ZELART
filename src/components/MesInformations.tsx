"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  demanderChangementEmail,
  enregistrerMesInformations,
  type EtatInformations,
} from "@/actions/espace-cliente";

const CLASSE_CHAMP =
  "mt-1 w-full rounded-xl border border-pink-200 bg-white px-4 py-2.5 outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500";

function Message({ etat }: { etat: EtatInformations }) {
  if (!etat.message) return null;
  return (
    <p
      role="status"
      className={`mt-3 rounded-xl px-4 py-2.5 text-sm ${
        etat.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
      }`}
    >
      {etat.message}
    </p>
  );
}

export default function MesInformations({
  prenom,
  nom,
  telephone,
  email,
}: {
  prenom: string;
  nom: string;
  telephone: string;
  email: string;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [changerEmail, setChangerEmail] = useState(false);
  const [coordonnees, actionCoordonnees, enregistrement] = useActionState<
    EtatInformations,
    FormData
  >(enregistrerMesInformations, {});
  const [changement, actionEmail, envoiEnCours] = useActionState<EtatInformations, FormData>(
    demanderChangementEmail,
    {}
  );

  // Les champs modifiés doivent réapparaître partout : entête, historique…
  useEffect(() => {
    if (coordonnees.ok) router.refresh();
  }, [coordonnees, router]);

  return (
    <section className="rounded-2xl border border-pink-100 bg-white p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-semibold">Mes informations</h2>
        <button
          type="button"
          onClick={() => setOuvert((o) => !o)}
          className="text-sm text-pink-600 hover:underline"
        >
          {ouvert ? "Fermer" : "Modifier"}
        </button>
      </div>

      {!ouvert ? (
        <p className="mt-2 text-sm text-foreground/70">
          {prenom} {nom} · {telephone}
          <br />
          {email}
        </p>
      ) : (
        <>
          <form action={actionCoordonnees} className="mt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  { champ: "prenom", label: "Prénom", defaut: prenom, type: "text", auto: "given-name" },
                  { champ: "nom", label: "Nom", defaut: nom, type: "text", auto: "family-name" },
                  { champ: "telephone", label: "Téléphone", defaut: telephone, type: "tel", auto: "tel" },
                ] as const
              ).map((c) => (
                <label key={c.champ} className="block text-sm">
                  <span className="font-medium">{c.label}</span>
                  <input
                    name={c.champ}
                    type={c.type}
                    autoComplete={c.auto}
                    defaultValue={c.defaut}
                    required
                    className={CLASSE_CHAMP}
                  />
                </label>
              ))}
            </div>
            <button
              type="submit"
              disabled={enregistrement}
              className="mt-4 rounded-full bg-pink-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-pink-600 disabled:opacity-50"
            >
              {enregistrement ? "Enregistrement…" : "Enregistrer"}
            </button>
            <Message etat={coordonnees} />
          </form>

          <div className="mt-6 border-t border-pink-100 pt-5">
            <p className="text-sm font-medium">Adresse e-mail</p>
            <p className="mt-1 text-sm text-foreground/70">
              {email}
              {" — c’est elle qui reçoit vos confirmations et vos liens de connexion."}
            </p>

            {!changerEmail ? (
              <button
                type="button"
                onClick={() => setChangerEmail(true)}
                className="mt-3 text-sm text-pink-600 hover:underline"
              >
                Changer d&rsquo;adresse
              </button>
            ) : (
              <form action={actionEmail} className="mt-3">
                <label className="block text-sm">
                  <span className="font-medium">Nouvelle adresse</span>
                  <input
                    name="nouvelEmail"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="nouvelle@adresse.fr"
                    className={CLASSE_CHAMP}
                  />
                </label>
                <p className="mt-2 text-xs text-foreground/60">
                  Vous recevrez un lien de confirmation à cette nouvelle adresse. Tant que vous
                  n&rsquo;avez pas cliqué, rien ne change.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={envoiEnCours}
                    className="rounded-full bg-pink-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-pink-600 disabled:opacity-50"
                  >
                    {envoiEnCours ? "Envoi…" : "Envoyer le lien"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setChangerEmail(false)}
                    className="rounded-full border border-pink-200 px-6 py-2.5 text-sm text-pink-600 transition hover:bg-pink-50"
                  >
                    Annuler
                  </button>
                </div>
                <Message etat={changement} />
              </form>
            )}
          </div>
        </>
      )}
    </section>
  );
}
