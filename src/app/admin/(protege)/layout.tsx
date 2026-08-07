import Link from "next/link";
import { compterEnAttente, type EnAttente } from "@/lib/en-attente";
import { deconnexionAdmin } from "@/actions/admin";
import { exigerAdmin } from "@/lib/auth";
import { versionDeployee } from "@/lib/site";

export const metadata = { robots: { index: false } };

// `cle` désigne le compteur de `compterEnAttente` à afficher en pastille, quand
// il y en a un : la pastille dit ce qui attend un geste, rien d'autre. Un
// compteur qui afficherait un total sans action possible deviendrait un décor
// qu'on cesse de regarder.
const liens: { href: string; label: string; cle?: keyof EnAttente }[] = [
  { href: "/admin", label: "Agenda", cle: "agenda" },
  { href: "/admin/chiffres", label: "Chiffres" },
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/prestations", label: "Prestations" },
  { href: "/admin/press-on", label: "Press-on", cle: "pressOn" },
  { href: "/admin/conges", label: "Congés" },
  { href: "/admin/galerie", label: "Galerie" },
  { href: "/admin/campagnes", label: "Campagnes" },
  { href: "/admin/parrainage", label: "Parrainage", cle: "parrainage" },
  { href: "/admin/roue", label: "Roue" },
  { href: "/admin/bouffonnes", label: "Bouffonnes" },
  { href: "/admin/reglages", label: "Réglages" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await exigerAdmin();
  const version = versionDeployee();

  // Une demande se perdrait dans un e-mail lu en vitesse : les pastilles la
  // rappellent depuis n'importe quel onglet, jusqu'à ce qu'elle soit traitée.
  const enAttente = await compterEnAttente();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-pink-100 bg-white px-5 py-3">
        <nav className="flex flex-wrap gap-1">
          {liens.map((lien) => (
            <Link
              key={lien.href}
              href={lien.href}
              className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium text-foreground/75 transition hover:bg-pink-50 hover:text-pink-600"
            >
              {lien.label}
              {lien.cle && enAttente[lien.cle] > 0 && (
                <span
                  aria-label={`${enAttente[lien.cle]} en attente`}
                  className="rounded-full bg-pink-500 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white"
                >
                  {enAttente[lien.cle]}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <form action={deconnexionAdmin}>
          <button
            type="submit"
            className="rounded-full border border-pink-200 px-4 py-1.5 text-sm text-pink-600 transition hover:bg-pink-50"
          >
            Se déconnecter
          </button>
        </form>
      </div>
      {children}

      <p className="mt-10 text-center text-xs text-foreground/40">
        Version en ligne : <code>{version.sha}</code>
        {version.message && ` — ${version.message}`}
      </p>
    </div>
  );
}
