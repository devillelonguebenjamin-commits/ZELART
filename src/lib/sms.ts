import { cleBrevo } from "@/lib/email";
import { cleTelephone } from "@/lib/telephone";

// Le SMS, pour les trois moments où l'e-mail ne suffit pas.
//
// Tout le salon fonctionne par SMS : Zélia l'écrit partout, elle ne prend pas
// les appels. Le site, lui, ne parlait que par e-mail. Une cliente qui relève
// rarement sa boîte ratait sa confirmation, son rappel de la veille et sa
// demande d'acompte, et il fallait la relancer à la main.
//
// Trois principes tiennent ce module :
//
//   - **il ne remplace jamais l'e-mail**, il le double. L'e-mail porte le détail,
//     les liens et la trace écrite ; le SMS porte l'essentiel et arrive ;
//   - **rien de commercial n'y passe.** Confirmation, rappel, acompte : ce sont
//     des messages liés à un rendez-vous que la cliente a demandé. Une offre ou
//     une relance de fidélisation exigerait un consentement distinct que ce
//     module ne gère pas, et n'a donc pas sa place ici ;
//   - **un échec ne casse rien.** Sans configuration, la fonction ne fait rien
//     et le dit ; l'appelant continue son chemin.

const DELAI_ENVOI_MS = 10_000;

/** Nom d'expéditeur affiché sur le téléphone. Onze caractères au maximum. */
export function expediteurSms(): string | undefined {
  const brut = process.env.BREVO_SMS_SENDER?.trim();
  return brut ? brut.slice(0, 11) : undefined;
}

export function smsConfigure(): boolean {
  return Boolean(cleBrevo() && expediteurSms());
}

export type ResultatSms = { ok: true } | { ok: false; erreur: string };

/**
 * Numéro au format international sans le `+`, tel que l'attend Brevo.
 * `null` quand le numéro n'est pas exploitable : mieux vaut ne rien envoyer que
 * d'écrire à un inconnu.
 */
export function numeroInternational(telephone: string | null | undefined): string | null {
  const cle = cleTelephone(telephone);
  if (!cle) return null;
  // `cleTelephone` rend une forme française en 0X. Les numéros mobiles français
  // font dix chiffres ; en dehors de ce cas, on s'abstient plutôt que de
  // fabriquer un indicatif au jugé.
  if (!/^0[67]\d{8}$/.test(cle)) return null;
  return `33${cle.slice(1)}`;
}

export async function envoyerSms(
  telephone: string | null | undefined,
  texte: string
): Promise<ResultatSms> {
  const cle = cleBrevo();
  const expediteur = expediteurSms();
  if (!cle || !expediteur) return { ok: false, erreur: "SMS non configuré." };

  const destinataire = numeroInternational(telephone);
  if (!destinataire) return { ok: false, erreur: "Numéro de mobile inexploitable." };

  try {
    const reponse = await fetch(
      process.env.BREVO_SMS_URL ?? "https://api.brevo.com/v3/transactionalSMS/sms",
      {
        method: "POST",
        signal: AbortSignal.timeout(DELAI_ENVOI_MS),
        headers: { "api-key": cle, "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "transactional",
          sender: expediteur,
          recipient: destinataire,
          // Les accents font basculer le message en encodage Unicode, qui
          // divise par deux la longueur utile. On l'assume plutôt que d'écrire
          // sans accents à des clientes.
          unicodeEnabled: true,
          content: texte.slice(0, 300),
        }),
      }
    );
    if (!reponse.ok) {
      return {
        ok: false,
        erreur: `Brevo a refusé le SMS (${reponse.status}) : ${(await reponse.text()).slice(0, 200)}`,
      };
    }
    return { ok: true };
  } catch (erreur) {
    const expire = erreur instanceof Error && erreur.name === "TimeoutError";
    return {
      ok: false,
      erreur: expire ? "Brevo n'a pas répondu dans le délai imparti." : String(erreur),
    };
  }
}

/**
 * Envoie sans jamais interrompre l'appelant : un SMS qui ne part pas ne doit pas
 * empêcher une confirmation d'exister. L'échec est tracé, pas propagé.
 */
export async function envoyerSmsSansBloquer(
  telephone: string | null | undefined,
  texte: string
): Promise<boolean> {
  if (!smsConfigure()) return false;
  const resultat = await envoyerSms(telephone, texte);
  if (!resultat.ok && resultat.erreur !== "Numéro de mobile inexploitable.") {
    console.error("SMS non envoyé", resultat.erreur);
  }
  return resultat.ok;
}
