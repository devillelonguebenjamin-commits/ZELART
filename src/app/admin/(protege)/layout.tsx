import Link from "next/link";
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
  { href: "/admin/roue", label: "Roue" },
  { href: "/admin/bouffonnes", label: "Bouffonnes" },
  { href: "/admin/reglages", label: "Réglages" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await exigerAdmin();
  const version = versionDeployee();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-pink-100 bg-white px-5 py-3">
        <nav className="flex flex-wrap gap-1">
          {liens.map((lien) => (
            <Link
              key={lien.href}
              href={lien.href}
              className="rounded-full px-4 py-1.5 text-sm font-medium text-foreground/75 transition hover:bg-pink-50 hover:text-pink-600"
            >
              {lien.label}
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
