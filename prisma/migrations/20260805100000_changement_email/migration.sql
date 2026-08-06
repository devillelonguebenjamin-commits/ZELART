-- Changement d'adresse e-mail confirmé par un lien envoyé à la nouvelle
-- adresse : l'e-mail sert à se connecter, une faute de frappe ne doit pas
-- couper la cliente de son espace.
CREATE TABLE "ChangementEmail" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "nouvelEmail" TEXT NOT NULL,
    "jeton" TEXT NOT NULL,
    "expireLe" TIMESTAMP(3) NOT NULL,
    "utiliseLe" TIMESTAMP(3),
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChangementEmail_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChangementEmail_jeton_key" ON "ChangementEmail"("jeton");

CREATE INDEX "ChangementEmail_clienteId_idx" ON "ChangementEmail"("clienteId");

ALTER TABLE "ChangementEmail" ADD CONSTRAINT "ChangementEmail_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
