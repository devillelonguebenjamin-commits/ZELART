import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrix, grouperParCategorie } from "@/lib/format";
import { reglagesReseaux } from "@/lib/parametres";
import LiensReseaux from "@/components/LiensReseaux";
import Vagues, { TraitVagues } from "@/components/Vagues";
import Carrousel from "@/components/Carrousel";
import AvisGoogle from "@/components/AvisGoogle";
import { avisGoogle } from "@/lib/avis";
import { jsonLdSecurise } from "@/lib/json-ld";
import { urlSite } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function Accueil() {
  const [prestations, photos, realisations, pressOnMoinsCher, reseaux, avis] = await Promise.all([
    prisma.prestation.findMany({ where: { active: true }, orderBy: { ordre: "asc" } }),
    prisma.photo.findMany({ orderBy: [{ ordre: "asc" }, { creeLe: "desc" }], take: 12 }),
    prisma.realisation.findMany({
      where: { publiee: true },
      orderBy: { creeLe: "desc" },
      take: 12,
      select: { id: true, url: true },
    }),
    prisma.modelePressOn.findFirst({
      where: { actif: true },
      orderBy: { prixCents: "asc" },
      select: { prixCents: true },
    }),
    reglagesReseaux(),
    avisGoogle(),
  ]);
  // La galerie réunit les photos ajoutées à la main et les réalisations publiées.
  const visuels = [
    ...photos.map((p) => ({ id: p.id, url: p.url, legende: p.legende })),
    ...realisations.map((r) => ({ id: r.id, url: r.url, legende: null as string | null })),
  ].slice(0, 16);
  const categories = grouperParCategorie(prestations);

  // Repris par Google pour un encart enrichi dans les résultats de recherche
  // (adresse, téléphone, et note moyenne dès que les avis sont connectés).
  const donneesStructurees = {
    "@context": "https://schema.org",
    "@type": "NailSalon",
    name: "Zelart Nails",
    description:
      "Prothésiste ongulaire et nail artist certifiée à Saint-Nazaire : vernis semi-permanent, gainage, pose Gel X, pose Pop-it, nail art et press-on nails, sur rendez-vous.",
    url: urlSite(),
    telephone: "+33645292001",
    priceRange: "€€",
    address: {
      "@type": "PostalAddress",
      streetAddress: "108 avenue de la République",
      addressLocality: "Saint-Nazaire",
      postalCode: "44600",
      addressCountry: "FR",
    },
    ...(visuels[0] ? { image: visuels[0].url } : {}),
    ...(avis?.note
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: avis.note,
            reviewCount: avis.nombre ?? avis.avis.length,
          },
        }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdSecurise(donneesStructurees) }}
      />

      {/* Héro */}
      <section className="relative isolate overflow-hidden">
        <Vagues />
        <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <p className="text-sm uppercase tracking-[0.3em] text-pink-400">Saint-Nazaire</p>
          <h1 className="font-display mt-3 text-4xl font-bold sm:text-5xl">
            Bienvenue chez <span className="text-pink-500">Zelart</span> ✨
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-foreground/80">
            Je m&rsquo;appelle <strong>Zélia</strong>, prothésiste ongulaire et nail artist
            certifiée, passionnée par le dessin et la mode. Spécialisée dans le nail art, je crée
            des designs originaux, du plus discret au plus audacieux — chaque pose est unique,
            pensée avec vous, selon vos envies et votre style.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/reserver"
              className="rounded-full bg-pink-500 px-8 py-3 text-lg font-medium text-white shadow-md transition hover:bg-pink-600"
            >
              Réserver un créneau
            </Link>
            <a
              href="#prestations"
              className="rounded-full border border-pink-300 bg-white/70 px-8 py-3 text-lg font-medium text-pink-500 backdrop-blur-sm transition hover:bg-pink-50"
            >
              Voir les tarifs
            </a>
          </div>
          <p className="mt-6 text-sm text-foreground/60">
            Rendez-vous du lundi au samedi, à 9h ou 14h — sur réservation uniquement.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* Prestations & tarifs */}
        <section id="prestations" className="scroll-mt-20 py-10">
          <h2 className="font-display text-center text-3xl font-bold">Prestations &amp; tarifs 🌸</h2>
          <TraitVagues className="mx-auto mt-4" />
          <p className="mx-auto mt-3 max-w-2xl text-center text-foreground/70">
            Gainage, pose Gel X, Pop-it et vernis semi-permanent — avec ou sans nail art. Le niveau de
            nail art (1 à 3) dépend de la complexité du design souhaité.
          </p>
          {/* Seul point d'entrée visible sur téléphone : les liens secondaires
              de l'en-tête sont masqués sous « lg ». */}
          <p className="mt-4 text-center">
            <Link
              href="/prestations"
              className="inline-flex items-center gap-1.5 rounded-full border border-pink-200 px-5 py-2 text-sm font-medium text-pink-600 transition hover:bg-pink-50"
            >
              Ces mots ne vous parlent pas ? Tout est expliqué ici →
            </Link>
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {categories.map((categorie) => (
              <div
                key={categorie.nom}
                className="rounded-3xl border border-pink-100 bg-white p-6 shadow-sm"
              >
                <h3 className="font-display text-xl font-bold text-pink-500">{categorie.nom}</h3>
                {categorie.prestations[0]?.description ? (
                  <p className="mt-1 text-sm text-foreground/60">
                    {categorie.prestations[0].description}
                  </p>
                ) : null}
                <ul className="mt-4 space-y-2">
                  {categorie.prestations.map((p) => (
                    <li key={p.id} className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-foreground/85">{p.nom}</span>
                      <span className="shrink-0 whitespace-nowrap font-semibold text-pink-500">
                        {formatPrix(p.prixCents, p.aPartirDe)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Press-on nails */}
        <section className="py-10">
          <div className="rounded-3xl border border-pink-100 bg-white p-8 sm:p-10">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <h2 className="font-display text-3xl font-bold">Press-on nails 💅</h2>
              {pressOnMoinsCher && (
                <p className="text-sm font-medium text-pink-500">
                  {formatPrix(pressOnMoinsCher.prixCents, true)}
                </p>
              )}
            </div>
            <p className="mt-4 max-w-3xl leading-relaxed text-foreground/80">
              Des faux ongles réutilisables, faits main et taillés à votre morphologie : vous les posez
              vous-même en quelques minutes. Choisissez un set d&rsquo;une collection déjà dessinée, ou
              faites-en créer un rien que pour vous. Remise en main propre à Saint-Nazaire ou envoi
              postal.
            </p>
            <Link
              href="/press-on"
              className="mt-6 inline-block rounded-full border border-pink-300 px-8 py-3 font-medium text-pink-500 transition hover:bg-pink-50"
            >
              Voir les sets et commander
            </Link>
          </div>
        </section>

        {/* Galerie */}
        {visuels.length > 0 && (
          <section id="galerie" className="scroll-mt-20 py-10">
            <h2 className="font-display text-center text-3xl font-bold">Mes réalisations 💅</h2>
            <TraitVagues className="mx-auto mt-4" />
            <div className="mt-8">
              <Carrousel libelle="Réalisations de Zélia">
                {visuels.map((visuel, rang) => (
                  <li
                    key={visuel.id}
                    className="w-[74%] shrink-0 snap-center sm:w-[46%] lg:w-[31%]"
                  >
                    <figure className="group relative overflow-hidden rounded-3xl border border-pink-100 bg-white shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={visuel.url}
                        alt={visuel.legende ?? "Réalisation Zelart"}
                        loading={rang < 3 ? "eager" : "lazy"}
                        decoding="async"
                        // Sans cela, le navigateur lance son propre glisser-déposer
                        // d'image dès le premier mouvement et la piste ne suit plus.
                        draggable={false}
                        className="aspect-4/5 w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                      {visuel.legende && (
                        <figcaption className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 via-black/35 to-transparent px-4 pt-10 pb-3 text-sm font-medium text-white">
                          {visuel.legende}
                        </figcaption>
                      )}
                    </figure>
                  </li>
                ))}
              </Carrousel>
            </div>
          </section>
        )}

        {/* Réseaux */}
        {reseaux.length > 0 && (
          <section className="py-10">
            <div className="rounded-3xl border border-pink-100 bg-white p-8 text-center sm:p-10">
              <h2 className="font-display text-3xl font-bold">On se retrouve ailleurs ? 💕</h2>
              <TraitVagues className="mx-auto mt-4" />
              <p className="mx-auto mt-3 max-w-2xl leading-relaxed text-foreground/75">
                Les nouvelles poses, les créations en cours et les créneaux qui se libèrent à la
                dernière minute passent d&rsquo;abord par là.
              </p>
              <div className="mt-6 flex justify-center">
                <LiensReseaux reseaux={reseaux} variante="boutons" />
              </div>
            </div>
          </section>
        )}

        {/* L'institut */}
        <section className="py-10">
          <div className="relative isolate overflow-hidden rounded-3xl bg-pink-50 p-8 sm:p-10">
            <Vagues variante="bloc" />
            <h2 className="font-display text-3xl font-bold">L&rsquo;institut ✨</h2>
            <p className="mt-4 max-w-3xl leading-relaxed text-foreground/80">
              Je vous accueille au sein de <strong>L&rsquo;Atelier du Regard</strong>, un institut
              situé au 108 avenue de la République à Saint-Nazaire, dans un cadre chic, moderne et
              apaisant : espace lumineux, atmosphère calme, fauteuil confortable et hygiène
              irréprochable. Tout est réuni pour que vous profitiez de votre prestation en toute
              sérénité 🤍
            </p>
          </div>
        </section>

        {/* Infos pratiques */}
        <section id="infos" className="scroll-mt-20 py-10">
          <h2 className="font-display text-center text-3xl font-bold">À savoir avant de réserver</h2>
          <TraitVagues className="mx-auto mt-4" />
          <div className="mt-8 grid gap-4 text-sm sm:grid-cols-2">
            {[
              "Rendez-vous du lundi au samedi, à 9h ou 14h (une cliente par créneau).",
              "Il faut avoir 18 ans ou plus — aucune pose sur les pieds.",
              "Après votre demande, Zélia vous envoie un message de confirmation (elle ne répond pas aux appels).",
              "Nouvelles clientes : un acompte de 15 € est demandé via SumUp pour valider le rendez-vous ; il est déduit du montant final.",
              "Paiement sur place en espèces ou par carte bancaire (SumUp).",
              "Merci de signaler toute allergie ou problème de santé ; matériel désinfecté entre chaque cliente.",
            ].map((info) => (
              <div
                key={info}
                className="rounded-2xl border border-pink-100 bg-white px-5 py-4 leading-relaxed text-foreground/80"
              >
                {info}
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/reserver"
              className="rounded-full bg-pink-500 px-8 py-3 text-lg font-medium text-white shadow-md transition hover:bg-pink-600"
            >
              Prendre rendez-vous ✨
            </Link>
          </div>
        </section>

        {/* Avis Google */}
        <AvisGoogle fiche={avis} />
      </div>
    </>
  );
}
