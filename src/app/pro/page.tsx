import Link from "next/link";
import { partenairesPublics } from "@/lib/partenaires";
import { TraitVagues } from "@/components/Vagues";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mon matériel et mes formations",
  description:
    "Les marques avec lesquelles je travaille, ce que j'utilise au quotidien et pourquoi. Une page pour les prothésistes ongulaires, pas pour la prise de rendez-vous.",
};

// Une page pour les consœurs, délibérément à l'écart du parcours des clientes.
//
// Une cliente de Saint-Nazaire venue prendre rendez-vous n'achètera jamais une
// lampe ni une formation : lui montrer du matériel professionnel brouillerait
// son parcours sans rien rapporter. Le public de cette page est ailleurs,
// souvent loin, et arrive d'Instagram ou d'une recherche sur une marque. D'où
// l'absence de lien dans la navigation principale, et sa présence en pied de
// page.

export default async function Pro() {
  const partenaires = await partenairesPublics();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-sm uppercase tracking-[0.25em] text-pink-400">Entre nous</p>
      <h1 className="font-display mt-3 text-3xl font-bold sm:text-4xl">
        Mon matériel et mes formations
      </h1>
      <TraitVagues className="mt-5" />

      <p className="mt-6 text-lg leading-relaxed text-foreground/80">
        On me demande souvent ce que j&rsquo;utilise. Plutôt que de répondre dix fois par semaine
        en message privé, je le mets ici. Je ne cite que ce dont je me sers réellement, et je dis
        aussi ce qui me plaît moins : un avis qui ne vaut que du bien ne vaut rien.
      </p>

      {partenaires.length > 0 ? (
        <div className="mt-10 space-y-6">
          {partenaires.map((partenaire) => (
            <article
              key={partenaire.id}
              className="rounded-3xl border border-pink-100 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-4">
                {partenaire.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={partenaire.logoUrl}
                    alt={partenaire.nom}
                    className="h-12 w-auto max-w-[9rem] object-contain"
                  />
                )}
                <div>
                  <h2 className="font-display text-xl font-bold">{partenaire.nom}</h2>
                  {partenaire.categorie && (
                    <p className="text-sm text-foreground/55">{partenaire.categorie}</p>
                  )}
                </div>
              </div>

              {partenaire.description && (
                <p className="mt-4 whitespace-pre-line leading-relaxed text-foreground/80">
                  {partenaire.description}
                </p>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <a
                  href={`/${partenaire.slug}`}
                  // « sponsored » signale un lien rémunéré, « nofollow » évite de
                  // transmettre de la popularité : c'est ce que Google demande, et
                  // s'en dispenser expose ce site, pas celui du partenaire.
                  rel="sponsored nofollow noopener"
                  target="_blank"
                  className="rounded-full bg-pink-500 px-6 py-2.5 font-medium text-white shadow-sm transition hover:bg-pink-600"
                >
                  Découvrir {partenaire.nom}
                </a>
                {partenaire.codePromo && (
                  <p className="text-sm text-foreground/70">
                    Code{" "}
                    <strong className="rounded-lg bg-pink-50 px-2 py-1 font-mono text-pink-600">
                      {partenaire.codePromo}
                    </strong>{" "}
                    de ma part
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-10 rounded-3xl bg-pink-50 px-6 py-5 text-foreground/70">
          Cette page se remplit bientôt.
        </p>
      )}

      {/* La mention doit être lisible sans cliquer et se trouver près des liens
          concernés : c'est ce qu'impose la loi du 9 juin 2023 sur l'influence
          commerciale. En bas de page en petits caractères, elle ne vaudrait rien. */}
      <p className="mt-8 rounded-2xl border border-pink-100 bg-white px-5 py-4 text-sm text-foreground/70">
        <strong className="font-semibold text-foreground/85">Collaboration commerciale.</strong> Les
        liens ci-dessus sont des liens partenaires : si vous commandez après avoir cliqué, je touche
        une commission. Cela ne change rien au prix que vous payez, et je ne recommande que ce que
        j&rsquo;utilise.
      </p>

      <section className="mt-14 rounded-3xl bg-pink-50 px-6 py-7">
        <h2 className="font-display text-xl font-bold">Vous êtes une marque ?</h2>
        <p className="mt-3 leading-relaxed text-foreground/80">
          Je travaille sur des mains, pas seulement devant un écran : un produit se voit en
          situation, sur des clientes, chaque semaine. Si vous cherchez quelqu&rsquo;un pour tester
          et montrer honnêtement, écrivez-moi. Je réponds à tout le monde, y compris pour dire non.
        </p>
        <p className="mt-4">
          <a
            href="mailto:Zelia.barreteaupro@outlook.fr?subject=Proposition%20de%20partenariat"
            className="inline-block rounded-full bg-pink-500 px-6 py-2.5 font-medium text-white shadow-sm transition hover:bg-pink-600"
          >
            Me proposer un partenariat
          </a>
        </p>
      </section>

      <p className="mt-10 text-sm text-foreground/60">
        Vous cherchiez plutôt un rendez-vous ?{" "}
        <Link href="/reserver" className="font-medium text-pink-600 hover:underline">
          C&rsquo;est par ici
        </Link>
        .
      </p>
    </div>
  );
}
