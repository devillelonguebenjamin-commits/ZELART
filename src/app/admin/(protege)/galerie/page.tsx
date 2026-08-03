import { prisma } from "@/lib/prisma";
import { ajouterPhoto, supprimerPhoto } from "@/actions/admin";

export const dynamic = "force-dynamic";

export default async function Galerie() {
  const photos = await prisma.photo.findMany({
    orderBy: [{ ordre: "asc" }, { creeLe: "desc" }],
  });
  const stockagePret = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

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
          <form action={ajouterPhoto} className="mt-3 flex flex-wrap items-end gap-4">
            <label className="block text-sm">
              <span className="text-foreground/70">Image (8 Mo max)</span>
              <input
                type="file"
                name="fichier"
                accept="image/*"
                required
                className="mt-1 block text-sm file:mr-3 file:rounded-full file:border-0 file:bg-pink-500 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-pink-600"
              />
            </label>
            <label className="block flex-1 text-sm">
              <span className="text-foreground/70">Légende (facultatif)</span>
              <input
                name="legende"
                placeholder="Pose Gel X — nail art fleuri"
                className="mt-1 block w-full min-w-40 rounded-xl border border-pink-200 px-3 py-2 outline-none focus:border-pink-500"
              />
            </label>
            <button
              type="submit"
              className="rounded-full bg-pink-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-pink-600"
            >
              Ajouter
            </button>
          </form>
        </section>
      ) : (
        <p className="rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-800">
          Le stockage d&rsquo;images n&rsquo;est pas encore configuré. Sur Vercel : onglet
          <strong> Storage → Create Database → Blob</strong>, puis redéployer — le formulaire
          d&rsquo;ajout apparaîtra ici automatiquement.
        </p>
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
