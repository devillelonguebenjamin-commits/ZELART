import {
  analyserExpediteur,
  cleBrevoMalFormee,
  expediteurConfigure,
  fournisseurEmail,
  verifierExpediteurBrevo,
} from "@/lib/email";
import { modeStockage, stockageConfigure } from "@/lib/blob";
import TestEmailForm from "@/components/TestEmailForm";
import ReglagesAcompteForm from "@/components/ReglagesAcompteForm";
import {
  CLE_AUTRE_RESEAU,
  CLE_AUTRE_RESEAU_LIBELLE,
  CLE_INSTAGRAM,
  CLE_TIKTOK,
  cleRelance,
  reglagesAcompte,
  reglagesRappels,
} from "@/lib/parametres";
import { prisma } from "@/lib/prisma";
import ReglagesRappelsForm from "@/components/ReglagesRappelsForm";
import ReglagesReseauxForm from "@/components/ReglagesReseauxForm";
import ReglagesAvisForm from "@/components/ReglagesAvisForm";
import { CLE_ETABLISSEMENT, cleGoogle } from "@/lib/avis";
import { verifierSumUp } from "@/lib/sumup";
import { dernierEchecConnexion } from "@/lib/parametres";
import { formatJour } from "@/lib/creneaux";

export const dynamic = "force-dynamic";

