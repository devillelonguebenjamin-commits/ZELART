"use client";

import { useActionState, useMemo, useState } from "react";
import { creerRendezVousManuel, type EtatRdvManuel } from "@/actions/rdv-manuel";
import { formatDuree, formatPrix, totalDuree, totalTarifs } from "@/lib/format";

export type ClienteConnue = { id: string; prenom: string; nom: string; telephone: string };
export type PrestationChoix = {
  id: string;
  nom: string;
  categorie: string;
  dureeMin: number;
  prixCents: number;
  aPartirDe: boolean;
};

// Saisie d'un rendez-vous pris de vive voix.
//
// Replié par défaut : l'agenda sert d'abord à consulter. Le formulaire ne
// s'ouvre que lorsqu'on en a besoin, et se referme après un enregistrement
// réussi pour rendre la vue au calendrier.
export default function FormulaireRdvManuel({
  clientes,
  prestations,
  dateParDefaut,
}: {
  clientes: ClienteConnue[];
  prestations: PrestationChoix[];
  dateParDefaut: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [nouvelle, setNouvelle] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [choisies, setChoisies] = useState<string[]>([]);
  const [etat, action, enCours] = useActionState<EtatRdvManuel, FormData>(
    creerRendezVousManuel,
    {}
  );

  const trouvees = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return clientes.slice(0, 8);
    return clientes
      .filter((c) => `${c.prenom} ${c.nom} ${c.telephone}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [clientes, recherche]);

  const retenues = prestations.filter((p) => choisies.includes(p.id));
  const total = totalTarifs(retenues);
  const choisie = clientes.find((c) => c.id === clienteId);

  function basculer(id: string) {
    setChoisies((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  if (!ouvert) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setOuvert(true)}
          className="rounded-full bg-pink-500 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-pink-600"
        >
          + Noter un rendez-vous
        </button>
        <span className="text-xs text-foreground/60">
          Pour les rendez-vous pris de vive voix, au salon ou par SMS.
        </span>
        {etat.ok && etat.message && (
          <span role="status" className="text-sm font-medium text-emerald-700">
            {etat.message}
          </span>
        )}
      </div>
    );
  }

  return (
    <form action={action} className="rounded-2xl border border-pink-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="font-display text-lg font-bold">Noter un rendez-vous</p>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          className="text-xs text-foreground/60 underline hover:text-pink-600"
        >
          Fermer
        </button>
      </div>
      <p className="mt-1 text-xs text-foreground/60">
        Il est enregistré <strong>confirmé</strong>, sans e-mail ni demande d&rsquo;acompte : vous
        étiez dans la conversation. Vos horaires d&rsquo;ouverture ne s&rsquo;appliquent pas ici.
      </p>

      {/* Cliente : connue ou nouvelle */}
      <div className="mt-4">
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            onClick={() => setNouvelle(false)}
            className={`rounded-full px-4 py-1.5 font-medium transition ${
              !nouvelle ? "bg-pink-500 text-white" : "border border-pink-200 text-pink-600"
            }`}
          >
            Cliente connue
          </button>
          <button
            type="button"
            onClick={() => setNouvelle(true)}
            className={`rounded-full px-4 py-1.5 font-medium transition ${
              nouvelle ? "bg-pink-500 text-white" : "border border-pink-200 text-pink-600"
            }`}
          >
            Nouvelle cliente
          </button>
        </div>

        {nouvelle ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium">Prénom *</span>
              <input name="prenom" required className={CHAMP} />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Nom *</span>
              <input name="nom" required className={CHAMP} />
            </label>
            <label className="block text-sm">
              <span className="font-medium">
                Téléphone <span className="text-foreground/50">(facultatif)</span>
              </span>
              <input name="telephone" type="tel" placeholder="06 12 34 56 78" className={CHAMP} />
            </label>
            <label className="block text-sm">
              <span className="font-medium">
                E-mail <span className="text-foreground/50">(facultatif)</span>
              </span>
              <input name="email" type="email" className={CHAMP} />
              <span className="mt-1 block text-xs text-foreground/60">
                Sans adresse, elle ne recevra ni rappel ni offre — c&rsquo;est prévu.
              </span>
            </label>
          </div>
        ) : (
          <div className="mt-3">
            <input type="hidden" name="clienteId" value={clienteId} />
            <input
              value={recherche}
              onChange={(e) => {
                setRecherche(e.target.value);
                setClienteId("");
              }}
              placeholder="Chercher un nom ou un numéro…"
              className={CHAMP}
            />
            {choisie ? (
              <p className="mt-2 text-sm">
                Sélectionnée :{" "}
                <strong>
                  {choisie.prenom} {choisie.nom}
                </strong>{" "}
                <button
                  type="button"
                  onClick={() => setClienteId("")}
                  className="ml-1 text-xs text-pink-600 underline"
                >
                  changer
                </button>
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {trouvees.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setClienteId(c.id)}
                    className="rounded-full border border-pink-200 px-3 py-1 text-xs transition hover:bg-pink-50"
                  >
                    {c.prenom} {c.nom}
                  </button>
                ))}
                {trouvees.length === 0 && (
                  <span className="text-xs text-foreground/60">
                    Personne ne correspond — passez par « Nouvelle cliente ».
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quand */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium">Date et heure *</span>
          <input
            type="datetime-local"
            name="debut"
            required
            defaultValue={dateParDefaut}
            className={CHAMP}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">
            Durée <span className="text-foreground/50">(minutes)</span>
          </span>
          <input
            type="number"
            name="dureeMin"
            min={15}
            max={600}
            step={15}
            defaultValue={60}
            disabled={retenues.length > 0}
            className={`${CHAMP} disabled:bg-pink-50 disabled:text-foreground/50`}
          />
          <span className="mt-1 block text-xs text-foreground/60">
            {retenues.length > 0
              ? `Calculée d'après les prestations : ${formatDuree(totalDuree(retenues))}.`
              : "Utilisée seulement si aucune prestation n'est cochée."}
          </span>
        </label>
      </div>

      {/* Quoi */}
      <fieldset className="mt-4">
        <legend className="text-sm font-medium">
          Prestations <span className="text-foreground/50">(facultatif)</span>
        </legend>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {prestations.map((p) => (
            <label
              key={p.id}
              className={`cursor-pointer rounded-full border px-3 py-1 text-xs transition ${
                choisies.includes(p.id)
                  ? "border-pink-500 bg-pink-50 text-pink-700"
                  : "border-pink-200 hover:bg-pink-50"
              }`}
            >
              <input
                type="checkbox"
                name="prestationIds"
                value={p.id}
                checked={choisies.includes(p.id)}
                onChange={() => basculer(p.id)}
                className="sr-only"
              />
              {p.nom}
            </label>
          ))}
        </div>
        {retenues.length > 0 && (
          <p className="mt-2 text-sm">
            Total :{" "}
            <strong className="text-pink-600">
              {formatPrix(total.prixCents, total.aPartirDe)}
            </strong>{" "}
            · {formatDuree(totalDuree(retenues))}
          </p>
        )}
      </fieldset>

      <label className="mt-4 block text-sm">
        <span className="font-medium">
          Note <span className="text-foreground/50">(facultatif)</span>
        </span>
        <textarea name="note" rows={2} maxLength={500} className={CHAMP} />
      </label>

      {etat.message && (
        <p
          role="status"
          className={`mt-4 rounded-xl px-4 py-2 text-sm ${
            etat.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
          }`}
        >
          {etat.message}
        </p>
      )}

      <button
        type="submit"
        disabled={enCours || (!nouvelle && !clienteId)}
        className="mt-4 rounded-full bg-pink-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {enCours ? "Enregistrement…" : "Enregistrer le rendez-vous"}
      </button>
    </form>
  );
}

const CHAMP =
  "mt-1 w-full rounded-xl border border-pink-200 bg-white px-3 py-2 text-sm outline-none focus:border-pink-500";
