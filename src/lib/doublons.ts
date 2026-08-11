import { prisma } from "@/lib/prisma";
import { sansEmail } from "@/lib/email";

// Les fiches qui désignent probablement la même personne.
//
// Deux indices, du plus fiable au moins fiable :
//   - le **même numéro de téléphone** : c'est la trace du parcours mixte (une
//     fiche saisie de vive voix, une autre créée en ligne) ;
//   - les **mêmes nom et prénom** : plus faible, mais c'est le seul indice qui
//     reste quand un numéro a été saisi de deux façons différentes, ou quand
//     l'une des deux fiches n'en porte aucun.
//
// Rien n'est fusionné tout seul. Un homonyme existe, un foyer partage une
// ligne : la décision revient à Zélia, qui reconnaît ses clientes. L'écran ne
// fait que lui poser la question.

export type FicheDoublon = {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  sansAdresseReelle: boolean;
  creeLe: Date;
  rendezVous: number;
  commandes: number;
  aUnEspace: boolean;
};

export type GroupeDoublon = {
  cle: string;
  motif: "telephone" | "nom";
  fiches: FicheDoublon[];
};

function normaliserNom(prenom: string, nom: string): string {
  return `${prenom} ${nom}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z]/g, "");
}

export async function groupesDoublons(): Promise<GroupeDoublon[]> {
  const clientes = await prisma.cliente.findMany({
    orderBy: { creeLe: "asc" },
    select: {
      id: true,
      prenom: true,
      nom: true,
      email: true,
      telephone: true,
      telephoneNormalise: true,
      motDePasseHash: true,
      creeLe: true,
      _count: { select: { rendezVous: true, commandes: true } },
    },
  });

  const fiche = (c: (typeof clientes)[number]): FicheDoublon => ({
    id: c.id,
    prenom: c.prenom,
    nom: c.nom,
    email: c.email,
    telephone: c.telephone,
    sansAdresseReelle: sansEmail(c.email),
    creeLe: c.creeLe,
    rendezVous: c._count.rendezVous,
    commandes: c._count.commandes,
    aUnEspace: Boolean(c.motDePasseHash),
  });

  const parTelephone = new Map<string, typeof clientes>();
  for (const c of clientes) {
    if (!c.telephoneNormalise) continue;
    const groupe = parTelephone.get(c.telephoneNormalise);
    if (groupe) groupe.push(c);
    else parTelephone.set(c.telephoneNormalise, [c]);
  }

  const groupes: GroupeDoublon[] = [];
  const deja = new Set<string>();
  for (const [cle, membres] of parTelephone) {
    if (membres.length < 2) continue;
    groupes.push({ cle, motif: "telephone", fiches: membres.map(fiche) });
    for (const m of membres) deja.add(m.id);
  }

  // Le rapprochement par nom ne rejoue pas ce que le numéro a déjà trouvé :
  // une même paire signalée deux fois se fusionnerait deux fois.
  const parNom = new Map<string, typeof clientes>();
  for (const c of clientes) {
    if (deja.has(c.id)) continue;
    const cle = normaliserNom(c.prenom, c.nom);
    if (!cle) continue;
    const groupe = parNom.get(cle);
    if (groupe) groupe.push(c);
    else parNom.set(cle, [c]);
  }
  for (const [cle, membres] of parNom) {
    if (membres.length < 2) continue;
    groupes.push({ cle, motif: "nom", fiches: membres.map(fiche) });
  }

  return groupes;
}
