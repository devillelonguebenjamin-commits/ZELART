-- Trois automatisations : relance d'acompte impayé, demande d'avis Google
-- après une pose terminée, liste d'attente sur un jour complet.

ALTER TABLE "RendezVous" ADD COLUMN "acompteRelanceEnvoyeeLe" TIMESTAMP(3);
ALTER TABLE "RendezVous" ADD COLUMN "demandeAvisEnvoyeeLe" TIMESTAMP(3);

CREATE TABLE "ListeAttente" (
    "id" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT,
    "note" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifieeLe" TIMESTAMP(3),

    CONSTRAINT "ListeAttente_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ListeAttente_notifieeLe_idx" ON "ListeAttente"("notifieeLe");
