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
