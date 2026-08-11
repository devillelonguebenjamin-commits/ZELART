import Link from "next/link";
import { groupesDoublons } from "@/lib/doublons";
import FusionDoublon from "@/components/FusionDoublon";

export const dynamic = "force-dynamic";

const MOTIF = {
  telephone: "même numéro de téléphone",
  nom: "même nom et prénom",
} as const;

export default async function Doublons() {
  const groupes = await groupesDoublons();

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/clientes" className="text-sm text-pink-600 hover:underline">
          ← Toutes les clientes
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold">Doublons</h1>
        <p className="mt-1 max-w-2xl text-sm text-foreground/60">
          Les fiches qui désignent peut-être la même personne. Elles naissent quand une cliente
          enregistrée de vive voix finit par réserver en ligne : le site la reconnaît désormais à
          son numéro, mais celles créées avant restent à réunir. Rien n&rsquo;est fusionné sans
          vous — un homonyme existe, et un foyer partage parfois une ligne.
        </p>
      </div>

      {groupes.length === 0 ? (
        <p className="rounded-2xl bg-pink-50 px-5 py-4 text-sm text-foreground/70">
          Aucun doublon détecté 🤍
        </p>
      ) : (
        <ul className="space-y-4">
          {groupes.map((groupe) => (
            <li
              key={`${groupe.motif}-${groupe.cle}`}
              className="rounded-3xl border border-pink-100 bg-white p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-pink-500">
                {groupe.fiches.length} fiches · {MOTIF[groupe.motif]}
              </p>
              <div className="mt-3">
                <FusionDoublon fiches={groupe.fiches} />
              </div>
              <p className="mt-3 text-xs text-foreground/50">
                Pour vérifier avant de trancher :{" "}
                {groupe.fiches.map((f, i) => (
                  <span key={f.id}>
                    {i > 0 && " · "}
                    <Link
                      href={`/admin/clientes/${f.id}`}
                      className="text-pink-600 hover:underline"
                    >
                      fiche de {f.prenom} {f.nom}
                    </Link>
                  </span>
                ))}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
