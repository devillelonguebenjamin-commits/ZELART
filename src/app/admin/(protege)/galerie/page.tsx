import { prisma } from "@/lib/prisma";
import { supprimerPhoto } from "@/actions/admin";
import { jetonBlob } from "@/lib/blob";
import FormulairePhoto from "@/components/FormulairePhoto";

export const dynamic = "force-dynamic";

export default async function Galerie() {
  const photos = await prisma.photo.findMany({
    orderBy: [{ ordre: "asc" }, { creeLe: "desc" }],
  });
  const stockagePret = Boolean(jetonBlob());
  // Diagnostic : noms des variables (jamais leurs valeurs) et version déployée
  const variablesBlob = Object.keys(process.env).filter((nom) => nom.includes("BLOB"));
  const version = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "locale";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Galerie de réalisations</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Les photos apparaissent sur la page d&rsquo;accueil, dans la section « Mes réalisations ».
        </p>
      </div>

      {stockagePret ? (
        <section className="rounded-2xl border border-pink-100 bg-white p-5">
          <h2 className="font-semibold">Ajouter une photo</h2>
          <div className="mt-3">
            <FormulairePhoto />
          </div>
        </section>
      ) : (
        <div className="rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-900">
          <p className="font-semibold">Le site ne reçoit pas le jeton du magasin de photos</p>
          <p className="mt-1">
            Solution la plus sûre : ouvrir le magasin <em>zelart-photos</em> sur Vercel, onglet{" "}
            <strong>.env.local</strong> de l&rsquo;encadré <em>Quickstart</em>, copier la valeur qui
            commence par <code>vercel_blob_rw_</code>, puis l&rsquo;ajouter à la main dans{" "}
            <strong>Settings → Environment Variables</strong> sous le nom{" "}
            <code>BLOB_READ_WRITE_TOKEN</code>, et redéployer.
          </p>
          <p className="mt-2 break-all">
            Variables de stockage vues par le site :{" "}
            <code>{variablesBlob.length > 0 ? variablesBlob.join(", ") : "aucune"}</code>
          </p>
          <p className="mt-1">
            Version du site : <code>{version}</code>
          </p>
        </div>
      )}

      <section>
        <h2 className="font-display text-xl font-bold">Photos en ligne ({photos.length})</h2>
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((photo) => (
            <figure
              key={photo.id}
              className="overflow-hidden rounded-2xl border border-pink-100 bg-white"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.legende ?? "Réalisation Zelart"}
                className="aspect-square w-full object-cover"
              />
              <figcaption className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                <span className="truncate text-foreground/70">{photo.legende ?? "—"}</span>
                <form action={supprimerPhoto.bind(null, photo.id)}>
                  <button
                    type="submit"
                    title="Supprimer"
                    className="rounded-full border border-pink-200 px-2.5 py-1 text-pink-600 transition hover:bg-pink-50"
                  >
                    ✕
                  </button>
                </form>
              </figcaption>
            </figure>
          ))}
          {photos.length === 0 && (
            <p className="col-span-full rounded-2xl bg-pink-50 px-5 py-4 text-sm text-foreground/70">
              Aucune photo pour l&rsquo;instant.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
