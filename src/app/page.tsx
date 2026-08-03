import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrix, grouperParCategorie } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Accueil() {
  const [prestations, photos] = await Promise.all([
    prisma.prestation.findMany({ where: { active: true }, orderBy: { ordre: "asc" } }),
    prisma.photo.findMany({ orderBy: [{ ordre: "asc" }, { creeLe: "desc" }], take: 12 }),
  ]);
  const categories = grouperParCategorie(prestations);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      {/* Héro */}
      <section className="py-14 text-center sm:py-20">
        <p className="text-sm uppercase tracking-[0.3em] text-pink-400">Saint-Nazaire</p>
        <h1 className="font-display mt-3 text-4xl font-bold sm:text-5xl">
          Bienvenue chez <span className="text-pink-500">Zelart</span> ✨
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-foreground/80">
          Je m&rsquo;appelle <strong>Zélia</strong>, prothésiste ongulaire et nail artist certifiée,
          passionnée par le dessin et la mode. Spécialisée dans le nail art, je crée des designs
          originaux, du plus discret au plus audacieux — chaque pose est unique, pensée avec vous,
          selon vos envies et votre style.
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
            className="rounded-full border border-pink-300 px-8 py-3 text-lg font-medium text-pink-500 transition hover:bg-pink-50"
          >
            Voir les tarifs
          </a>
        </div>
        <p className="mt-6 text-sm text-foreground/60">
          Rendez-vous du lundi au samedi, à 9h ou 14h — sur réservation uniquement.
        </p>
      </section>

      {/* Prestations & tarifs */}
      <section id="prestations" className="scroll-mt-20 py-10">
        <h2 className="font-display text-center text-3xl font-bold">Prestations &amp; tarifs 🌸</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-foreground/70">
          Gainage, pose Gel X, Pop-it et vernis semi-permanent — avec ou sans nail art. Le niveau de
          nail art (1 à 3) dépend de la complexité du design souhaité.
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
        <p className="mt-6 text-center text-sm text-foreground/60">
          Envie d&rsquo;un set de press-on nails personnalisé ? Contactez directement Zélia par
          e-mail ou Instagram.
        </p>
      </section>

      {/* Galerie */}
      {photos.length > 0 && (
        <section id="galerie" className="scroll-mt-20 py-10">
          <h2 className="font-display text-center text-3xl font-bold">Mes réalisations 💅</h2>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {photos.map((photo) => (
              <figure
                key={photo.id}
                className="overflow-hidden rounded-2xl border border-pink-100 bg-white"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.legende ?? "Réalisation Zelart"}
                  loading="lazy"
                  className="aspect-square w-full object-cover transition hover:scale-105"
                />
                {photo.legende && (
                  <figcaption className="px-3 py-2 text-xs text-foreground/60">
                    {photo.legende}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* L'institut */}
      <section className="py-10">
        <div className="rounded-3xl bg-pink-50 p-8 sm:p-10">
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
    </div>
  );
}
