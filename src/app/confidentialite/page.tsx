import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Protection des données — Zelart Nails",
};

export default function Confidentialite() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <h1 className="font-display text-3xl font-bold">Protection de vos données</h1>
      <p className="mt-3 text-sm text-foreground/60">
        Zélia attache de l&rsquo;importance à la confidentialité des informations que vous lui
        confiez. Voici, en toute transparence, ce qui est collecté et pourquoi.
      </p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/80">
        <section>
          <h2 className="font-display text-xl font-bold text-foreground">Qui gère vos données</h2>
          <p className="mt-2">
            Zélia Barreteau — Zelart (SIRET 903 178 101 00015), 108 avenue de la République, 44600
            Saint-Nazaire. Pour toute question : Zelia.barreteaupro@outlook.fr.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-foreground">
            Ce qui est collecté, et pourquoi
          </h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              <strong>Prénom, nom, e-mail et téléphone</strong> — pour gérer votre rendez-vous et
              vous en confirmer la date. Ces données sont nécessaires : sans elles, la réservation
              n&rsquo;est pas possible.
            </li>
            <li>
              <strong>Message laissé à la réservation et notes de suivi</strong> (préférences,
              allergies éventuelles) — pour adapter la prestation et garantir votre sécurité. Ces
              notes sont visibles de Zélia seule.
            </li>
            <li>
              <strong>Historique de vos rendez-vous</strong> — pour assurer le suivi de vos poses.
            </li>
            <li>
              <strong>Votre accord pour recevoir des offres</strong>, si vous l&rsquo;avez donné —
              pour vous informer des nouveautés et offres de fidélité. Cet accord est facultatif et
              révocable à tout moment.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-foreground">
            Combien de temps sont-elles conservées
          </h2>
          <p className="mt-2">
            Vos coordonnées et votre historique sont conservés pendant <strong>trois ans</strong> à
            compter de votre dernier rendez-vous, puis supprimés. Vous pouvez demander leur
            suppression avant ce délai.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-foreground">Qui y a accès</h2>
          <p className="mt-2">
            Zélia uniquement. Vos données ne sont ni vendues, ni cédées, ni utilisées à des fins
            publicitaires par des tiers. Elles transitent techniquement par les prestataires qui font
            fonctionner le site : Vercel (hébergement), Neon (base de données, Union européenne) et
            Resend (envoi des e-mails).
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-foreground">Vos droits</h2>
          <p className="mt-2">
            Vous pouvez à tout moment demander à consulter, corriger ou supprimer vos données, vous
            opposer à leur utilisation, ou retirer votre accord pour les offres. Il suffit
            d&rsquo;écrire à Zelia.barreteaupro@outlook.fr — la demande est traitée dans un délai
            d&rsquo;un mois. Chaque e-mail d&rsquo;offre contient également un lien de désinscription
            immédiate.
          </p>
          <p className="mt-2">
            Si une réponse ne vous satisfait pas, vous pouvez saisir la CNIL (www.cnil.fr).
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-foreground">Cookies</h2>
          <p className="mt-2">
            Ce site n&rsquo;utilise aucun cookie publicitaire ni de mesure d&rsquo;audience. Seul un
            cookie technique est déposé lorsque Zélia se connecte à son espace de gestion, afin de
            maintenir sa session ouverte.
          </p>
        </section>
      </div>
    </div>
  );
}
