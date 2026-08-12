import type { Prisma } from "@/generated/prisma/client";
import { nouveauCodeUnique } from "@/lib/cliente-auth";
import { sansEmail } from "@/lib/email";
import { champsTelephone, cleTelephone } from "@/lib/telephone";

// Retrouver la cliente derrière une demande, ou lui ouvrir une fiche.
//
// Un seul endroit décide, parce que le contraire s'est vu : la réservation et
// la commande de press-on faisaient chacune leur `upsert` sur l'e-mail, et une
// même personne pouvait exister deux fois selon la porte qu'elle poussait.
//
// L'ordre des reconnaissances suit leur degré de certitude :
//
//  1. **L'e-mail**, identifiant réel de la fiche. Aucune ambiguïté possible.
//  2. **Le numéro de téléphone**, mais seulement vers une fiche *sans adresse
//     réelle* — celles que Zélia crée en saisissant un rendez-vous pris de vive
//     voix. Cette fiche attendait précisément que sa cliente se connecte un
//     jour : on lui donne son adresse plutôt que d'en ouvrir une seconde.
//
// Ce que l'on ne fait **pas** : rapprocher deux fiches qui portent chacune une
// vraie adresse. Un foyer partage souvent une ligne, une mère réserve pour sa
// fille, et écraser l'adresse de l'une enfermerait l'autre dehors de son espace.
// Ces cas-là sont signalés à Zélia dans « Doublons », où elle tranche.

export type FicheRetenue = {
  id: string;
  prenom: string;
  email: string;
  codeParrainage: string;
  parraineParId: string | null;
};

export type Coordonnees = {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  /** « Comment m'avez-vous connue ? », posée à la première réservation. */
  provenance?: string | null;
};

type Db = Prisma.TransactionClient;

// Ce que les appelants ont besoin de connaître de la fiche retenue — pas la
// fiche entière : une sélection explicite dit ce dont le reste du code dépend.
const CHAMPS = {
  id: true,
  prenom: true,
  email: true,
  codeParrainage: true,
  parraineParId: true,
} as const;

export async function ficheCliente(
  db: Db,
  coordonnees: Coordonnees,
  accordMarketing: boolean
): Promise<FicheRetenue> {
  const champs = {
    prenom: coordonnees.prenom,
    nom: coordonnees.nom,
    ...champsTelephone(coordonnees.telephone),
  };
  // La provenance ne s'écrase jamais : elle raconte la **première** venue. Une
  // cliente qui réserve une deuxième fois répondrait « une amie » sans que ce
  // soit ce qui l'a amenée la première fois.
  const provenance = coordonnees.provenance || null;
  // Le consentement se donne, jamais ne se retire tout seul : une demande sans
  // la case cochée n'annule pas un accord antérieur.
  const consentement = accordMarketing
    ? { consentementMarketing: true, consentementLe: new Date(), desabonneLe: null }
    : {};

  const parEmail = await db.cliente.findUnique({
    where: { email: coordonnees.email },
    select: { id: true },
  });
  if (parEmail) {
    return db.cliente.update({
      where: { id: parEmail.id },
      data: { ...champs, ...consentement },
      select: CHAMPS,
    });
  }

  const cle = cleTelephone(coordonnees.telephone);
  if (cle) {
    const memeNumero = await db.cliente.findMany({
      where: { telephoneNormalise: cle },
      select: { id: true, email: true },
    });
    // Une seule candidate, et sans adresse réelle : c'est la fiche saisie à la
    // main qui attendait sa cliente. Plusieurs candidates, on s'abstient — le
    // silence vaut mieux qu'un rapprochement au hasard.
    const orpheline = memeNumero.filter((c) => sansEmail(c.email));
    if (memeNumero.length === 1 && orpheline.length === 1) {
      return db.cliente.update({
        where: { id: orpheline[0].id },
        data: {
          ...champs,
          email: coordonnees.email,
          ...consentement,
          ...(provenance ? { provenance } : {}),
        },
        select: CHAMPS,
      });
    }
  }

  return db.cliente.create({
    data: {
      ...champs,
      email: coordonnees.email,
      provenance,
      codeParrainage: await nouveauCodeUnique(db),
      consentementMarketing: accordMarketing,
      consentementLe: accordMarketing ? new Date() : null,
    },
    select: CHAMPS,
  });
}
