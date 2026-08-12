import type { Metadata } from "next";
import Link from "next/link";
import { FAQ, donneesStructureesFaq } from "@/lib/faq";
import { jsonLdSecurise } from "@/lib/json-ld";
import Vagues, { TraitVagues } from "@/components/Vagues";

export const metadata: Metadata = {
  title: "Questions fréquentes · Zelart Nails",
  description:
    "Durée d'un rendez-vous, tenue d'une pose, acompte, annulation, allergies : les réponses aux questions que l'on me pose le plus souvent. Zelart Nails, Saint-Nazaire.",
};

export default function Questions() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdSecurise(donneesStructureesFaq()) }}
      />

      <section className="relative isolate overflow-hidden">
        <Vagues variante="bandeau" />
        <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Vos questions 🤍</h1>
          <TraitVagues className="mx-auto mt-4" />
          <p className="mt-4 text-foreground/75">
            Ce qu&rsquo;on me demande le plus souvent, répondu une fois pour toutes. Si votre
            question n&rsquo;y est pas, écrivez-moi par SMS au{" "}
            <a href="sms:0645292001" className="font-medium text-pink-600 hover:underline">
              06 45 29 20 01
            </a>
            .
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl space-y-10 px-4 pb-16 sm:px-6">
        {FAQ.map((rubrique) => (
          <section key={rubrique.titre}>
            <h2 className="font-display text-2xl font-bold">{rubrique.titre}</h2>
            <div className="mt-4 space-y-2">
              {rubrique.questions.map((q) => (
                // <details> natif : ouverture au clic, recherche du navigateur
                // qui fonctionne même replié, et rien à charger.
                <details
                  key={q.question}
                  className="group rounded-2xl border border-pink-100 bg-white px-5 py-4 open:border-pink-300"
                >
                  <summary className="cursor-pointer list-none font-medium marker:content-none">
                    <span className="flex items-start justify-between gap-4">
                      <span>{q.question}</span>
                      <span className="mt-0.5 shrink-0 text-pink-400 transition group-open:rotate-45">
                        ✚
                      </span>
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-foreground/80">{q.reponse}</p>
                </details>
              ))}
            </div>
          </section>
        ))}

        <section className="rounded-3xl border border-pink-100 bg-white p-8 text-center">
          <h2 className="font-display text-2xl font-bold">Prête à réserver ?</h2>
          <p className="mx-auto mt-3 max-w-xl text-foreground/75">
            Le parcours vous guide pas à pas, et je vous réponds par message pour confirmer.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/reserver"
              className="rounded-full bg-pink-500 px-8 py-3 font-medium text-white shadow-md transition hover:bg-pink-600"
            >
              Prendre rendez-vous ✨
            </Link>
            <Link
              href="/prestations"
              className="rounded-full border border-pink-300 px-8 py-3 font-medium text-pink-600 transition hover:bg-pink-50"
            >
              Comprendre les prestations
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
