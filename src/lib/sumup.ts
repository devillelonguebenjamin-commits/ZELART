// Création d'un lien de paiement au montant exact, via l'API SumUp.
//
// Pourquoi c'était nécessaire : le lien réutilisable des réglages porte un
// montant fixe — l'acompte de 15 € des rendez-vous. L'utiliser pour une
// commande de press-on faisait payer 15 € une cliente qui en devait 65.
//
// Pourquoi c'est possible : la spécification officielle de SumUp décrit
// `valid_until` comme facultatif — « si omis, le checkout n'a pas de date
// d'expiration explicite ». Le lien envoyé par e-mail reste donc valable, ce
// qui n'était pas acquis : les 30 minutes souvent citées concernent la session
// de paiement une fois la page ouverte, pas la durée de vie du lien.
//
// Sans configuration, tout retombe sur le lien collé à la main par Zélia : le
// site n'exige jamais l'API pour fonctionner.

// Surchargeable comme BREVO_API_URL et RESEND_API_URL, selon la convention déjà
// en place : indispensable pour éprouver ce chemin sans compte marchand.
const racine = () => process.env.SUMUP_API_URL?.trim() || "https://api.sumup.com/v0.1";
const DELAI_MS = 10_000;

export function sumupConfigure(): boolean {
  return Boolean(process.env.SUMUP_API_KEY?.trim() && process.env.SUMUP_MERCHANT_CODE?.trim());
}

export type ResultatCheckout =
  | { ok: true; url: string; reference: string }
  | { ok: false; erreur: string };

/**
 * Crée un checkout hébergé et renvoie l'adresse de la page de paiement.
 *
 * `reference` doit être unique côté SumUp : on y met l'identifiant de la
 * commande suivi d'un horodatage, pour qu'une seconde demande sur la même
 * commande — un montant corrigé, par exemple — ne soit pas refusée en doublon.
 */
export async function creerLienPaiement(
  montantCents: number,
  description: string,
  referenceBase: string
): Promise<ResultatCheckout> {
  const cle = process.env.SUMUP_API_KEY?.trim();
  const marchand = process.env.SUMUP_MERCHANT_CODE?.trim();
  if (!cle || !marchand) {
    return { ok: false, erreur: "L'API SumUp n'est pas configurée." };
  }
  if (!Number.isInteger(montantCents) || montantCents <= 0) {
    return { ok: false, erreur: "Montant invalide." };
  }

  const reference = `${referenceBase}-${Date.now()}`;

  try {
    const reponse = await fetch(`${racine()}/checkouts`, {
      method: "POST",
      signal: AbortSignal.timeout(DELAI_MS),
      headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        checkout_reference: reference,
        // SumUp attend un montant décimal, pas des centimes.
        amount: Number((montantCents / 100).toFixed(2)),
        currency: "EUR",
        merchant_code: marchand,
        description: description.slice(0, 100),
        // `valid_until` volontairement omis : le lien part par e-mail et doit
        // rester valable le temps que la cliente le règle.
        hosted_checkout: { enabled: true },
      }),
    });

    if (!reponse.ok) {
      const corps = (await reponse.text()).slice(0, 200);
      return { ok: false, erreur: `SumUp a refusé la demande (${reponse.status}) : ${corps}` };
    }

    const donnees = (await reponse.json()) as { hosted_checkout_url?: string };
    if (!donnees.hosted_checkout_url) {
      return {
        ok: false,
        erreur: "SumUp n'a pas renvoyé d'adresse de paiement (Hosted Checkout non activé ?).",
      };
    }
    return { ok: true, url: donnees.hosted_checkout_url, reference };
  } catch (erreur) {
    const expire = erreur instanceof Error && erreur.name === "TimeoutError";
    return {
      ok: false,
      erreur: expire
        ? "SumUp n'a pas répondu dans le délai imparti."
        : `Appel à SumUp impossible : ${erreur instanceof Error ? erreur.message : String(erreur)}`,
    };
  }
}

/**
 * État de la connexion SumUp, tel que l'affiche la page Réglages.
 *
 * Un seul objet plat plutôt qu'une union : chaque champ répond à une question
 * que Zélia se pose devant l'écran — la clé est-elle acceptée, quel code
 * marchand lui correspond, et celui que j'ai saisi est-il le bon.
 */
export type EtatSumUp = {
  /** Les deux variables sont renseignées. */
  configure: boolean;
  /** La clé est acceptée par SumUp. */
  cleValide: boolean;
  /** Codes marchands auxquels cette clé donne accès. */
  codesConnus: string[];
  /** Renseigné et cohérent avec la clé. */
  codeCorrect: boolean;
  erreur: string | null;
};

/**
 * Vérifie la clé et confronte le code marchand à ceux qu'elle ouvre.
 *
 * `/v0.1/memberships` renvoie les ressources auxquelles la clé donne accès ; le
 * `resource_id` d'une adhésion marchande **est** le code marchand. On peut donc
 * le découvrir à partir de la seule clé, plutôt que de laisser Zélia le chercher
 * dans son tableau de bord et se tromper d'une lettre sans jamais savoir
 * pourquoi les liens de paiement échouent.
 */
export async function verifierSumUp(): Promise<EtatSumUp> {
  const cle = process.env.SUMUP_API_KEY?.trim();
  const marchand = process.env.SUMUP_MERCHANT_CODE?.trim() ?? "";
  const vide: EtatSumUp = {
    configure: false,
    cleValide: false,
    codesConnus: [],
    codeCorrect: false,
    erreur: null,
  };
  if (!cle) return vide;

  const echec = (erreur: string): EtatSumUp => ({ ...vide, erreur });

  try {
    const reponse = await fetch(`${racine()}/memberships?limit=25`, {
      headers: { Authorization: `Bearer ${cle}`, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(DELAI_MS),
    });

    if (reponse.status === 401 || reponse.status === 403) {
      return echec("SumUp refuse cette clé. Régénérez-en une et recollez-la dans SUMUP_API_KEY.");
    }
    if (!reponse.ok) return echec(`SumUp a répondu ${reponse.status}.`);

    const donnees = (await reponse.json()) as {
      items?: { resource_id?: string; type?: string }[];
    };
    const codesConnus = [
      ...new Set(
        (donnees.items ?? [])
          .filter((m) => !m.type || m.type === "merchant")
          .map((m) => m.resource_id ?? "")
          .filter(Boolean)
      ),
    ];

    // Un code absent de la liste ne peut pas fonctionner : autant le dire ici
    // plutôt que de laisser découvrir le problème sur une vraie commande.
    const codeCorrect =
      marchand !== "" && (codesConnus.length === 0 || codesConnus.includes(marchand));

    return {
      configure: marchand !== "",
      cleValide: true,
      codesConnus,
      codeCorrect,
      erreur:
        marchand === ""
          ? null
          : codeCorrect
            ? null
            : `Le code marchand renseigné (${marchand}) n'est pas celui de cette clé.`,
    };
  } catch (erreur) {
    return echec(
      erreur instanceof Error && erreur.name === "TimeoutError"
        ? "SumUp n'a pas répondu dans le délai imparti."
        : "Impossible de joindre SumUp."
    );
  }
}
