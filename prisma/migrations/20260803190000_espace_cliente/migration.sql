-- Espace cliente : code de parrainage et liens de connexion à usage unique.
ALTER TABLE "Cliente" ADD COLUMN "codeParrainage" TEXT,
ADD COLUMN "parraineParId" TEXT;

-- Codes lisibles (chiffres ambigus écartés), attribués aux clientes existantes.
UPDATE "Cliente" SET "codeParrainage" = 'ZEL-' || upper(substr(translate(md5(random()::text || id), 'oil01', 'xyzab'), 1, 5))
WHERE "codeParrainage" IS NULL;

ALTER TABLE "Cliente" ALTER COLUMN "codeParrainage" SET NOT NULL;
CREATE UNIQUE INDEX "Cliente_codeParrainage_key" ON "Cliente"("codeParrainage");

ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_parraineParId_fkey" FOREIGN KEY ("parraineParId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "JetonConnexion" (
    "id" TEXT NOT NULL,
    "jeton" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "expireLe" TIMESTAMP(3) NOT NULL,
    "utiliseLe" TIMESTAMP(3),
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JetonConnexion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JetonConnexion_jeton_key" ON "JetonConnexion"("jeton");
CREATE INDEX "JetonConnexion_clienteId_idx" ON "JetonConnexion"("clienteId");

ALTER TABLE "JetonConnexion" ADD CONSTRAINT "JetonConnexion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
