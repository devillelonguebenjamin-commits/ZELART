import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { modifierPartenaire, supprimerPartenaire } from "@/actions/partenaires";
import FormulaireNouveauPartenaire from "@/components/FormulaireNouveauPartenaire";
import { urlSite } from "@/lib/site";

export const dynamic = "force-dynamic";

const CHAMP =
  "mt-1 w-full rounded-xl border border-pink-200 px-3 py-2 text-sm outline-none focus:border-pink-500";

function domaineCourt(): string {
  return urlSite().replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export default async function Partenaires() {
  const partenaires = await prisma.partenaire.findMany({
    orderBy: [{ ordre: "asc" }, { nom: "asc" }],
  });
  const domaine = domaineCourt();
  const totalClics = partenaires.reduce((somme, p) => somme + p.clics, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Partenaires</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Les marques avec lesquelles vous travaillez. Chacune reçoit une adresse courte,{" "}
          <code>{domaine}/inaka</code> par exemple, qui redirige vers votre lien d&rsquo;affiliation
          et compte les clics au passage. C&rsquo;est cette adresse qu&rsquo;il faut donner en
          story, sur une carte ou de vive voix : votre lien nominatif, lui, ne se dicte pas.
        </p>
        <p className="mt-2 text-sm text-foreground/60">
          Les partenaires actifs apparaissent sur la page{" "}
          <Link href="/pro" className="text-pink-600 hover:underline">
            {domaine}/pro
          </Link>
          , destinée aux consœurs et non aux clientes.
        </p>
      </div>

      <FormulaireNouveauPartenaire />

      {partenaires.length > 0 && (
        <p className="text-sm text-foreground/60">
          {totalClics} clic{totalClics > 1 ? "s" : ""} au total depuis la mise en place.
        </p>
      )}

      <div className="space-y-4">
        {partenaires.map((partenaire) => (
          <form
            key={partenaire.id}
            action={modifierPartenaire}
            className="rounded-2xl border border-pink-100 bg-white p-5"
          >
            <input type="hidden" name="id" value={partenaire.id} />

            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-display text-lg font-bold">{partenaire.nom}</h2>
              <p className="text-sm text-foreground/60">
                <strong className="font-semibold text-foreground/80">{partenaire.clics}</strong> clic
                {partenaire.clics > 1 ? "s" : ""}
                {partenaire.dernierClic && (
                  <>
                    {" "}
                    · dernier le{" "}
                    {partenaire.dernierClic.toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      timeZone: "Europe/Paris",
                    })}
                  </>
                )}
              </p>
            </div>

            <p className="mt-1 text-sm text-foreground/60">
              Adresse à communiquer :{" "}
              <code className="text-pink-600">
                {domaine}/{partenaire.slug}
              </code>
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-foreground/70">Nom</span>
                <input name="nom" defaultValue={partenaire.nom} required className={CHAMP} />
              </label>
              <label className="block text-sm">
                <span className="text-foreground/70">Catégorie</span>
                <input name="categorie" defaultValue={partenaire.categorie} className={CHAMP} />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="text-foreground/70">Lien d&rsquo;affiliation</span>
                <input
                  name="lienAffilie"
                  type="url"
                  defaultValue={partenaire.lienAffilie}
                  required
                  className={CHAMP}
                />
              </label>
              <label className="block text-sm">
                <span className="text-foreground/70">Adresse courte</span>
                <input name="slug" defaultValue={partenaire.slug} required className={CHAMP} />
              </label>
              <label className="block text-sm">
                <span className="text-foreground/70">Code promo</span>
                <input
                  name="codePromo"
                  defaultValue={partenaire.codePromo ?? ""}
                  className={CHAMP}
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="text-foreground/70">Ce que vous en dites</span>
                <textarea
                  name="description"
                  rows={4}
                  defaultValue={partenaire.description ?? ""}
                  className={CHAMP}
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="text-foreground/70">Logo (adresse d&rsquo;image)</span>
                <input
                  name="logoUrl"
                  type="url"
                  defaultValue={partenaire.logoUrl ?? ""}
                  className={CHAMP}
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="actif"
                  defaultChecked={partenaire.actif}
                  className="size-4 accent-pink-500"
                />
                Visible sur la page /pro
              </label>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded-full bg-pink-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-pink-600"
                >
                  Enregistrer
                </button>
                <button
                  type="submit"
                  formAction={supprimerPartenaire.bind(null, partenaire.id)}
                  className="rounded-full border border-pink-200 px-5 py-2 text-sm text-pink-600 transition hover:bg-pink-50"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </form>
        ))}

        {partenaires.length === 0 && (
          <p className="rounded-2xl bg-pink-50 px-5 py-4 text-sm text-foreground/70">
            Aucun partenaire pour l&rsquo;instant. Ajoutez INAKA pour commencer : nom, lien
            d&rsquo;affiliation, et code promo si vous en avez un.
          </p>
        )}
      </div>
    </div>
  );
}
