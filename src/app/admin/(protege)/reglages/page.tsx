import { expediteurConfigure, fournisseurEmail } from "@/lib/email";
import { modeStockage, stockageConfigure } from "@/lib/blob";
import TestEmailForm from "@/components/TestEmailForm";

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

export default function Reglages() {
  const fournisseur = fournisseurEmail();
  const notify = process.env.NOTIFY_EMAIL ?? "";
  const expediteur = expediteurConfigure();
  const blob = stockageConfigure();
  // Noms (jamais les valeurs) des variables liées au stockage, pour diagnostic
  const variablesBlob = Object.keys(process.env).filter((nom) => nom.includes("BLOB"));

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
          valeur={fournisseur ?? "aucun"}
          ok={Boolean(fournisseur)}
          aide="BREVO_API_KEY ou RESEND_API_KEY"
        />
        <Ligne
          label="Adresse qui reçoit les demandes"
          valeur={notify || "non défini"}
          ok={Boolean(notify)}
          aide="NOTIFY_EMAIL"
        />
        <Ligne
          label="Adresse expéditrice"
          valeur={expediteur}
          ok={Boolean(fournisseur) && !expediteurResendInvalide}
          aide="EMAIL_FROM"
        />
        <Ligne
          label="Stockage des photos"
          valeur={blob ? "connecté" : "non connecté"}
          ok={blob}
          aide={blob ? modeStockage() : "onglet Storage de Vercel"}
        />
      </section>

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
