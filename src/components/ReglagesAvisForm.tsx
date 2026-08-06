"use client";

import { useActionState } from "react";
import { gererAvisGoogle, type EtatAvis } from "@/actions/admin";

export default function ReglagesAvisForm({
  etablissement,
  cleConfiguree,
}: {
  etablissement: string;
  cleConfiguree: boolean;
}) {
  const [etat, action, enCours] = useActionState<EtatAvis, FormData>(gererAvisGoogle, {});

  return (
    <section className="rounded-2xl border border-pink-100 bg-white p-6">
      <h2 className="font-semibold">Avis Google</h2>
      <p className="mt-1 text-sm text-foreground/70">
        Vos avis Google s&rsquo;affichent en bas de la page d&rsquo;accueil. Google n&rsquo;en
        transmet que <strong>cinq à la fois</strong>, et c&rsquo;est lui qui les choisit — ce
        n&rsquo;est pas un réglage du site.
      </p>

      {!cleConfiguree ? (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Il manque la clé <code>GOOGLE_PLACES_API_KEY</code> dans les variables du projet sur
          Vercel. Sans elle, le site ne peut pas interroger Google.
        </p>
      ) : etablissement ? (
        <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <p>
            Connecté à <strong>{etablissement}</strong>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <form action={action}>
              <input type="hidden" name="intention" value="rafraichir" />
              <button
                type="submit"
                disabled={enCours}
                className="rounded-full border border-emerald-300 px-4 py-1.5 text-xs font-medium transition hover:bg-emerald-100 disabled:opacity-50"
              >
                Rafraîchir maintenant
              </button>
            </form>
            <form action={action}>
              <input type="hidden" name="intention" value="deconnecter" />
              <button
                type="submit"
                disabled={enCours}
                className="rounded-full border border-emerald-300 px-4 py-1.5 text-xs font-medium transition hover:bg-emerald-100 disabled:opacity-50"
              >
                Ne plus afficher les avis
              </button>
            </form>
          </div>
          <p className="mt-2 text-xs text-emerald-800/80">
            Les avis sont rafraîchis tout seuls toutes les six heures.
          </p>
        </div>
      ) : null}

      {cleConfiguree && (
        <form action={action} className="mt-4">
          <input type="hidden" name="intention" value="chercher" />
          <label className="block text-sm">
            <span className="font-medium">
              {etablissement ? "Changer d’établissement" : "Votre établissement sur Google"}
            </span>
            <span className="mt-0.5 block text-xs text-foreground/60">
              Le nom tel qu&rsquo;il apparaît sur Google Maps, avec la ville.
            </span>
            <input
              name="requete"
              placeholder="Zelart Nails Saint-Nazaire"
              className="mt-1 w-full rounded-xl border border-pink-200 px-3 py-2 outline-none focus:border-pink-500"
            />
          </label>
          <button
            type="submit"
            disabled={enCours}
            className="mt-3 rounded-full bg-pink-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-pink-600 disabled:opacity-50"
          >
            {enCours ? "Recherche…" : "Rechercher"}
          </button>
        </form>
      )}

      {etat.message && (
        <p
          role="status"
          className={`mt-3 rounded-xl px-4 py-2.5 text-sm ${
            etat.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
          }`}
        >
          {etat.message}
        </p>
      )}

      {etat.candidats && etat.candidats.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium">Lequel est le vôtre ?</p>
          <ul className="mt-2 space-y-2">
            {etat.candidats.map((candidat) => (
              <li key={candidat.placeId}>
                <form action={action}>
                  <input type="hidden" name="intention" value="connecter" />
                  <input type="hidden" name="placeId" value={candidat.placeId} />
                  <input type="hidden" name="nom" value={`${candidat.nom} — ${candidat.adresse}`} />
                  <button
                    type="submit"
                    disabled={enCours}
                    className="w-full rounded-xl border border-pink-200 px-4 py-3 text-left text-sm transition hover:border-pink-400 hover:bg-pink-50 disabled:opacity-50"
                  >
                    <span className="font-medium">{candidat.nom}</span>
                    <span className="block text-xs text-foreground/60">{candidat.adresse}</span>
                    <span className="mt-0.5 block text-xs text-pink-600">
                      {candidat.nombre === null
                        ? "Aucun avis pour le moment"
                        : `${candidat.nombre} avis`}
                    </span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
