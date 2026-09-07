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
  const [quand, setQuand] = useState(dateParDefaut);
  // Prix réellement facturés, saisis seulement quand ils s'écartent du tarif.
  const [prix, setPrix] = useState<Record<string, string>>({});
  const [dejaVenue, setDejaVenue] = useState(true);
  const [etat, action, enCours] = useActionState<EtatRdvManuel, FormData>(
    creerRendezVousManuel,
    {}
  );

  // Une date passée change la nature de la saisie : ce n'est plus un
  // rendez-vous à venir, c'est une visite qui a eu lieu. Le formulaire le
  // reconnaît lui-même plutôt que de le demander.
  const passee = useMemo(() => {
    const saisie = new Date(quand);
    return Number.isFinite(saisie.getTime()) && saisie.getTime() < Date.now();
  }, [quand]);

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

  // Total réellement facturé : le tarif du catalogue sauf là où Zélia a écrit
  // autre chose. Un « à partir de » cesse d'être un plancher dès qu'elle a
  // renseigné le montant convenu.
  const totalFacture = retenues.reduce((somme, p) => {
    const saisi = Number((prix[p.id] ?? "").replace(",", "."));
    return somme + (Number.isFinite(saisi) && prix[p.id]?.trim() ? Math.round(saisi * 100) : p.prixCents);
  }, 0);
  const tousChiffres = retenues.every((p) => !p.aPartirDe || prix[p.id]?.trim());

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
                Sans adresse, elle ne recevra ni rappel ni offre, c&rsquo;est prévu.
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
                    Personne ne correspond. Passez par « Nouvelle cliente ».
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
            value={quand}
            onChange={(e) => setQuand(e.target.value)}
            className={CHAMP}
          />
          {passee && (
            <span className="mt-1 block text-xs text-foreground/60">
              Date passée : vous notez une visite déjà faite.
            </span>
          )}
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
          <div className="mt-3 rounded-xl border border-pink-100 bg-pink-50/50 p-3">
            <p className="text-xs font-medium text-foreground/70">
              Prix réellement facturé{" "}
              <span className="font-normal text-foreground/55">
                (laissez vide pour appliquer le tarif)
              </span>
            </p>
            <div className="mt-2 space-y-1.5">
              {retenues.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="min-w-40 flex-1">{p.nom}</span>
                  <span className="text-xs text-foreground/55">
                    tarif {formatPrix(p.prixCents, p.aPartirDe)}
                  </span>
                  <span className="flex items-center gap-1">
                    <input
                      type="text"
                      inputMode="decimal"
                      name={`prix_${p.id}`}
                      value={prix[p.id] ?? ""}
                      onChange={(e) => setPrix((v) => ({ ...v, [p.id]: e.target.value }))}
                      placeholder={(p.prixCents / 100).toFixed(2).replace(".", ",")}
                      aria-label={`Prix facturé pour ${p.nom}, en euros`}
                      className="w-24 rounded-lg border border-pink-200 bg-white px-2 py-1 text-right text-sm tabular-nums outline-none focus:border-pink-500"
                    />
                    <span className="text-xs text-foreground/60">€</span>
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 border-t border-pink-100 pt-2 text-sm">
              Total :{" "}
              <strong className="text-pink-600">
                {formatPrix(totalFacture, total.aPartirDe && !tousChiffres)}
              </strong>{" "}
              · {formatDuree(totalDuree(retenues))}
            </p>
            {total.aPartirDe && !tousChiffres && (
              <p className="mt-1 text-xs text-amber-800">
                Une prestation est tarifée « à partir de » : sans le montant convenu, elle comptera
                pour son minimum dans vos chiffres.
              </p>
            )}
          </div>
        )}
      </fieldset>

      {passee && (
        <fieldset className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
          <legend className="px-1 text-sm font-medium text-emerald-900">Visite déjà faite</legend>
          <label className="flex items-start gap-2 text-sm text-emerald-900">
            <input
              type="checkbox"
              name="dejaVenue"
              value="oui"
              checked={dejaVenue}
              onChange={(e) => setDejaVenue(e.target.checked)}
              className="mt-1 size-4 accent-emerald-600"
            />
            <span>
              La cliente est bien venue. Le rendez-vous est enregistré <strong>terminé</strong> et
              compte dans vos chiffres, sans qu&rsquo;aucun e-mail ne parte.
            </span>
          </label>
          {dejaVenue && (
            <label className="mt-3 block text-sm">
              <span className="font-medium text-emerald-900">
                Ce qui a été fait <span className="font-normal text-emerald-900/60">(facultatif)</span>
              </span>
              <textarea
                name="commentaireVisite"
                rows={2}
                maxLength={1000}
                placeholder="Couleur, forme, longueur, ce qu’elle a aimé, ce qu’il faudra prévoir…"
                className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
              <span className="mt-1 block text-xs text-emerald-900/70">
                Ce détail se retrouve sur sa fiche, à côté de l&rsquo;historique de ses poses.
              </span>
            </label>
          )}
        </fieldset>
      )}

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
