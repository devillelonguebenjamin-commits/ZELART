import Carrousel from "@/components/Carrousel";
import { TraitVagues } from "@/components/Vagues";
import type { FicheAvis } from "@/lib/avis";

function Etoiles({ note, taille = 15 }: { note: number; taille?: number }) {
  const pleines = Math.round(note);
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`${note} étoiles sur 5`}>
      {[1, 2, 3, 4, 5].map((rang) => (
        <svg
          key={rang}
          aria-hidden
          width={taille}
          height={taille}
          viewBox="0 0 24 24"
          fill="currentColor"
          className={rang <= pleines ? "text-amber-400" : "text-pink-100"}
        >
          <path d="M12 2l2.95 5.98 6.6.96-4.78 4.66 1.13 6.57L12 17.07l-5.9 3.1 1.13-6.57L2.45 8.94l6.6-.96L12 2z" />
        </svg>
      ))}
    </span>
  );
}

function Portrait({ nom, photo }: { nom: string; photo: string | null }) {
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt=""
        width={40}
        height={40}
        loading="lazy"
        draggable={false}
        // La photo est servie par Google : on ne lui transmet pas l'adresse de
        // la page d'où vient la visiteuse.
        referrerPolicy="no-referrer"
        className="size-10 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden
      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-pink-100 font-semibold text-pink-600"
    >
      {nom.slice(0, 1).toUpperCase()}
    </span>
  );
}

/**
 * Avis Google, tels que Google les renvoie : texte intégral, auteur crédité,
 * lien vers son profil. Les conditions d'utilisation interdisent de les
 * retoucher ou de les tronquer, et imposent l'attribution — d'où le lien vers
 * la fiche en pied de section.
 */
export default function AvisGoogle({ fiche }: { fiche: FicheAvis | null }) {
  if (!fiche || fiche.avis.length === 0) return null;

  return (
    <section className="py-10">
      <h2 className="font-display text-center text-3xl font-bold">
        Ce qu&rsquo;en disent mes clientes 💬
      </h2>
      <TraitVagues className="mx-auto mt-4" />

      {fiche.note !== null && (
        <p className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-foreground/70">
          <Etoiles note={fiche.note} taille={18} />
          <span>
            <strong className="text-foreground/90">
              {fiche.note.toString().replace(".", ",")}
            </strong>{" "}
            sur 5
            {fiche.nombre !== null && ` — ${fiche.nombre} avis sur Google`}
          </span>
        </p>
      )}

      <div className="mt-8">
        <Carrousel libelle="Avis laissés par les clientes sur Google">
          {fiche.avis.map((avis) => (
            <li
              key={`${avis.auteur}-${avis.quand}-${avis.texte.slice(0, 24)}`}
              className="w-[86%] shrink-0 snap-center sm:w-[52%] lg:w-[38%]"
            >
              <figure className="flex h-full flex-col rounded-3xl border border-pink-100 bg-white p-6 shadow-sm">
                <Etoiles note={avis.note} />
                <blockquote className="mt-4 grow leading-relaxed whitespace-pre-line text-foreground/80">
                  {avis.texte}
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-pink-50 pt-4">
                  <Portrait nom={avis.auteur} photo={avis.photoAuteur} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-foreground/90">
                      {avis.urlAuteur ? (
                        <a
                          href={avis.urlAuteur}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="hover:text-pink-500"
                        >
                          {avis.auteur}
                        </a>
                      ) : (
                        avis.auteur
                      )}
                    </span>
                    <span className="block text-xs text-foreground/55">{avis.quand}</span>
                  </span>
                </figcaption>
              </figure>
            </li>
          ))}
        </Carrousel>
      </div>

      <p className="mt-6 text-center text-xs text-foreground/55">
        Avis publiés sur Google, repris tels quels.
        {fiche.urlGoogle && (
          <>
            {" "}
            <a
              href={fiche.urlGoogle}
              target="_blank"
              rel="noreferrer noopener"
              className="font-medium text-pink-600 hover:underline"
            >
              Voir la fiche Google
            </a>
          </>
        )}
      </p>
    </section>
  );
}
