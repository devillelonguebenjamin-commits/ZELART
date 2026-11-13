import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { declarationsDuRendezVous } from "@/lib/declaration-sante";
import {
  DECLARATION_HISTORIQUE,
  POINTS_DECLARATION,
  TITRE_DECLARATION,
} from "@/lib/declaration-sante-texte";
import { enregistrerSignatureSalon } from "@/actions/declaration";
import BoutonImprimer from "@/components/BoutonImprimer";

// La déclaration santé d'un rendez-vous, prête à imprimer ou à enregistrer en
// PDF depuis le navigateur. Trois cas :
//
//   - une déclaration est au registre : l'attestation, avec la copie figée de
//     ce qui a été accepté, quand et depuis où ;
//   - le rendez-vous date d'avant le registre : ce que le site sait, et rien
//     de plus — une preuve qui affirmerait davantage serait contestable ;
//   - aucune déclaration (rendez-vous noté par Zélia) : le formulaire papier,
//     prérempli, à faire signer au salon.

const EDITRICE =
  "Zelart Nails · Zélia Barreteau, prothésiste ongulaire · SIRET 903 178 101 00015 · 108 avenue de la République, 44600 Saint-Nazaire";

function horodatage(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    dateStyle: "full",
    timeStyle: "medium",
  }).format(date);
}

/** Date et heure d'un rendez-vous, avec l'année : un document de preuve se relit des années plus tard. */
function quand(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    dateStyle: "full",
    timeStyle: "short",
  }).format(date);
}

function Ligne({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr className="border-b border-stone-200 align-top">
      <th className="w-48 py-2 pr-4 text-left font-medium text-stone-500">{label}</th>
      <td className="py-2 text-stone-900">{children}</td>
    </tr>
  );
}

