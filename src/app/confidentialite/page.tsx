import type { Metadata } from "next";
import {
  CONSERVATION_CLIENTE_ANS,
  CONSERVATION_DECLARATION_ANS,
  CONSERVATION_LISTE_ATTENTE_ANS,
} from "@/lib/conservation-durees";

export const metadata: Metadata = {
  title: "Protection des données · Zelart Nails",
};

// Les durées viennent de src/lib/conservation-durees.ts, appliquées chaque
// matin par src/lib/conservation.ts : la page ne peut pas annoncer un délai
// que le site ne respecte pas.

const CONTACT = "Zelia.barreteaupro@outlook.fr";

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl font-bold text-foreground">{titre}</h2>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  );
}

export default function Confidentialite() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <h1 className="font-display text-3xl font-bold">Protection de vos données</h1>
      <p className="mt-3 text-sm text-foreground/60">
        J&rsquo;attache de l&rsquo;importance à la confidentialité des informations que vous me
        confiez. Voici, en toute transparence, ce qui est collecté, pourquoi, avec qui c&rsquo;est
        partagé et combien de temps c&rsquo;est gardé.
      </p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/80">
        <Section titre="Qui gère vos données">
          <p>
            Zélia Barreteau, Zelart (SIRET 903 178 101 00015), 108 avenue de la République, 44600
            Saint-Nazaire, responsable du traitement. Pour toute question : {CONTACT}.
          </p>
        </Section>

        <Section titre="Ce qui est collecté, et pourquoi">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Prénom, nom, e-mail et téléphone, rendez-vous et prestations</strong> : pour
              gérer votre rendez-vous, vous le confirmer et vous le rappeler par e-mail et par SMS.
              Sans elles, la réservation n&rsquo;est pas possible. <em>Base : le contrat.</em>
            </li>
            <li>
              <strong>Votre message et vos informations de santé</strong> (allergies, traitements…),
              et les <strong>notes de suivi</strong> de Zélia : pour adapter la prestation et
              garantir votre sécurité. Ces notes ne sont visibles que de moi.{" "}
              <em>Base : votre accord explicite, donné par la déclaration santé.</em>
            </li>
            <li>
              <strong>Votre déclaration santé</strong> (case cochée en réservant, ou formulaire
              signé au salon) : le texte accepté, la date et l&rsquo;heure, et pour une réservation
              en ligne l&rsquo;adresse IP et le type d&rsquo;appareil utilisés. Elle établit que
              vous avez été informée des risques liés aux produits et que vous avez déclaré vos
              allergies. <em>Base : mon intérêt légitime à pouvoir le prouver en cas de litige.</em>
            </li>
            <li>
              <strong>Photos d&rsquo;inspiration</strong> que vous joignez à une demande : pour
              préparer votre nail art. <em>Base : le contrat.</em>
            </li>
            <li>
              <strong>Historique de vos rendez-vous, fiche technique</strong> (produits, teintes),
              photos de la pose réalisée, <strong>fidélité et parrainage</strong> : pour le suivi
              de vos poses et vos avantages. <em>Base : le contrat.</em>
            </li>
            <li>
              <strong>Commandes de press-on</strong> : mesures, choix, adresse de livraison pour un
              envoi. <em>Base : le contrat.</em>
            </li>
            <li>
              <strong>Messages échangés</strong> depuis votre espace : pour vous répondre.{" "}
              <em>Base : le contrat.</em>
            </li>
            <li>
              <strong>Demande d&rsquo;avis Google</strong> après une prestation, et{" "}
              <strong>rappels pour reprendre rendez-vous</strong> : chaque message contient un lien
              pour ne plus les recevoir. <em>Base : mon intérêt légitime.</em>
            </li>
            <li>
              <strong>Offres et actualités</strong>, seulement si vous l&rsquo;avez accepté :
              accord facultatif, révocable à tout moment par le lien présent dans chaque e-mail.{" "}
              <em>Base : votre accord.</em>
            </li>
            <li>
              <strong>Liste d&rsquo;attente</strong> : prénom, e-mail, disponibilités, pour vous
              prévenir si un créneau se libère. <em>Base : votre demande.</em>
            </li>
          </ul>
          <p>
            Le paiement de l&rsquo;acompte et des press-on se fait sur la page sécurisée de SumUp :
            le site ne voit jamais vos coordonnées bancaires.
          </p>
        </Section>

        <Section titre="Combien de temps elles sont conservées">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Votre fiche</strong> (coordonnées, historique, notes, photos
              d&rsquo;inspiration, messages, fidélité) : tant que vous venez, puis{" "}
              <strong>{CONSERVATION_CLIENTE_ANS} ans</strong> après votre dernier contact (dernier
              rendez-vous, commande ou message). Elle est ensuite supprimée automatiquement.
            </li>
            <li>
              <strong>Les déclarations santé</strong> :{" "}
              <strong>{CONSERVATION_DECLARATION_ANS} ans</strong> après le rendez-vous concerné, y
              compris si vous demandez la suppression de votre fiche. Elles servent à établir les
              faits en cas de réaction ou de litige (RGPD, article 17.3.e) et ne sont consultées que
              dans ce cas.
            </li>
            <li>
              <strong>La liste d&rsquo;attente</strong> : {CONSERVATION_LISTE_ATTENTE_ANS} an après
              l&rsquo;inscription.
            </li>
            <li>
              Les pièces comptables sont conservées dix ans, comme la loi l&rsquo;impose, en dehors
              du site.
            </li>
          </ul>
          <p>Vous pouvez demander la suppression de votre fiche à tout moment, sans attendre.</p>
        </Section>

        <Section titre="Qui y a accès">
          <p>
            Moi seule. Vos données ne sont ni vendues, ni cédées, ni utilisées à des fins
            publicitaires. Elles passent par les prestataires techniques qui font fonctionner le
            site, chacun pour sa seule mission :
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Vercel</strong> (États-Unis) : hébergement du site, stockage des photos et
              mesure d&rsquo;audience anonyme. Le transfert hors de l&rsquo;Union européenne est
              encadré par le Data Privacy Framework et les clauses contractuelles types de la
              Commission européenne.
            </li>
            <li>
              <strong>Neon</strong> : base de données, hébergée dans l&rsquo;Union européenne.
            </li>
            <li>
              <strong>Brevo</strong> (France) : envoi des e-mails et des SMS.
            </li>
            <li>
              <strong>SumUp</strong> : paiement en ligne de l&rsquo;acompte et des press-on. SumUp
              traite vos données de paiement sous sa propre responsabilité.
            </li>
            <li>
              <strong>Google</strong> : affichage des avis de ma fiche Google (voir ci-dessous). Si
              vous laissez un avis, c&rsquo;est sur le site de Google, selon ses propres règles.
            </li>
          </ul>
        </Section>

        <Section titre="Vos droits">
          <p>
            Vous pouvez à tout moment accéder à vos données, les corriger, les faire supprimer,
            demander à en limiter l&rsquo;usage, vous opposer à leur utilisation, les récupérer dans
            un format lisible, retirer votre accord, et donner des directives sur leur sort après
            votre décès. Il suffit d&rsquo;écrire à {CONTACT}. La demande est traitée dans un délai
            d&rsquo;un mois.
          </p>
          <p>
            Si une réponse ne vous satisfait pas, vous pouvez saisir la CNIL (www.cnil.fr).
          </p>
        </Section>

        <Section titre="Avis Google">
          <p>
            La page d&rsquo;accueil reprend les avis publiés sur ma fiche Google. Le site les
            récupère lui-même auprès de Google et les conserve quelques heures : votre visite
            n&rsquo;est pas signalée à Google. Seule la photo de profil des personnes ayant laissé
            un avis est chargée depuis les serveurs de Google, sans leur transmettre la page que
            vous consultez.
          </p>
        </Section>

        <Section titre="Cookies et mesure d'audience">
          <p>
            Ce site n&rsquo;utilise aucun cookie publicitaire ni de suivi. Seuls des cookies
            techniques, indispensables, sont déposés : celui qui garde votre espace cliente ouvert
            quand vous vous connectez, et ceux de mon espace de gestion. Ils ne demandent pas de
            consentement.
          </p>
          <p>
            La fréquentation du site est mesurée par Vercel Web Analytics, sans cookie et sans
            identifier les visiteuses : seuls des chiffres globaux (pages vues, pays, type
            d&rsquo;appareil) sont conservés.
          </p>
        </Section>

        <Section titre="Sécurité">
          <p>
            Le site est accessible uniquement en connexion chiffrée (HTTPS). Votre espace cliente
            est protégé par un lien de connexion à usage unique ou par votre mot de passe, et
            l&rsquo;espace de gestion par un mot de passe.
          </p>
        </Section>
      </div>
    </div>
  );
}
