"use server";

import { prisma } from "@/lib/prisma";
import { ficheCliente } from "@/lib/fiche-cliente";
import { envoyerLienConnexion } from "@/lib/lien-connexion";
import { clienteBloquee, MESSAGE_BLOCAGE } from "@/lib/blocage";
import { inscriptionSchema } from "@/lib/validations";

// Ouvrir un compte sans prendre rendez-vous.
//
// Jusqu'ici, la seule façon d'exister dans le site était de réserver : l'espace
// cliente n'accueillait que celles qui avaient déjà franchi le pas. Une
// personne qui découvre le salon et veut simplement suivre le travail de Zélia,
// noter son code de parrainage ou préparer sa venue n'avait aucune porte.
//
// Trois précautions, qui tiennent au fait que cette porte est silencieuse : à
// la différence d'une réservation, personne ne vérifie ensuite ce qui s'est
// passé.
//
// Et une absence assumée : **aucun mot de passe ne se choisit ici.** Le site
// tient depuis toujours la règle « il faut déjà être entrée pour en créer un »,
// ce qui garantit que la possession de l'adresse a été prouvée. Un mot de passe
// posé à l'inscription la briserait : il suffirait de s'inscrire avec l'adresse
// d'une autre pour garder une clé de la fiche qu'elle utilisera plus tard. Le
// mot de passe reste donc facultatif et se définit depuis l'espace connecté.

export type EtatInscription = { ok?: boolean; message?: string };

export async function creerCompte(
  _etatPrecedent: EtatInscription,
  formData: FormData
): Promise<EtatInscription> {
  const analyse = inscriptionSchema.safeParse({
    prenom: formData.get("prenom"),
    nom: formData.get("nom"),
    email: formData.get("email"),
    telephone: formData.get("telephone"),
  });
  if (!analyse.success) {
    return { ok: false, message: analyse.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const donnees = analyse.data;

  if (await clienteBloquee(donnees.email, donnees.telephone)) {
    return { ok: false, message: MESSAGE_BLOCAGE };
  }

  // Première précaution : **la réponse ne dit jamais si l'adresse était déjà
  // connue.** Sans cela, le formulaire deviendrait un moyen de vérifier qui est
  // cliente chez Zélia, une adresse à la fois.
  const reponse: EtatInscription = {
    ok: true,
    message:
      "C'est fait. Un lien de connexion vient de partir vers votre adresse : il est valable trente minutes et ne sert qu'une fois. Pensez à regarder vos indésirables.",
  };

  const existante = await prisma.cliente.findUnique({
    where: { email: donnees.email },
    select: { id: true, prenom: true, email: true },
  });

  // Deuxième précaution : **une fiche existante n'est pas touchée.** Ni son nom,
  // ni son téléphone, ni surtout son mot de passe. S'inscrire avec l'adresse
  // d'une autre ne doit rien pouvoir lui prendre : le lien part chez elle, et
  // elle seule le reçoit.
  if (existante) {
    await envoyerLienConnexion(existante);
    return reponse;
  }

  const accord = formData.get("consentementMarketing") === "on";

  try {
    // Troisième précaution : **pas de rapprochement par téléphone.** La
    // réservation se l'autorise, parce qu'une demande de rendez-vous passe
    // ensuite sous les yeux de Zélia. Ici, personne ne relit : un numéro deviné
    // donnerait accès à l'historique d'une habituée enregistrée de vive voix.
    // Une deuxième fiche vaut mieux, elle apparaîtra dans « Doublons » et Zélia
    // tranchera.
    const cliente = await ficheCliente(prisma, donnees, accord, {
      rapprocherParTelephone: false,
    });
    await envoyerLienConnexion(cliente);
  } catch (erreur) {
    // Deux inscriptions simultanées sur la même adresse : la seconde bute sur
    // la contrainte d'unicité. Rien à signaler, la première a abouti et le lien
    // est parti. Toute autre panne, en revanche, se dit : annoncer « c'est
    // fait » à quelqu'un dont le compte n'existe pas le laisserait attendre un
    // lien qui ne viendra jamais.
    const doublon =
      typeof erreur === "object" && erreur !== null && "code" in erreur && erreur.code === "P2002";
    if (!doublon) {
      console.error("Inscription impossible", donnees.email, erreur);
      return {
        ok: false,
        message: "La création du compte a échoué. Réessayez dans un instant.",
      };
    }
  }

  return reponse;
}
