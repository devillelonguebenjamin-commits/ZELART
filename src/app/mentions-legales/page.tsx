import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mentions légales — Zelart Nails",
};

export default function MentionsLegales() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <h1 className="font-display text-3xl font-bold">Mentions légales</h1>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/80">
        <section>
          <h2 className="font-display text-xl font-bold text-foreground">Éditeur du site</h2>
          <p className="mt-2">
            Zélia Barreteau — Zelart, entrepreneuse individuelle (auto-entrepreneur), prothésiste
            ongulaire.
            <br />
            SIRET : 903 178 101 00015
            <br />
            Adresse d&rsquo;exercice : L&rsquo;Atelier du Regard, 108 avenue de la République, 44600
            Saint-Nazaire
            <br />
            Contact : Zelia.barreteaupro@outlook.fr — 06 45 29 20 01 (SMS uniquement)
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
            il est déduit du montant final et n&rsquo;est pas remboursable en cas d&rsquo;annulation
            ou de non-présentation. Un report est accepté une seule fois.
          </p>
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
