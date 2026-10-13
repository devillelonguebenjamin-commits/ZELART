-- Déplacer un rendez-vous, directement ou en le proposant à la cliente.
--
-- Jusqu'ici un changement d'horaire passait par une annulation suivie d'une
-- nouvelle saisie : l'historique perdait le lien entre les deux, la cliente
-- recevait un « annulé » alors que rien ne l'était, et une proposition faite par
-- SMS n'avait aucune trace ni aucun suivi.

-- Trace du dernier déplacement sur le rendez-vous lui-même : l'agenda affiche
-- « initialement le … », utile quand la cliente se souvient de l'ancienne heure.
ALTER TABLE "RendezVous" ADD COLUMN "decaleLe" TIMESTAMP(3);
ALTER TABLE "RendezVous" ADD COLUMN "debutInitial" TIMESTAMP(3);

CREATE TYPE "StatutDecalage" AS ENUM ('EN_ATTENTE', 'ACCEPTEE', 'REFUSEE', 'ANNULEE', 'EXPIREE');

-- Un horaire proposé par Zélia, en attente de la réponse de la cliente. Tant
-- qu'il attend, il **retient son créneau** : le proposer puis le voir pris par
-- une autre cliente avant la réponse serait la pire des issues.
CREATE TABLE "PropositionDecalage" (
    "id" TEXT NOT NULL,
    "rendezVousId" TEXT NOT NULL,
    "ancienDebut" TIMESTAMP(3) NOT NULL,
    "debut" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "message" TEXT,
    "jeton" TEXT NOT NULL,
    "statut" "StatutDecalage" NOT NULL DEFAULT 'EN_ATTENTE',
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reponduLe" TIMESTAMP(3),
    "relanceEnvoyeeLe" TIMESTAMP(3),

    CONSTRAINT "PropositionDecalage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PropositionDecalage_jeton_key" ON "PropositionDecalage"("jeton");
CREATE INDEX "PropositionDecalage_statut_debut_idx" ON "PropositionDecalage"("statut", "debut");
CREATE INDEX "PropositionDecalage_rendezVousId_idx" ON "PropositionDecalage"("rendezVousId");

ALTER TABLE "PropositionDecalage" ADD CONSTRAINT "PropositionDecalage_rendezVousId_fkey" FOREIGN KEY ("rendezVousId") REFERENCES "RendezVous"("id") ON DELETE CASCADE ON UPDATE CASCADE;
