import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { deconnexionAdmin } from "@/actions/admin";
import { exigerAdmin } from "@/lib/auth";
import { versionDeployee } from "@/lib/site";

export const metadata = { robots: { index: false } };

const liens = [
  { href: "/admin", label: "Agenda" },
  { href: "/admin/chiffres", label: "Chiffres" },
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/prestations", label: "Prestations" },
  { href: "/admin/press-on", label: "Press-on" },
  { href: "/admin/conges", label: "Congés" },
  { href: "/admin/galerie", label: "Galerie" },
  { href: "/admin/campagnes", label: "Campagnes" },
  { href: "/admin/parrainage", label: "Parrainage" },
  { href: "/admin/roue", label: "Roue" },
  { href: "/admin/bouffonnes", label: "Bouffonnes" },
  { href: "/admin/reglages", label: "Réglages" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await exigerAdmin();
  const version = versionDeployee();

  // Un avantage gagné se perdrait dans un e-mail lu en vitesse : la pastille le
  // rappelle depuis n'importe quel onglet, jusqu'à ce qu'il soit honoré.
  const aHonorer = await prisma.avantageParrainage.count({ where: { utiliseLe: null } });

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
              {lien.href === "/admin/parrainage" && aHonorer > 0 && (
                <span className="rounded-full bg-pink-500 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">
                  {aHonorer}
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
