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
  | { ok: true; url: string; reference: string; checkoutId: string | null }
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
  referenceBase: string,
  /**
   * Adresse que SumUp appelle quand l'état du paiement change. La spécification
   * ne documente **ni le format du message, ni aucune signature** : on ne lit
   * donc rien de son contenu. Elle ne sert que de sonnette — « quelque chose a
   * bougé » — après quoi le site va vérifier lui-même auprès de l'API.
   */
  retourUrl?: string
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
        ...(retourUrl ? { return_url: retourUrl } : {}),
        // `valid_until` volontairement omis : le lien part par e-mail et doit
        // rester valable le temps que la cliente le règle.
        hosted_checkout: { enabled: true },
      }),
    });

    if (!reponse.ok) {
      const corps = (await reponse.text()).slice(0, 200);
      return { ok: false, erreur: `SumUp a refusé la demande (${reponse.status}) : ${corps}` };
    }

    const donnees = (await reponse.json()) as { hosted_checkout_url?: string; id?: string };
    if (!donnees.hosted_checkout_url) {
      return {
        ok: false,
        erreur: "SumUp n'a pas renvoyé d'adresse de paiement (Hosted Checkout non activé ?).",
      };
    }
    return { ok: true, url: donnees.hosted_checkout_url, reference, checkoutId: donnees.id ?? null };
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
 * Où en est un paiement, interrogé par **notre** référence.
 *
 * C'est le seul rapprochement fiable possible avec SumUp, et il faut savoir
 * pourquoi : une transaction SumUp ne porte **aucune identité de payeuse** —
 * ni nom, ni e-mail, ni téléphone, sur aucun des trois écrans de l'API
 * (historique, détail, reçu). Un paiement de 15 € y est rigoureusement
 * indiscernable d'un autre paiement de 15 €. Chercher « qui a payé » dans
 * l'historique reviendrait à chercher un mot dans une page blanche.
 *
 * Ce que l'on maîtrise, en revanche, c'est la référence qu'on écrit à la
 * création du paiement. D'où la règle : un lien par acompte, une référence par
 * lien, et la question devient exacte.
 *
 * `null` signifie « pas de réponse exploitable » — clé absente, réseau coupé,
 * référence inconnue. Jamais « impayé » : confondre les deux ferait relancer
 * une cliente qui a réglé.
 */
export type EtatPaiement = "PENDING" | "PAID" | "FAILED" | "EXPIRED";

/** L'état, et l'adresse de la page de paiement quand elle est encore ouverte. */
export type Paiement = { etat: EtatPaiement; url: string | null };

export async function lirePaiement(reference: string): Promise<Paiement | null> {
  const cle = process.env.SUMUP_API_KEY?.trim();
  if (!cle || !reference) return null;

  try {
    const reponse = await fetch(
      `${racine()}/checkouts?checkout_reference=${encodeURIComponent(reference)}`,
      {
        headers: { Authorization: `Bearer ${cle}`, Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(DELAI_MS),
      }
    );
    if (!reponse.ok) return null;

    type Brut = { status?: string; hosted_checkout_url?: string };
    const donnees = (await reponse.json()) as Brut[] | Brut;
    // L'endpoint renvoie une liste ; un objet seul reste toléré par prudence.
    const items = (Array.isArray(donnees) ? donnees : [donnees]).filter(
      (c): c is Brut & { status: EtatPaiement } =>
        c?.status === "PENDING" ||
        c?.status === "PAID" ||
        c?.status === "FAILED" ||
        c?.status === "EXPIRED"
    );
    if (items.length === 0) return null;
    // Un règlement l'emporte sur tout le reste : une tentative refusée suivie
    // d'une réussie doit se lire « payé ».
    const retenu = items.find((c) => c.status === "PAID") ?? items[0];
    return { etat: retenu.status, url: retenu.hosted_checkout_url ?? null };
  } catch {
    return null;
  }
}

/**
 * État de la connexion SumUp, tel que l'affiche la page Réglages.
 *
 * Un seul objet plat plutôt qu'une union : chaque champ répond à une question
 * que Zélia se pose devant l'écran — la clé est-elle acceptée, quel code
 * marchand lui correspond, et celui que j'ai saisi est-il le bon.
 */
/** Un compte marchand auquel la clé donne accès. */
export type Marchand = {
  code: string;
  nom: string;
  /** Compte de test : les paiements n'y encaissent rien. */
  bacASable: boolean;
};

export type EtatSumUp = {
  /** Les deux variables sont renseignées. */
  configure: boolean;
  /** La clé est acceptée par SumUp. */
  cleValide: boolean;
  /**
   * Comptes marchands ouverts par cette clé. Il y en a parfois plusieurs — un
   * compte de test à côté du vrai, ou un ancien compte resté rattaché. D'où le
   * nom et le drapeau « bac à sable » : deux codes nus ne permettraient pas de
   * choisir, et se tromper ferait encaisser sur le mauvais compte, ou nulle part.
   */
  marchands: Marchand[];
  /** Renseigné et cohérent avec la clé. */
  codeCorrect: boolean;
  /** Le compte retenu est un compte de test : rien n'y est réellement encaissé. */
  bacASable: boolean;
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
    marchands: [],
    codeCorrect: false,
    bacASable: false,
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
      items?: {
        resource_id?: string;
        type?: string;
        resource?: { name?: string; attributes?: { sandbox?: boolean } };
      }[];
    };

    const parCode = new Map<string, Marchand>();
    for (const item of donnees.items ?? []) {
      if (item.type && item.type !== "merchant") continue;
      const code = item.resource_id ?? "";
      if (!code || parCode.has(code)) continue;
      parCode.set(code, {
        code,
        nom: item.resource?.name?.trim() || "compte sans nom",
        bacASable: item.resource?.attributes?.sandbox === true,
      });
    }
    const marchands = [...parCode.values()];

    // Un code absent de la liste ne peut pas fonctionner : autant le dire ici
    // plutôt que de laisser découvrir le problème sur une vraie commande.
    const codeCorrect =
      marchand !== "" &&
      (marchands.length === 0 || marchands.some((m) => m.code === marchand));

    const choisi = marchands.find((m) => m.code === marchand);

    return {
      configure: marchand !== "",
      cleValide: true,
      marchands,
      codeCorrect,
      bacASable: choisi?.bacASable === true,
      erreur:
        marchand === ""
          ? null
          : !codeCorrect
            ? `Le code marchand renseigné (${marchand}) n'est pas celui de cette clé.`
            : choisi?.bacASable
              ? `Attention : « ${choisi.nom} » est un compte de test. Aucun paiement n'y sera réellement encaissé.`
              : null,
    };
  } catch (erreur) {
    return echec(
      erreur instanceof Error && erreur.name === "TimeoutError"
        ? "SumUp n'a pas répondu dans le délai imparti."
        : "Impossible de joindre SumUp."
    );
  }
}
