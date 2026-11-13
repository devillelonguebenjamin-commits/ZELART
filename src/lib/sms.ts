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

// Alphabet GSM 7 bits : un SMS y tient en 160 caractères. Un seul caractère
// hors de cet alphabet fait passer tout le message en Unicode, à 70 caractères
// par SMS — le même texte peut alors coûter deux ou trois SMS au lieu d'un.
// « é », « è », « à », « ù » en font partie ; « ê », « â », « û », « ç » non.
const GSM7 =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡" +
  "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà" +
  "^{}\\[~]|€";

function estGsm7(texte: string): boolean {
  return [...texte].every((c) => GSM7.includes(c));
}

/**
 * Le texte tel qu'il partira, et son encodage. Un accent hors alphabet GSM
 * (« août », « prêt ») est retiré plutôt que de tripler le prix du message ;
 * l'Unicode ne sert que si le texte en a vraiment besoin (un emoji, par exemple).
 */
export function preparerTexteSms(texte: string): { contenu: string; unicode: boolean } {
  if (estGsm7(texte)) return { contenu: texte, unicode: false };
  const simplifie = [...texte]
    .map((c) => (GSM7.includes(c) ? c : c.normalize("NFD").replace(/[\u0300-\u036f]/g, "")))
    .join("")
    .replace(/[’‘]/g, "'")
    .replace(/[«»“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/\u00a0/g, " ");
  return estGsm7(simplifie) ? { contenu: simplifie, unicode: false } : { contenu: texte, unicode: true };
}

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

  const { contenu, unicode } = preparerTexteSms(texte);

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
          unicodeEnabled: unicode,
          content: contenu.slice(0, 300),
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
