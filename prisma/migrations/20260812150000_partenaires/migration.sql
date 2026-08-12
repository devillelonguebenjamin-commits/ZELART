-- Les marques partenaires, et le lien d'affiliation nominatif qui va avec.
--
-- Le lien ne pouvait pas rester dans le code : il est nominatif, il se révoque,
-- et une deuxième marque arrivera. Le compteur de clics est le seul chiffre que
-- le partenaire ne fournit pas : sans lui, « combien de personnes ai-je
-- envoyées chez eux » est une question dont seul l'autre camp a la réponse.
CREATE TABLE "Partenaire" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "categorie" TEXT NOT NULL DEFAULT '',
    "description" TEXT,
    "lienAffilie" TEXT NOT NULL,
    "codePromo" TEXT,
    "logoUrl" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "clics" INTEGER NOT NULL DEFAULT 0,
    "dernierClic" TIMESTAMP(3),
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partenaire_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Partenaire_slug_key" ON "Partenaire"("slug");
CREATE INDEX "Partenaire_actif_ordre_idx" ON "Partenaire"("actif", "ordre");
