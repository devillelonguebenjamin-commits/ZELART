// Les questions qui partent aujourd'hui en SMS, et qui coûtent donc du temps.
//
// Écrites à la première personne, comme le reste du site. Deux d'entre elles
// touchent à la santé et à l'argent : elles sont formulées pour ne rien promettre
// que le salon ne tienne, et pour renvoyer à Zélia dès qu'un cas particulier se
// présente.
//
// Elles alimentent aussi le balisage `FAQPage` de Google, qui peut afficher les
// questions directement dans les résultats de recherche.

export type Question = { question: string; reponse: string };
export type RubriqueFaq = { titre: string; questions: Question[] };

export const FAQ: RubriqueFaq[] = [
  {
    titre: "Avant de venir",
    questions: [
      {
        question: "Combien de temps dure un rendez-vous ?",
        reponse:
          "Cela dépend de la technique et du décor. Je préfère ne pas annoncer un chiffre à la minute près : un ongle abîmé ou une hésitation sur la couleur change tout. Prévoyez large, et je vous dis le jour même où nous en sommes.",
      },
      {
        question: "Faut-il venir avec les ongles nus ?",
        reponse:
          "Non. Si vous portez déjà une pose, indiquez-le au moment de réserver : la dépose est ajoutée automatiquement à votre demande quand elle s'impose, et son tarif apparaît avant que vous validiez.",
      },
      {
        question: "Je suis en retard, que se passe-t-il ?",
        reponse:
          "Prévenez-moi par SMS au 06 45 29 20 01. Je reçois une seule cliente à la fois, donc un retard se rattrape souvent. Au-delà d'une vingtaine de minutes, il faut parfois réduire la prestation ou la reporter.",
      },
      {
        question: "Puis-je venir accompagnée ?",
        reponse:
          "L'espace est calme et prévu pour une personne à la fois. Si vous devez venir accompagnée, dites-le-moi avant, je vous dirai si c'est possible ce jour-là.",
      },
    ],
  },
  {
    titre: "Pendant et après",
    questions: [
      {
        question: "Est-ce que ça fait mal ?",
        reponse:
          "Non. Une pose bien faite ne doit jamais être douloureuse. Si vous ressentez une gêne pendant le rendez-vous, dites-le-moi tout de suite : c'est le signe qu'il faut ajuster quelque chose.",
      },
      {
        question: "Est-ce que ça abîme les ongles ?",
        reponse:
          "Pas quand la pose est déposée correctement. Ce qui abîme, c'est l'arrachage : ne retirez jamais une pose vous-même, revenez pour une dépose, elle se réserve seule.",
      },
      {
        question: "Combien de temps ça tient ?",
        reponse:
          "Le vernis semi-permanent tient environ trois semaines, le gainage et le Gel X trois à quatre, le Pop-it un peu plus. C'est la repousse qui décide, pas l'usure : je vous envoie un message quand le moment approche.",
      },
      {
        question: "Un ongle s'est cassé, que faire ?",
        reponse:
          "Écrivez-moi par SMS avec une photo. Une réparation isolée se règle souvent en peu de temps, et il vaut mieux la faire vite que d'attendre le rendez-vous suivant.",
      },
    ],
  },
  {
    titre: "Réservation et paiement",
    questions: [
      {
        question: "Pourquoi un acompte pour un premier rendez-vous ?",
        reponse:
          "Parce qu'un créneau réservé et non honoré ne se rattrape pas. L'acompte de 15 € est déduit du montant final, et il ne concerne que le premier rendez-vous.",
      },
      {
        question: "Comment annuler ou décaler ?",
        reponse:
          "Depuis votre espace, jusqu'à 24 h avant. Passé ce délai, prévenez-moi par SMS pour que je puisse proposer le créneau à quelqu'un d'autre.",
      },
      {
        question: "Comment régler ?",
        reponse:
          "Sur place, en espèces ou par carte bancaire. Seul l'acompte du premier rendez-vous se règle en ligne, par un lien de paiement sécurisé.",
      },
      {
        question: "Aucun créneau ne me convient, que faire ?",
        reponse:
          "Deux possibilités depuis la page de réservation : vous inscrire en liste d'attente, et vous êtes prévenue dès qu'une place se libère, ou me proposer directement l'horaire qui vous arrangerait, que j'accepte ou non selon mon agenda.",
      },
    ],
  },
  {
    titre: "Allergies et santé",
    questions: [
      {
        question: "J'ai déjà fait une réaction à une pose, puis-je venir ?",
        reponse:
          "Signalez-le avant de réserver, par SMS, en me disant ce qui s'est passé. Selon le produit en cause, une pose reste possible avec d'autres matériaux, ou elle est déconseillée. Cette conversation se fait avant le rendez-vous, jamais le jour même.",
      },
      {
        question: "Je suis enceinte, y a-t-il un risque ?",
        reponse:
          "Les produits utilisés ne sont pas contre-indiqués, mais les odeurs peuvent être plus difficiles à supporter et les ongles réagissent parfois différemment. Dites-le-moi, j'adapte la prestation et l'aération.",
      },
      {
        question: "Le matériel est-il désinfecté ?",
        reponse:
          "Oui, entre chaque cliente, sans exception. Les limes et les embouts sont soit à usage unique, soit désinfectés selon le protocole prévu pour cela.",
      },
    ],
  },
];

/** Balisage `FAQPage` de Google, construit à partir des mêmes questions. */
export function donneesStructureesFaq() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.flatMap((rubrique) =>
      rubrique.questions.map((q) => ({
        "@type": "Question",
        name: q.question,
        acceptedAnswer: { "@type": "Answer", text: q.reponse },
      }))
    ),
  };
}
