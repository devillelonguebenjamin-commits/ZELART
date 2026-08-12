-- « Comment m'avez-vous connue ? » : la seule donnée qui relie une cliente au
-- canal qui l'a amenée. Facultative, demandée une fois, jamais réclamée.
ALTER TABLE "Cliente" ADD COLUMN "provenance" TEXT;
