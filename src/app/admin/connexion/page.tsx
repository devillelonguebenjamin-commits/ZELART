import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connexionAdmin } from "@/actions/admin";
import { estAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Espace gérante — Zelart Nails",
  robots: { index: false },
};

export default async function Connexion({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  if (await estAdmin()) redirect("/admin");
  const { erreur } = await searchParams;

  return (
    <div className="mx-auto max-w-sm px-4 py-24">
      <div className="rounded-3xl border border-pink-100 bg-white p-8 shadow-sm">
        <h1 className="font-display text-2xl font-bold">Espace gérante 🔐</h1>
        <p className="mt-2 text-sm text-foreground/60">
          Réservé à Zélia — entrez votre mot de passe.
        </p>
        <form action={connexionAdmin} className="mt-6 space-y-4">
          <input
            type="password"
            name="motDePasse"
            required
            autoFocus
            placeholder="Mot de passe"
            className="w-full rounded-xl border border-pink-200 bg-white px-4 py-2.5 outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
          />
          {erreur && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              Mot de passe incorrect.
            </p>
          )}
          <button
            type="submit"
            className="w-full rounded-full bg-pink-500 px-6 py-3 font-medium text-white transition hover:bg-pink-600"
          >
            Se connecter
          </button>
        </form>
      </div>
    </div>
  );
}
