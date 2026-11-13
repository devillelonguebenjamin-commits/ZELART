import type { Metadata } from "next";
import { DELAI_ANNULATION_H } from "@/lib/annulation";

export const metadata: Metadata = {
  title: "Mentions légales · Zelart Nails",
};

export default function MentionsLegales() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <h1 className="font-display text-3xl font-bold">Mentions légales</h1>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/80">
        <section>
          <h2 className="font-display text-xl font-bold text-foreground">Éditeur du site</h2>
          <p className="mt-2">
            Zélia Barreteau (Zelart), entrepreneuse individuelle (auto-entrepreneur), prothésiste
            ongulaire.
            <br />
            SIRET : 903 178 101 00015
            <br />
            Adresse d&rsquo;exercice : L&rsquo;Atelier du Regard, 108 avenue de la République, 44600
            Saint-Nazaire
            <br />
            Contact : Zelia.barreteaupro@outlook.fr · 06 45 29 20 01 (SMS uniquement)
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-foreground">Hébergement</h2>
          <p className="mt-2">
            Le site est hébergé par Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis
            (vercel.com). Les données de réservation sont stockées au sein de l&rsquo;Union
            européenne.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-foreground">Prestations</h2>
          <p className="mt-2">
            Les prestations sont réalisées sur rendez-vous uniquement, réservées aux personnes
            majeures. Aucune pose n&rsquo;est réalisée sur les pieds. La prestataire se réserve le
            droit de refuser une prestation en cas de contre-indication visible (mycose, plaie…).
          </p>
          <p className="mt-2">
            Le règlement s&rsquo;effectue sur place, en espèces ou par carte bancaire (SumUp). Pour
            toute nouvelle cliente, un acompte de 15 € est demandé afin de confirmer le rendez-vous ;
            il est déduit du montant final.{" "}
            <strong>
              L&rsquo;acompte est perdu si la cliente ne prévient pas au moins {DELAI_ANNULATION_H}&nbsp;h
              à l&rsquo;avance
            </strong>{" "}
            (annulation ou non-présentation). Prévenue au moins {DELAI_ANNULATION_H}&nbsp;h avant, la cliente peut reporter
            son rendez-vous une seule fois en conservant son acompte.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-foreground">Press-on nails</h2>
          <p className="mt-2">
            Tous les press-on sont réalisés sur-mesure après échange avec la cliente. La remise
            s&rsquo;effectue en main propre, directement ou par un intermédiaire (proche,
            connaissance). Un envoi par voie postale est possible à la demande : les frais de
            livraison sont à la charge de la cliente et lui sont communiqués avant la validation de
            la commande.
          </p>
          <p className="mt-2">
            <strong>Livraison.</strong> Le colis voyage aux risques de la prestataire jusqu&rsquo;à
            sa réception par la cliente (code de la consommation, article L216-4). En cas de perte ou
            de détérioration pendant l&rsquo;acheminement, la prestataire refait le set ou rembourse
            la commande, et fait son affaire du recours contre le transporteur.
          </p>
          <p className="mt-2">
            <strong>Règlement.</strong> Les press-on étant fabriqués sur-mesure, une somme est
            réglée avant toute fabrication : la totalité (produits et frais de livraison) pour un
            envoi postal, l&rsquo;acompte pour une remise en main propre, le solde étant alors réglé
            à la remise. À défaut de règlement, la commande est annulée.
          </p>
          <p className="mt-2">
            <strong>Pas de droit de rétractation.</strong> Les press-on étant confectionnés selon les
            mesures et les choix de la cliente, et nettement personnalisés, le droit de rétractation
            ne s&rsquo;applique pas (code de la consommation, article L221-28, 3°). Un set conforme ne
            peut donc être ni repris ni remboursé pour un simple changement d&rsquo;avis.
          </p>
          <p className="mt-2">
            <strong>Garanties légales.</strong> Comme tout produit, les press-on bénéficient de la
            garantie légale de conformité pendant deux ans à compter de la remise, et de la garantie
            des vices cachés. En cas de défaut, la cliente obtient la réparation (ajustement) ou le
            remplacement du set, ou à défaut une réduction du prix ou le remboursement, selon les
            règles rappelées ci-dessous. L&rsquo;usure normale, ainsi qu&rsquo;une casse due à une
            pose, un entretien ou un usage contraires aux conseils fournis, ne constituent pas un
            défaut de conformité.
          </p>
          <div className="mt-3 rounded-xl border border-stone-300 bg-white p-4 text-xs leading-relaxed">
            <p className="font-semibold">Informations sur les garanties légales</p>
            <p className="mt-2">
              Le consommateur dispose d&rsquo;un délai de deux ans à compter de la délivrance du bien
              pour obtenir la mise en œuvre de la garantie légale de conformité en cas
              d&rsquo;apparition d&rsquo;un défaut de conformité. Durant ce délai, le consommateur
              n&rsquo;est tenu d&rsquo;établir que l&rsquo;existence du défaut de conformité et non
              la date d&rsquo;apparition de celui-ci.
            </p>
            <p className="mt-2">
              La garantie légale de conformité donne au consommateur droit à la réparation ou au
              remplacement du bien dans un délai de trente jours suivant sa demande, sans frais et
              sans inconvénient majeur pour lui.
            </p>
            <p className="mt-2">
              Si le bien est réparé dans le cadre de la garantie légale de conformité, le
              consommateur bénéficie d&rsquo;une extension de six mois de la garantie initiale. Si le
              consommateur demande la réparation du bien, mais que le vendeur impose le
              remplacement, la garantie légale de conformité est renouvelée pour une période de deux
              ans à compter de la date de remplacement du bien.
            </p>
            <p className="mt-2">
              Le consommateur peut obtenir une réduction du prix d&rsquo;achat en conservant le bien
              ou mettre fin au contrat en se faisant rembourser intégralement contre restitution du
              bien, si : 1° le professionnel refuse de réparer ou de remplacer le bien ; 2° la
              réparation ou le remplacement du bien intervient après un délai de trente jours ; 3° la
              réparation ou le remplacement du bien occasionne un inconvénient majeur pour le
              consommateur ; 4° la non-conformité du bien persiste en dépit de la tentative de mise en
              conformité du vendeur restée infructueuse.
            </p>
            <p className="mt-2">
              Le consommateur a également droit à une réduction du prix du bien ou à la résolution du
              contrat lorsque le défaut de conformité est si grave qu&rsquo;il justifie que la
              réduction du prix ou la résolution du contrat soit immédiate. Le consommateur n&rsquo;a
              pas droit à la résolution de la vente si le défaut de conformité est mineur. Toute
              période d&rsquo;immobilisation du bien en vue de sa réparation ou de son remplacement
              suspend la garantie qui restait à courir jusqu&rsquo;à la délivrance du bien remis en
              état.
            </p>
            <p className="mt-2">
              Les droits mentionnés ci-dessus résultent de l&rsquo;application des articles L. 217-1
              à L. 217-32 du code de la consommation. Le vendeur qui fait obstacle de mauvaise foi à
              la mise en œuvre de la garantie légale de conformité encourt une amende civile
              d&rsquo;un montant maximal de 300 000 euros, qui peut être porté jusqu&rsquo;à 10 % du
              chiffre d&rsquo;affaires moyen annuel (article L. 241-5 du code de la consommation).
            </p>
            <p className="mt-2">
              Le consommateur bénéficie également de la garantie légale des vices cachés en
              application des articles 1641 à 1649 du code civil, pour une durée de deux ans à compter
              de la découverte du défaut. Cette garantie donne droit à une réduction de prix si le
              bien est conservé ou à un remboursement intégral contre restitution du bien.
            </p>
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold text-foreground">Propriété intellectuelle</h2>
          <p className="mt-2">
            Les photographies de réalisations présentées sur ce site sont la propriété de Zélia
            Barreteau. Toute reproduction sans autorisation est interdite.
          </p>
        </section>
      </div>
    </div>
  );
}
