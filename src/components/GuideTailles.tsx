"use client";

import { useState } from "react";

// Demande de mesures pour les press-on.
//
// Deux méthodes proposées, parce qu'elles ne s'adressent pas aux mêmes
// personnes : le ruban adhésif donne des millimètres exploitables directement,
// la photo demande moins de matériel et de patience mais laisse Zélia mesurer.
// Aucune n'est imposée — une cliente qui bute sur l'une abandonnerait la
// commande plutôt que d'essayer l'autre si on ne lui montrait pas les deux.
//
// Contrainte de structure : ce bloc vit dans le <form> de commande, ses champs
// n'ont donc **aucun attribut `name`**. Ils seraient envoyés avec la commande et
// brouilleraient les données réelles ; ils ne servent qu'à composer le texte du
// champ « mesures », que le parent possède.

const DOIGTS = ["Pouce", "Index", "Majeur", "Annulaire", "Auriculaire"] as const;
const MAINS = ["Main gauche", "Main droite"] as const;

type Methode = "ruban" | "photo";

export default function GuideTailles({ onReporter }: { onReporter: (texte: string) => void }) {
  const [ouvert, setOuvert] = useState(false);
  const [methode, setMethode] = useState<Methode>("ruban");
  const [valeurs, setValeurs] = useState<Record<string, string>>({});
  const [reporte, setReporte] = useState(false);

  const cle = (main: number, doigt: number) => `${main}-${doigt}`;

  function saisir(main: number, doigt: number, valeur: string) {
    setValeurs((precedentes) => ({ ...precedentes, [cle(main, doigt)]: valeur }));
    setReporte(false);
  }

  function reporter() {
    const lignes = MAINS.map((nomMain, m) => {
      const mesures = DOIGTS.map((nomDoigt, d) => {
        const valeur = valeurs[cle(m, d)]?.trim();
        return valeur ? `${nomDoigt} ${valeur}` : null;
      }).filter(Boolean);
      return mesures.length > 0 ? `${nomMain} : ${mesures.join(", ")} (mm)` : null;
    }).filter(Boolean);

    if (lignes.length === 0) return;
    // Le champ d'arrivée est plafonné à 300 caractères, côté serveur comme dans
    // le formulaire : une saisie fantaisiste ne doit pas produire un texte que
    // la validation refusera ensuite, sans que la cliente comprenne pourquoi.
    onReporter(lignes.join(" · ").slice(0, 300));
    setReporte(true);
  }

  const rempli = Object.values(valeurs).some((v) => v.trim() !== "");

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="mt-3 text-sm font-medium text-pink-600 hover:underline"
      >
        📏 Comment prendre mes mesures ?
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-pink-200 bg-pink-50/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="font-display text-lg font-bold">Prendre ses mesures</p>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          className="text-xs text-foreground/60 underline hover:text-pink-600"
        >
          Replier
        </button>
      </div>
      <p className="mt-1 text-xs text-foreground/60">
        Deux façons de faire. La première donne les millimètres exacts, la seconde ne demande
        qu&rsquo;un téléphone.
      </p>

      <div className="mt-4 flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => setMethode("ruban")}
          className={`rounded-full px-4 py-1.5 font-medium transition ${
            methode === "ruban" ? "bg-pink-500 text-white" : "border border-pink-200 text-pink-600"
          }`}
        >
          A · Ruban adhésif
        </button>
        <button
          type="button"
          onClick={() => setMethode("photo")}
          className={`rounded-full px-4 py-1.5 font-medium transition ${
            methode === "photo" ? "bg-pink-500 text-white" : "border border-pink-200 text-pink-600"
          }`}
        >
          B · Photo avec repère
        </button>
      </div>

      {methode === "ruban" ? (
        <>
          <div className="mt-4 flex flex-wrap items-start gap-5">
            {/* Où mesurer : un dessin dit en un coup d'œil ce qu'un paragraphe
                expliquerait mal — la largeur, pas la longueur. */}
            <svg
              viewBox="0 0 120 150"
              className="h-32 w-auto shrink-0"
              role="img"
              aria-label="Ongle vu de dessus, mesuré dans sa largeur à l'endroit le plus large"
            >
              <path
                d="M30 40 Q30 15 60 15 Q90 15 90 40 L88 105 Q88 125 60 125 Q32 125 32 105 Z"
                fill="#fdf2f8"
                stroke="#f9a8d4"
                strokeWidth="2.5"
              />
              <path d="M30 40 Q60 28 90 40" fill="none" stroke="#f9a8d4" strokeWidth="1.5" />
              <line x1="24" y1="47" x2="96" y2="47" stroke="#ec4899" strokeWidth="2.5" />
              <path d="M24 47 l7 -5 v10 z" fill="#ec4899" />
              <path d="M96 47 l-7 -5 v10 z" fill="#ec4899" />
              <text x="60" y="72" textAnchor="middle" fill="#be185d" fontSize="14" fontWeight="600">
                largeur
              </text>
              <text x="60" y="90" textAnchor="middle" fill="#be185d" fontSize="11">
                en mm
              </text>
            </svg>

            <ol className="min-w-56 flex-1 space-y-2 text-sm text-foreground/80">
              <li>
                <strong>1.</strong>{" "}
                Collez un morceau de <strong>ruban adhésif transparent</strong> (type Scotch) en
                travers de l&rsquo;ongle, au niveau de la zone la plus large.
              </li>
              <li>
                <strong>2.</strong>{" "}
                Marquez les <strong>deux bords latéraux</strong> — à la jonction entre l&rsquo;ongle
                et la peau — avec un stylo fin.
              </li>
              <li>
                <strong>3.</strong>{" "}
                Décollez le ruban, collez-le à plat sur un papier et mesurez l&rsquo;écart{" "}
                <strong>en millimètres</strong> avec une règle.
              </li>
              <li>
                <strong>4.</strong>{" "}
                Reportez les mesures ci-dessous : Zélia les transpose sur sa grille de
                correspondance.
              </li>
            </ol>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {MAINS.map((nomMain, m) => (
              <fieldset key={nomMain}>
                <legend className="text-sm font-medium">{nomMain}</legend>
                <div className="mt-2 space-y-1.5">
                  {DOIGTS.map((nomDoigt, d) => (
                    <label key={nomDoigt} className="flex items-center gap-2 text-sm">
                      <span className="w-24 shrink-0 text-foreground/70">{nomDoigt}</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={5}
                        max={25}
                        step={0.5}
                        value={valeurs[cle(m, d)] ?? ""}
                        onChange={(e) => saisir(m, d, e.target.value)}
                        className="w-20 rounded-lg border border-pink-200 bg-white px-2 py-1 outline-none focus:border-pink-500"
                      />
                      <span className="text-xs text-foreground/50">mm</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={reporter}
              disabled={!rempli}
              className="rounded-full bg-pink-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Reporter dans ma commande
            </button>
            {reporte && (
              <span role="status" className="text-sm font-medium text-emerald-700">
                Mesures reportées ci-dessous ✓
              </span>
            )}
          </div>

          <p className="mt-3 text-xs text-foreground/60">
            Les deux mains diffèrent souvent : mesurez-les toutes les deux. Arrondissez au
            demi-millimètre.
          </p>
        </>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-start gap-5">
            {/* Le repère est tout l'enjeu : sans objet de taille connue dans le
                cadre, une photo ne donne aucune échelle et ne sert à rien. */}
            <svg
              viewBox="0 0 150 120"
              className="h-32 w-auto shrink-0"
              role="img"
              aria-label="Main posée à plat, une pièce de monnaie posée à côté des ongles"
            >
              <rect x="6" y="6" width="138" height="108" rx="8" fill="#fdf2f8" stroke="#f9a8d4" strokeWidth="2" />
              {[0, 1, 2, 3].map((i) => (
                <g key={i}>
                  <rect x={26 + i * 20} y={34 + (i === 0 ? 6 : i === 3 ? 8 : 0)} width="14" height="46" rx="7" fill="#fff" stroke="#f9a8d4" strokeWidth="1.5" />
                  <rect x={28 + i * 20} y={36 + (i === 0 ? 6 : i === 3 ? 8 : 0)} width="10" height="15" rx="5" fill="#fbcfe8" />
                </g>
              ))}
              <circle cx="120" cy="58" r="17" fill="#fff" stroke="#ec4899" strokeWidth="2.5" />
              <text x="120" y="63" textAnchor="middle" fill="#be185d" fontSize="13" fontWeight="700">
                2 €
              </text>
              <text x="120" y="90" textAnchor="middle" fill="#be185d" fontSize="10">
                le repère
              </text>
            </svg>

            <ol className="min-w-56 flex-1 space-y-2 text-sm text-foreground/80">
              <li>
                <strong>1.</strong>{" "}
                Posez votre main <strong>bien à plat</strong> sur une table, doigts écartés.
              </li>
              <li>
                <strong>2.</strong>{" "}
                Posez à côté des ongles un objet dont la taille est connue :{" "}
                <strong>une pièce de 2 €</strong>{" "}
                fait exactement 25,75 mm. Une règle d&rsquo;écolier dans le cadre fonctionne aussi bien.
              </li>
              <li>
                <strong>3.</strong>{" "}
                Photographiez <strong>à la verticale</strong>, l&rsquo;appareil au-dessus de la main
                et non en biais — un angle fausse toutes les proportions.
              </li>
              <li>
                <strong>4.</strong> Une photo par main, à la lumière du jour de préférence.
              </li>
            </ol>
          </div>

          <p className="mt-4 rounded-xl bg-white px-4 py-3 text-sm text-foreground/80">
            📷 Joignez vos photos à l&rsquo;étape <strong>« Votre design »</strong>, juste en
            dessous : elles arrivent avec votre commande. Zélia mesure vos ongles à partir du
            repère et vous confirme les tailles avant de découper.
          </p>

          <p className="mt-3 text-xs text-foreground/60">
            Cette méthode demande moins de matériel, mais reste moins précise que le ruban. En cas
            de doute sur un ongle, Zélia vous écrira.
          </p>
        </>
      )}

      <p className="mt-4 border-t border-pink-200 pt-3 text-xs text-foreground/60">
        Ni l&rsquo;une ni l&rsquo;autre ne vous tente ? Laissez le champ vide et dites-le : Zélia
        vous prêtera un kit de taille, ou vous guidera par message.
      </p>
    </div>
  );
}