function Ligne({
  label,
  valeur,
  ok,
  aide,
}: {
  label: string;
  valeur: string;
  ok: boolean;
  aide?: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-pink-50 px-5 py-3 last:border-0">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {aide && <p className="mt-0.5 text-xs text-foreground/60">{aide}</p>}
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="break-all text-foreground/75">{valeur}</span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            ok ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
          }`}
        >
          {ok ? "OK" : "à faire"}
        </span>
      </div>
    </div>
  );
}

export default async function Reglages() {
  const [acompte, rappels, expediteurBrevo, parametresReseaux, sumup, echecConnexion] = await Promise.all([
    reglagesAcompte(),
    reglagesRappels(),
    verifierExpediteurBrevo(),
    prisma.parametre.findMany({
      where: {
        cle: {
          in: [
            CLE_INSTAGRAM,
            CLE_TIKTOK,
            CLE_AUTRE_RESEAU,
            CLE_AUTRE_RESEAU_LIBELLE,
            CLE_ETABLISSEMENT,
          ],
        },
      },
    }),
    verifierSumUp(),
    dernierEchecConnexion(),
  ]);
  const reseau = (cle: string) => parametresReseaux.find((p) => p.cle === cle)?.valeur ?? "";
  const etablissementGoogle = reseau(CLE_ETABLISSEMENT);
  const avisGoogleActifs = Boolean(cleGoogle()) && Boolean(etablissementGoogle);
  const planificationPrete = Boolean(process.env.CRON_SECRET);
  const fournisseur = fournisseurEmail();
  const notify = process.env.NOTIFY_EMAIL ?? "";
  const expediteur = expediteurConfigure();
  const blob = stockageConfigure();
  // Noms (jamais les valeurs) des variables liées au stockage, pour diagnostic
  const variablesBlob = Object.keys(process.env).filter((nom) => nom.includes("BLOB"));

  const cleRefusee = !expediteurBrevo.verifiable && expediteurBrevo.cleRefusee === true;

  const expediteurResendInvalide =
    fournisseur === "resend" && Boolean(process.env.EMAIL_FROM) && !expediteur.includes("resend.dev");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Réglages &amp; diagnostic</h1>
        <p className="mt-1 text-sm text-foreground/60">
          État de la configuration du site et test d&rsquo;envoi des e-mails.
        </p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-pink-100 bg-white">
        <Ligne
          label="Service d'envoi d'e-mails"
          valeur={
            fournisseur === "brevo" && cleRefusee ? "clé refusée par Brevo" : (fournisseur ?? "aucun")
          }
          ok={Boolean(fournisseur) && !cleRefusee}
          aide={
            cleRefusee
              ? cleBrevoMalFormee()
                ? "La clé ne commence pas par « xkeysib- » : c'est sans doute le mot de passe SMTP. Prenez la clé de l'onglet « API keys » de Brevo."
                : "Brevo ne reconnaît pas cette clé. Régénérez-en une dans « API keys » et recollez-la dans BREVO_API_KEY."
              : "BREVO_API_KEY ou RESEND_API_KEY"
          }
        />
        <Ligne
          label="Adresse qui reçoit les demandes"
          valeur={notify || "non défini"}
          ok={Boolean(notify)}
          aide="NOTIFY_EMAIL"
        />
        <Ligne
          label="Adresse expéditrice"
          valeur={
            fournisseur === "brevo" && process.env.EMAIL_FROM
              ? analyserExpediteur(process.env.EMAIL_FROM).adresse
              : expediteur
          }
          ok={
            Boolean(fournisseur) &&
            !expediteurResendInvalide &&
            (!expediteurBrevo.verifiable || expediteurBrevo.valide)
          }
          aide={
            !expediteurBrevo.verifiable
              ? "EMAIL_FROM"
              : expediteurBrevo.valide
                ? "EMAIL_FROM — vérifiée chez Brevo"
                : `Non vérifiée chez Brevo. Adresses validées : ${expediteurBrevo.connus.join(", ") || "aucune"}`
          }
        />
        <Ligne
          label="Rappels automatiques aux clientes"
          valeur={rappels.actifs ? "activés" : "désactivés"}
          ok={rappels.actifs}
          aide="Rappel de la veille, relance de repousse, demande d'avis, reconquête"
        />
        {/* Signalé à part, et quel que soit l'état du réglage ci-dessus : sans
            ce secret, la tâche quotidienne ne s'exécute pas du tout — donc ni
            les rappels aux clientes, ni le récapitulatif de ce qui vous attend,
            qui lui ne dépend pourtant pas de ce réglage. */}
        <Ligne
          label="Exécution quotidienne (7 h)"
          valeur={planificationPrete ? "en place" : "secret manquant"}
          ok={planificationPrete}
          aide={
            planificationPrete
              ? "CRON_SECRET — porte aussi le récapitulatif quotidien des demandes en attente"
              : "CRON_SECRET absent : aucune tâche ne s'exécute, y compris le récapitulatif des demandes en attente"
          }
        />
        <Ligne
          label="Envoi automatique de l'acompte"
          valeur={acompte.lien ? "activé" : "manuel"}
          ok={Boolean(acompte.lien)}
          aide="lien de paiement SumUp réutilisable"
        />
        <Ligne
          label="API SumUp (press-on)"
          valeur={
            !sumup.cleValide && sumup.erreur
              ? "clé refusée"
              : !sumup.cleValide
                ? "non configurée"
                : !sumup.configure
                  ? "clé valide, code marchand manquant"
                  : !sumup.codeCorrect
                    ? "code marchand incorrect"
                    : sumup.bacASable
                      ? "reliée à un compte de test"
                      : "connectée"
          }
          ok={sumup.cleValide && sumup.configure && sumup.codeCorrect && !sumup.bacASable}
          aide={
            sumup.erreur ??
            (sumup.cleValide && sumup.marchands.length > 0
              ? // Nom et drapeau « test » plutôt que des codes nus : avec deux
                // comptes rattachés à la même clé, un code seul ne permet pas
                // de choisir.
                `${sumup.marchands.length > 1 ? "Cette clé ouvre plusieurs comptes — " : ""}${sumup.marchands
                  .map(
                    (m) =>
                      `${m.nom} : ${m.code}${m.bacASable ? " (compte de test, n'encaisse rien)" : ""}`
                  )
                  .join(" · ")}`
              : "SUMUP_API_KEY + SUMUP_MERCHANT_CODE — sans elles, vous collez le lien de paiement à la main sur chaque commande")
          }
        />
        <Ligne
          label="Avis Google"
          valeur={
            !cleGoogle() ? "clé absente" : etablissementGoogle ? "affichés" : "aucun établissement"
          }
          ok={avisGoogleActifs}
          aide="GOOGLE_PLACES_API_KEY + établissement à connecter ci-dessous"
        />
        <Ligne
          label="Stockage des photos"
          valeur={blob ? "connecté" : "non connecté"}
          ok={blob}
          aide={blob ? modeStockage() : "onglet Storage de Vercel"}
        />
      </section>

      {/* Une cliente qui n'a pas reçu son lien ne peut pas le signaler autrement :
          la réponse qu'elle a lue annonçait un envoi réussi. */}
      {echecConnexion && (
        <div className="rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-800">
          <p className="font-semibold">Un lien de connexion n&rsquo;a pas pu être envoyé</p>
          <p className="mt-1">
            Le {formatJour(new Date(echecConnexion.date))}, à destination de{" "}
            <strong>{echecConnexion.adresse}</strong>. La cliente a lu que le lien était parti :
            elle attend un e-mail qui n&rsquo;arrivera pas.
          </p>
          <p className="mt-1 text-xs">{echecConnexion.erreur}</p>
          <p className="mt-2 text-xs">
            Corrigez l&rsquo;envoi d&rsquo;e-mails ci-dessus, puis demandez-lui de refaire une
            demande de lien. Ce message disparaîtra au premier envoi réussi.
          </p>
        </div>
      )}

      {!blob && (
        <div className="rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-900">
          <p className="font-semibold">Le magasin de photos n&rsquo;est pas relié à ce projet</p>
          <p className="mt-1">
            Ouvrez l&rsquo;onglet <strong>Storage</strong> du projet sur Vercel et reliez-y le
            magasin <em>zelart-photos</em> pour les environnements Production et Preview, puis
            redéployez.
          </p>
          <p className="mt-2">
            Variables liées au stockage vues par le site :{" "}
            <code>{variablesBlob.length > 0 ? variablesBlob.join(", ") : "aucune"}</code>
          </p>
        </div>
      )}

      {expediteurResendInvalide && (
        <div className="rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-900">
          <p className="font-semibold">Cette adresse expéditrice sera refusée par Resend</p>
          <p className="mt-1">
            Sans nom de domaine vérifié, Resend n&rsquo;autorise qu&rsquo;un seul expéditeur :{" "}
            <code>onboarding@resend.dev</code>. Supprimez la variable <code>EMAIL_FROM</code> dans
            Vercel (ou donnez-lui la valeur <code>Zelart Nails &lt;onboarding@resend.dev&gt;</code>),
            puis redéployez.
          </p>
        </div>
      )}

      <section className="rounded-2xl border border-pink-100 bg-white p-5">
        <h2 className="font-semibold">Rappels et relances automatiques</h2>
        <p className="mt-1 text-xs text-foreground/60">
          Le rappel de la veille réduit les oublis ; la relance de repousse invite la cliente à
          reprendre rendez-vous au bon moment, selon la technique qu&rsquo;elle porte.
        </p>
        <div className="mt-4">
          <ReglagesRappelsForm
            actifs={rappels.actifs}
            delais={[
              { cle: cleRelance("VSP"), libelle: "Vernis semi-permanent", jours: rappels.delais.VSP },
              { cle: cleRelance("GAINAGE"), libelle: "Gainage", jours: rappels.delais.GAINAGE },
              { cle: cleRelance("GEL_X"), libelle: "Pose Gel X", jours: rappels.delais.GEL_X },
              { cle: cleRelance("POP_IT"), libelle: "Pose Pop-it", jours: rappels.delais.POP_IT },
            ]}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-pink-100 bg-white p-5">
        <h2 className="font-semibold">Acompte des nouvelles clientes</h2>
        <p className="mt-1 text-xs text-foreground/60">
          Collez ici votre <strong>lien de paiement réutilisable</strong> SumUp : il sera envoyé
          automatiquement par e-mail à chaque cliente qui réserve pour la première fois, avec une
          relance automatique au bout de 24 h si le paiement ne suit pas. Pour le créer :
          application SumUp → <em>Paiements par lien</em> → montant fixe →{" "}
          <em>Activer lien réutilisable</em>. Laissez le champ vide pour continuer à l&rsquo;envoyer
          vous-même.
        </p>
        <div className="mt-4">
          <ReglagesAcompteForm
            lien={acompte.lien ?? ""}
            montantEuros={(acompte.montantCents / 100).toString().replace(".", ",")}
          />
        </div>
      </section>

      <ReglagesReseauxForm
        instagram={reseau(CLE_INSTAGRAM)}
        tiktok={reseau(CLE_TIKTOK)}
        autre={reseau(CLE_AUTRE_RESEAU)}
        autreLibelle={reseau(CLE_AUTRE_RESEAU_LIBELLE)}
      />

      <ReglagesAvisForm etablissement={etablissementGoogle} cleConfiguree={Boolean(cleGoogle())} />

      <section className="rounded-2xl border border-pink-100 bg-white p-5">
        <h2 className="font-semibold">Tester l&rsquo;envoi</h2>
        <p className="mt-1 text-xs text-foreground/60">
          En cas d&rsquo;échec, le message d&rsquo;erreur exact du service est affiché ci-dessous.
        </p>
        <div className="mt-3">
          <TestEmailForm defaut={notify} />
        </div>
      </section>

      <section className="rounded-2xl bg-pink-50 px-5 py-4 text-sm text-foreground/75">
        <p className="font-semibold text-foreground/90">Rappel des limites sans nom de domaine</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong>Resend</strong> : envoi uniquement depuis <code>onboarding@resend.dev</code>, et
            uniquement vers l&rsquo;adresse du compte Resend.
          </li>
          <li>
            <strong>Brevo</strong> : envoi vers n&rsquo;importe qui, depuis toute adresse validée
            dans Paramètres → Expéditeurs.
          </li>
        </ul>
      </section>
    </div>
  );
}
