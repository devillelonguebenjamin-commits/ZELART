"use client";

import { useState, useTransition } from "react";
import { commanderPressOn, type EtatCommande } from "@/actions/press-on";
import { formatPrix } from "@/lib/format";
import { grouperParCollection } from "@/lib/press-on";
import ChampInspiration from "@/components/ChampInspiration";
import GuideTailles from "@/components/GuideTailles";

export type ModelePublic = {
  id: string;
  nom: string;
  collection: string;
  description: string | null;
  prixCents: number;
  aPartirDe: boolean;
  surMesure: boolean;
  photoUrl: string | null;
};

// Formes et longueurs réellement proposées par Zélia. La liste sert de
// suggestions (`datalist`) et non de contrainte : le champ reste libre, une
// cliente peut donc toujours décrire autrement ce qu'elle veut.
const FORMES = ["Amande", "Arrondi", "Ballerine", "Carré", "Stiletto"];
const LONGUEURS = ["Courte", "Moyenne", "Longue"];

const CHAMPS_VIDES = {
  prenom: "",
  nom: "",
  email: "",
  telephone: "",
  adresse: "",
  forme: "",
  longueur: "",
  mesures: "",
};

type Champ = keyof typeof CHAMPS_VIDES;

const CLASSE_CHAMP =
  "mt-1 w-full rounded-xl border border-pink-200 bg-white px-4 py-2.5 outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500";