export default async function DeclarationRendezVous({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ formulaire?: string }>;
}) {
  const { id } = await params;
  const { formulaire } = await searchParams;
  const rdv = await prisma.rendezVous.findUnique({
    where: { id },
    include: {
      cliente: true,
      lignes: { include: { prestation: true }, orderBy: { ordre: "asc" } },
    },
  });
  if (!rdv) notFound();

  const declarations = await declarationsDuRendezVous(rdv.id);
  const derniere = declarations[0];
  const prestations = rdv.lignes.map((l) => l.prestation.nom).join(" + ");
  const papier = formulaire === "1" || (!derniere && !rdv.consentementSante);
  const signer = enregistrerSignatureSalon.bind(null, rdv.id);

  return (
    <div>
      {/* À l'impression, seule la feuille sort : ni le menu du site, ni celui
          de l'espace gérante, ni ces boutons. */}
      <style>{`@media print {
        body * { visibility: hidden !important; }
        #document-imprimable, #document-imprimable * { visibility: visible !important; }
        #document-imprimable { position: absolute; inset: 0 auto auto 0; width: 100%; padding: 0; border: 0; }
        @page { margin: 16mm; }
      }`}</style>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href={`/admin/clientes/${rdv.clienteId}`} className="text-sm text-pink-600 hover:underline">
          ← Fiche de {rdv.cliente.prenom} {rdv.cliente.nom}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          {papier ? (
            derniere || rdv.consentementSante ? (
              <Link href={`/admin/declaration/${rdv.id}`} className="text-sm text-pink-600 hover:underline">
                Voir l&rsquo;attestation
              </Link>
            ) : null
          ) : (
            <Link
              href={`/admin/declaration/${rdv.id}?formulaire=1`}
              className="text-sm text-pink-600 hover:underline"
            >
              Formulaire papier à faire signer
            </Link>
          )}
          <BoutonImprimer />
        </div>
      </div>

      <article
        id="document-imprimable"
        className="rounded-2xl border border-pink-100 bg-white p-6 text-sm leading-relaxed text-stone-800 sm:p-8"
      >
        <p className="text-xs text-stone-500">{EDITRICE}</p>

        {papier ? (
          <>
            <h1 className="mt-4 text-xl font-bold text-stone-900">{TITRE_DECLARATION}</h1>
            <p className="mt-1 text-xs text-stone-500">Formulaire à remplir et signer avant la prestation.</p>
            <table className="mt-4 w-full">
              <tbody>
                <Ligne label="Cliente">
                  {rdv.cliente.prenom} {rdv.cliente.nom}
                </Ligne>
                <Ligne label="Rendez-vous">
                  {quand(rdv.debut)}
                </Ligne>
                <Ligne label="Prestations">{prestations}</Ligne>
              </tbody>
            </table>

            <p className="mt-5 font-medium text-stone-900">
              Allergies connues, problèmes de santé, traitements en cours (écrire « aucun » si rien
              à signaler) :
            </p>
            <div className="mt-2 space-y-6">
              <div className="border-b border-dotted border-stone-400 pt-4" />
              <div className="border-b border-dotted border-stone-400" />
              <div className="border-b border-dotted border-stone-400" />
            </div>

            <ul className="mt-6 space-y-2">
              {POINTS_DECLARATION.map((point) => (
                <li key={point} className="flex gap-3">
                  <span aria-hidden className="mt-0.5 inline-block h-4 w-4 flex-none border border-stone-500" />
                  <span>{point}</span>
                </li>
              ))}
              <li className="flex gap-3">
                <span aria-hidden className="mt-0.5 inline-block h-4 w-4 flex-none border border-stone-500" />
                <span>Je certifie avoir 18 ans ou plus.</span>
              </li>
            </ul>

            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <p>
                Fait à Saint-Nazaire, le
                <span className="ml-2 inline-block w-32 border-b border-dotted border-stone-400" />
              </p>
              <div>
                <p>Signature de la cliente :</p>
                <div className="mt-2 h-20 rounded border border-stone-300" />
              </div>
            </div>
          </>
        ) : derniere ? (
          <>
            <h1 className="mt-4 text-xl font-bold text-stone-900">
              Attestation de déclaration santé
            </h1>
            <p className="mt-1 text-xs text-stone-500">
              Extrait du registre des déclarations du site zelart.fr. Les informations ci-dessous
              sont une copie figée, enregistrée au moment de la déclaration.
            </p>
            <table className="mt-4 w-full">
              <tbody>
                <Ligne label="Cliente">
                  {derniere.prenom} {derniere.nom}
                </Ligne>
                <Ligne label="Coordonnées">
                  {derniere.email} · {derniere.telephone}
                </Ligne>
                <Ligne label="Rendez-vous">
                  {quand(derniere.rendezVousLe)}
                </Ligne>
                <Ligne label="Prestations">{derniere.prestations}</Ligne>
                <Ligne label="Déclaration faite le">
                  <strong>{horodatage(derniere.accepteeLe)}</strong> (heure de Paris)
                </Ligne>
                <Ligne label="Comment">
                  {derniere.source === "EN_LIGNE"
                    ? "Case obligatoire cochée par la cliente en envoyant sa demande de rendez-vous sur le site."
                    : "Formulaire papier signé au salon, enregistré par Zélia. L'original signé fait foi."}
                </Ligne>
                {derniere.source === "EN_LIGNE" && (
                  <>
                    <Ligne label="Adresse IP">{derniere.ip ?? "non transmise"}</Ligne>
                    <Ligne label="Appareil">
                      <span className="break-all text-xs">{derniere.navigateur ?? "non transmis"}</span>
                    </Ligne>
                  </>
                )}
                <Ligne label="Majeure">{derniere.majeure ? "Oui, certifié par la cliente" : "Non renseigné"}</Ligne>
                <Ligne label="Informations signalées">
                  {derniere.noteCliente ? (
                    <span className="whitespace-pre-wrap">« {derniere.noteCliente} »</span>
                  ) : (
                    "Aucune (champ laissé vide)"
                  )}
                </Ligne>
                <Ligne label="Référence">
                  {derniere.id} · texte version {derniere.version}
                </Ligne>
              </tbody>
            </table>

            <h2 className="mt-6 font-semibold text-stone-900">Texte accepté</h2>
            <p className="mt-2 whitespace-pre-wrap rounded-lg bg-stone-50 p-4">{derniere.texte}</p>

            {declarations.length > 1 && (
              <p className="mt-4 text-xs text-stone-500">
                {declarations.length - 1} autre(s) déclaration(s) pour ce rendez-vous :{" "}
                {declarations
                  .slice(1)
                  .map((d) => `${horodatage(d.accepteeLe)} (${d.source === "EN_LIGNE" ? "en ligne" : "au salon"})`)
                  .join(" ; ")}
                .
              </p>
            )}
          </>
        ) : (
          <>
            <h1 className="mt-4 text-xl font-bold text-stone-900">
              Déclaration santé · rendez-vous antérieur au registre
            </h1>
            <table className="mt-4 w-full">
              <tbody>
                <Ligne label="Cliente">
                  {rdv.cliente.prenom} {rdv.cliente.nom}
                </Ligne>
                <Ligne label="Coordonnées">
                  {rdv.cliente.email} · {rdv.cliente.telephone}
                </Ligne>
                <Ligne label="Rendez-vous">
                  {quand(rdv.debut)}
                </Ligne>
                <Ligne label="Prestations">{prestations}</Ligne>
                <Ligne label="Demande enregistrée le">{horodatage(rdv.creeLe)} (heure de Paris)</Ligne>
                <Ligne label="Informations signalées">
                  {rdv.noteCliente ? (
                    <span className="whitespace-pre-wrap">« {rdv.noteCliente} »</span>
                  ) : (
                    "Aucune (champ laissé vide)"
                  )}
                </Ligne>
              </tbody>
            </table>
            <p className="mt-4">
              Ce rendez-vous a été enregistré avant le registre des déclarations (13 novembre
              2026). Le site a seulement conservé une mention « déclaration santé acceptée » : il
              ne garde ni l&rsquo;heure exacte, ni l&rsquo;adresse IP. Un rendez-vous noté à la main
              par Zélia portait aussi cette mention, sans que la cliente ait rien coché.
            </p>
            <h2 className="mt-5 font-semibold text-stone-900">
              Texte affiché aux réservations en ligne du 4 août au 13 novembre 2026
            </h2>
            <p className="mt-2 rounded-lg bg-stone-50 p-4">{DECLARATION_HISTORIQUE.texte}</p>
          </>
        )}

        <p className="mt-8 border-t border-stone-200 pt-3 text-xs text-stone-500">
          Document édité le {horodatage(new Date())}.
        </p>
      </article>

      {papier && (
        <form action={signer} className="mt-4 rounded-2xl border border-pink-100 bg-white p-5 text-sm">
          <p>
            Imprimez ce formulaire, faites-le remplir et signer par la cliente avant la prestation, et
            gardez l&rsquo;original. Puis enregistrez-le ici :
          </p>
          <button
            type="submit"
            className="mt-3 rounded-full bg-emerald-600 px-5 py-2 font-medium text-white hover:bg-emerald-700"
          >
            ✓ La cliente a signé ce formulaire
          </button>
        </form>
      )}
    </div>
  );
}
