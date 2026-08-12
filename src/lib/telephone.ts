// Le numéro de téléphone comme second identifiant.
//
// La fiche cliente est unique par e-mail. C'était suffisant tant que toutes les
// clientes passaient par le site — ça ne l'est plus depuis que Zélia saisit
// elle-même les rendez-vous pris de vive voix : ces fiches-là n'ont qu'un
// numéro, et une adresse de complaisance. Le jour où la cliente réserve en
// ligne avec sa vraie adresse, l'e-mail ne correspond à rien et une seconde
// fiche naît — même personne, deux historiques, deux comptages de fidélité.
//
// Le numéro, lui, ne change pas. On s'en sert pour reconnaître quelqu'un déjà
// connu, à condition de le comparer sur sa forme réduite : « 06 45 29 20 01 »,
// « 0645292001 » et « +33 6 45 29 20 01 » désignent la même ligne.

/** Chiffres seuls, indicatif français ramené à la forme 0X. */
export function numeroNormalise(telephone: string): string {
  const chiffres = telephone.replace(/\D/g, "");
  if (chiffres.startsWith("33")) return `0${chiffres.slice(2)}`;
  if (chiffres.startsWith("0033")) return `0${chiffres.slice(4)}`;
  return chiffres;
}

// Un numéro trop court ne distingue personne : mieux vaut ne rien rapprocher
// que de fusionner deux clientes sur « 06 ».
const LONGUEUR_UTILE = 9;

/**
 * Forme comparable d'un numéro, ou `null` s'il est trop court pour servir de
 * repère. Le `null` est délibéré : en base, il ne rapproche rien de rien.
 */
export function cleTelephone(telephone: string | null | undefined): string | null {
  if (!telephone) return null;
  const cle = numeroNormalise(telephone);
  return cle.length >= LONGUEUR_UTILE ? cle : null;
}

/**
 * Les deux champs à écrire ensemble sur une fiche. Passer par là évite qu'un
 * jour un numéro soit modifié sans que sa forme comparable suive.
 */
export function champsTelephone(telephone: string): {
  telephone: string;
  telephoneNormalise: string | null;
} {
  return { telephone, telephoneNormalise: cleTelephone(telephone) };
}