export default function FormulaireCommandePressOn({
  modeles,
  envoiImagesActif,
}: {
  modeles: ModelePublic[];
  envoiImagesActif: boolean;
}) {
  const [modeleId, setModeleId] = useState<string | null>(null);
  const [postal, setPostal] = useState(false);
  const [champs, setChamps] = useState(CHAMPS_VIDES);
  const [conditions, setConditions] = useState(false);
  const [offres, setOffres] = useState(false);
  const [enCours, demarrer] = useTransition();
  const [etat, setEtat] = useState<EtatCommande>({});

  const majChamp = (champ: Champ, valeur: string) =>
    setChamps((precedents) => ({ ...precedents, [champ]: valeur }));

  const collections = grouperParCollection(modeles);
  const modele = modeles.find((m) => m.id === modeleId) ?? null;

  // On envoie nous-mêmes plutôt que via `action={}` : React réinitialiserait
  // le formulaire à chaque refus, et la cliente perdrait ses coordonnées, son
  // set et jusqu'à sa case « conditions acceptées ».
  function envoyer(evenement: React.FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    const donnees = new FormData(evenement.currentTarget);
    demarrer(async () => setEtat(await commanderPressOn({}, donnees)));
  }

  return (
    <form onSubmit={envoyer} className="space-y-8">
      <section>
        <h2 className="font-display text-2xl font-bold">1. Choisissez votre set</h2>
        {collections.map((collection) => (
          <div key={collection.nom} className="mt-6">
            <h3 className="font-display text-lg font-bold text-pink-500">{collection.nom}</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {collection.modeles.map((m) => (
                <label
                  key={m.id}
                  className={`flex cursor-pointer gap-3 rounded-2xl border p-4 transition ${
                    modeleId === m.id
                      ? "border-pink-500 bg-pink-50 ring-1 ring-pink-500"
                      : "border-pink-100 bg-white hover:border-pink-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="modeleId"
                    value={m.id}
                    className="mt-1 accent-pink-500"
                    checked={modeleId === m.id}
                    onChange={() => setModeleId(m.id)}
                  />
                  {m.photoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.photoUrl}
                      alt={m.nom}
                      className="h-16 w-16 shrink-0 rounded-xl object-cover"
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="font-medium">{m.nom}</span>
                      <span className="shrink-0 whitespace-nowrap font-semibold text-pink-500">
                        {formatPrix(m.prixCents, m.aPartirDe)}
                      </span>
                    </span>
                    {m.description && (
                      <span className="mt-1 block text-sm text-foreground/60">{m.description}</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section>
        <h2 className="font-display text-2xl font-bold">2. Vos ongles</h2>
        <p className="mt-1 text-sm text-foreground/70">
          Zélia taille chaque capsule à votre main. Le guide ci-dessous vous explique comment
          mesurer vos ongles en deux minutes — et reporte vos mesures dans la commande.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium">Forme souhaitée</span>
            <input
              name="forme"
              list="formes-press-on"
              maxLength={60}
              placeholder="Ex. : amande"
              value={champs.forme}
              onChange={(e) => majChamp("forme", e.target.value)}
              className={CLASSE_CHAMP}
            />
            <datalist id="formes-press-on">
              {FORMES.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </label>
          <label className="block text-sm">
            <span className="font-medium">Longueur souhaitée</span>
            <input
              name="longueur"
              list="longueurs-press-on"
              maxLength={60}
              placeholder="Ex. : moyenne"
              value={champs.longueur}
              onChange={(e) => majChamp("longueur", e.target.value)}
              className={CLASSE_CHAMP}
            />
            <datalist id="longueurs-press-on">
              {LONGUEURS.map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
          </label>
        </div>
        <GuideTailles onReporter={(texte) => majChamp("mesures", texte)} />

        <label className="mt-4 block text-sm">
          <span className="font-medium">Mesures de vos ongles (facultatif)</span>
          <textarea
            name="mesures"
            rows={2}
            maxLength={300}
            placeholder="Ex. : pouce 15 mm, index 12 mm… ou « je ne les connais pas »"
            value={champs.mesures}
            onChange={(e) => majChamp("mesures", e.target.value)}
            className={CLASSE_CHAMP}
          />
        </label>
      </section>

      <section>
        <h2 className="font-display text-2xl font-bold">
          3. Votre design {modele?.surMesure ? "" : "(facultatif)"}
        </h2>
        <p className="mt-1 text-sm text-foreground/70">
          {modele?.surMesure
            ? "Votre set est dessiné pour vous : décrivez vos envies, joignez des photos qui vous plaisent."
            : "Une envie de variante sur ce modèle ? Dites-le ici."}
        </p>
        <ChampInspiration actif={envoiImagesActif} />
      </section>

      <section>
        <h2 className="font-display text-2xl font-bold">4. Comment recevoir votre set</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            {
              parPoste: false,
              titre: "En main propre",
              detail: "À Saint-Nazaire, directement ou par un proche. Réglable à la remise.",
            },
            {
              parPoste: true,
              titre: "Par la poste",
              detail: "Frais d'envoi à votre charge, annoncés avant validation.",
            },
          ].map((option) => (
            <label
              key={option.titre}
              className={`flex cursor-pointer gap-3 rounded-2xl border p-4 transition ${
                postal === option.parPoste
                  ? "border-pink-500 bg-pink-50 ring-1 ring-pink-500"
                  : "border-pink-100 bg-white hover:border-pink-300"
              }`}
            >
              <input
                type="radio"
                name="modeRemise"
                value={option.parPoste ? "POSTAL" : "MAIN_PROPRE"}
                className="mt-1 accent-pink-500"
                checked={postal === option.parPoste}
                onChange={() => setPostal(option.parPoste)}
              />
              <span>
                <span className="block font-medium">{option.titre}</span>
                <span className="mt-1 block text-sm text-foreground/60">{option.detail}</span>
              </span>
            </label>
          ))}
        </div>

        {postal && (
          <label className="mt-4 block text-sm">
            <span className="font-medium">Adresse de livraison</span>
            <textarea
              name="adresse"
              rows={3}
              maxLength={300}
              required
              placeholder={"Prénom Nom\n12 rue des Fleurs\n44600 Saint-Nazaire"}
              value={champs.adresse}
              onChange={(e) => majChamp("adresse", e.target.value)}
              className={CLASSE_CHAMP}
            />
            <span className="mt-1 block text-xs text-foreground/60">
              Zélia vous communique le montant des frais d&rsquo;envoi avant de lancer la
              fabrication.
            </span>
          </label>
        )}
      </section>

      <section>
        <h2 className="font-display text-2xl font-bold">5. Vos coordonnées</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {(
            [
              { champ: "prenom", label: "Prénom", type: "text", autoComplete: "given-name" },
              { champ: "nom", label: "Nom", type: "text", autoComplete: "family-name" },
              { champ: "email", label: "E-mail", type: "email", autoComplete: "email" },
              { champ: "telephone", label: "Téléphone", type: "tel", autoComplete: "tel" },
            ] as const
          ).map((c) => (
            <label key={c.champ} className="block text-sm">
              <span className="font-medium">{c.label}</span>
              <input
                name={c.champ}
                type={c.type}
                autoComplete={c.autoComplete}
                required
                value={champs[c.champ]}
                onChange={(e) => majChamp(c.champ, e.target.value)}
                className={CLASSE_CHAMP}
              />
            </label>
          ))}
        </div>

        <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="conditions"
            className="mt-1 accent-pink-500"
            checked={conditions}
            onChange={(e) => setConditions(e.target.checked)}
          />
          {/* Ce qui est réclamé d'avance dépend du mode de remise : tout pour
              un envoi, l'acompte seulement pour un retrait où le solde se règle
              au salon. Annoncer « paiement intégral » dans les deux cas serait
              faux, et c'est une case que la cliente coche en s'engageant. */}
          <span className="text-foreground/80">
            J&rsquo;ai lu et j&rsquo;accepte les conditions de vente des press-on : les sets étant
            personnalisés,{" "}
            {postal ? (
              <strong>le paiement intégral est demandé avant la fabrication</strong>
            ) : (
              <strong>
                un acompte est demandé avant la fabrication, le solde se réglant au salon à la
                remise
              </strong>
            )}{" "}
            et <strong>aucun retour ni remboursement</strong>
            {" n’est possible. En cas de défaut visible à la remise, un échange ou un ajustement m’est proposé."}
          </span>
        </label>

        <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="consentementMarketing"
            className="mt-1 accent-pink-500"
            checked={offres}
            onChange={(e) => setOffres(e.target.checked)}
          />
          <span className="text-foreground/80">
            J&rsquo;accepte de recevoir les offres et nouveautés de Zelart Nails par e-mail
            (facultatif, désinscription à tout moment).
          </span>
        </label>
      </section>

      {modele && (
        <div className="rounded-2xl border border-pink-200 bg-pink-50 p-5">
          <p className="font-display text-lg font-bold">Récapitulatif</p>
          <p className="mt-2 flex items-baseline justify-between gap-3 text-sm">
            <span>{modele.nom}</span>
            <span className="font-semibold text-pink-600">
              {formatPrix(modele.prixCents, modele.aPartirDe)}
            </span>
          </p>
          <p className="mt-1 text-sm text-foreground/70">
            {postal
              ? "+ frais d'envoi, chiffrés par Zélia avant la fabrication."
              : "Remise en main propre à Saint-Nazaire, sans frais."}
          </p>
        </div>
      )}

      {etat.erreur && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {etat.erreur}
        </p>
      )}

      <button
        type="submit"
        disabled={enCours || !modele}
        className="w-full rounded-full bg-pink-500 px-8 py-3 text-lg font-medium text-white shadow-md transition hover:bg-pink-600 disabled:opacity-50"
      >
        {enCours ? "Envoi…" : "Envoyer ma commande ✨"}
      </button>
      <p className="text-center text-xs text-foreground/60">
        Votre commande n&rsquo;est pas encore ferme : Zélia vous confirme le montant (et les frais
        d&rsquo;envoi le cas échéant) avant tout règlement.
      </p>
    </form>
  );
}
