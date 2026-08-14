import { prisma } from "@/lib/prisma";
import { sansEmail } from "@/lib/email";

// La fusion elle-même, séparée de l'action qui l'appelle : celle-ci s'occupe de
// l'authentification et du message rendu à Zélia, celle-là du contenu — ce qui
// la rend vérifiable sans session.
//
// Tout se joue dans une transaction : une fusion à moitié faite laisserait des
// rendez-vous rattachés à une fiche supprimée.

export type ResumeFusion = {
  nom: string;
  rdv: number;
  commandes: number;
  filleules: number;
  adresseReprise: boolean;
};

export async function fusionner(gardeeId: string, absorbeeId: string): Promise<ResumeFusion> {
  return prisma.$transaction(async (tx) => {
    const gardee = await tx.cliente.findUnique({ where: { id: gardeeId } });
    const absorbee = await tx.cliente.findUnique({ where: { id: absorbeeId } });
    if (!gardee || !absorbee) throw new Error("INTROUVABLE");

    // Tables sans contrainte croisée : un simple rattachement suffit.
    const rdv = await tx.rendezVous.updateMany({
      where: { clienteId: absorbeeId },
      data: { clienteId: gardeeId },
    });
    const commandes = await tx.commandePressOn.updateMany({
      where: { clienteId: absorbeeId },
      data: { clienteId: gardeeId },
    });
    await tx.recompense.updateMany({
      where: { clienteId: absorbeeId },
      data: { clienteId: gardeeId },
    });
    await tx.changementEmail.updateMany({
      where: { clienteId: absorbeeId },
      data: { clienteId: gardeeId },
    });
    // Les liens de connexion de la fiche absorbée sont détruits, pas déplacés :
    // ils ont été envoyés à une adresse qui disparaît.
    await tx.jetonConnexion.deleteMany({ where: { clienteId: absorbeeId } });

    // Envois de campagne : une seule ligne par couple (campagne, cliente). Une
    // campagne reçue des deux côtés perd son doublon plutôt que de faire échouer
    // toute la fusion sur une contrainte d'unicité.
    const dejaEnvoyees = await tx.envoiCampagne.findMany({
      where: { clienteId: gardeeId },
      select: { campagneId: true },
    });
    await tx.envoiCampagne.deleteMany({
      where: { clienteId: absorbeeId, campagneId: { in: dejaEnvoyees.map((e) => e.campagneId) } },
    });
    await tx.envoiCampagne.updateMany({
      where: { clienteId: absorbeeId },
      data: { clienteId: gardeeId },
    });

    // Avantages de parrainage : un seul par (type, période), même raison.
    const dejaGagnes = await tx.avantageParrainage.findMany({
      where: { clienteId: gardeeId },
      select: { type: true, periode: true },
    });
    const aDeplacer = await tx.avantageParrainage.findMany({
      where: { clienteId: absorbeeId },
      select: { id: true, type: true, periode: true },
    });
    const doublons = aDeplacer
      .filter((a) => dejaGagnes.some((g) => g.type === a.type && g.periode === a.periode))
      .map((a) => a.id);
    if (doublons.length > 0) {
      await tx.avantageParrainage.deleteMany({ where: { id: { in: doublons } } });
    }
    await tx.avantageParrainage.updateMany({
      where: { clienteId: absorbeeId },
      data: { clienteId: gardeeId },
    });

    // Les filleules de la fiche absorbée deviennent celles de la fiche gardée —
    // sauf la fiche gardée elle-même, qui ne peut pas être sa propre marraine.
    const filleules = await tx.cliente.updateMany({
      where: { parraineParId: absorbeeId, id: { not: gardeeId } },
      data: { parraineParId: gardeeId },
    });

    // Une adresse de complaisance cède la place à une vraie : c'est tout
    // l'intérêt de la manœuvre pour l'habituée saisie de vive voix.
    const email =
      sansEmail(gardee.email) && !sansEmail(absorbee.email) ? absorbee.email : gardee.email;

    const desabonneLe = gardee.desabonneLe ?? absorbee.desabonneLe ?? null;
    const parraineParId =
      gardee.parraineParId ??
      (absorbee.parraineParId && absorbee.parraineParId !== gardeeId
        ? absorbee.parraineParId
        : null);

    await tx.cliente.update({
      where: { id: gardeeId },
      data: {
        email,
        telephone: gardee.telephone || absorbee.telephone,
        telephoneNormalise: gardee.telephoneNormalise ?? absorbee.telephoneNormalise,
        notes: [gardee.notes, absorbee.notes].filter(Boolean).join("\n") || null,
        motDePasseHash: gardee.motDePasseHash ?? absorbee.motDePasseHash,
        // Une désinscription vaut des deux côtés ; l'accord ne survit que si
        // personne ne s'est désinscrite. Se réabonner est un geste de la
        // cliente, jamais la conséquence d'un ménage interne.
        consentementMarketing:
          !desabonneLe && (gardee.consentementMarketing || absorbee.consentementMarketing),
        consentementLe: gardee.consentementLe ?? absorbee.consentementLe,
        desabonneLe,
        bloqueeLe: gardee.bloqueeLe ?? absorbee.bloqueeLe,
        motifBlocage: gardee.motifBlocage ?? absorbee.motifBlocage,
        // La dispense d'acompte suit le même principe que le blocage : elle
        // survit à la fusion. Deux fiches réunies sont une seule cliente, et si
        // l'une d'elles était reconnue comme habituée, elle l'est toujours.
        acompteDispense: gardee.acompteDispense || absorbee.acompteDispense,
        parraineParId,
        // L'ancienneté est celle de la première venue, pas celle du ménage.
        creeLe: gardee.creeLe < absorbee.creeLe ? gardee.creeLe : absorbee.creeLe,
        reconqueteEnvoyeeLe:
          [gardee.reconqueteEnvoyeeLe, absorbee.reconqueteEnvoyeeLe]
            .filter((d): d is Date => d !== null)
            .sort((a, b) => b.getTime() - a.getTime())[0] ?? null,
      },
    });

    await tx.cliente.delete({ where: { id: absorbeeId } });

    return {
      nom: `${gardee.prenom} ${gardee.nom}`,
      rdv: rdv.count,
      commandes: commandes.count,
      filleules: filleules.count,
      adresseReprise: email !== gardee.email,
    };
  });
}
