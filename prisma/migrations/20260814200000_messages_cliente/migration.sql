-- Fil de discussion entre une cliente et Zélia.
--
-- Tout passait par le SMS personnel de Zélia, où une question sur une pose se
-- mêlait à sa vie privée et se perdait. Rattaché à la fiche, le message arrive
-- à côté de l'historique des poses et des notes techniques, là où la réponse
-- se prépare.
--
-- « deZelia » plutôt qu'un auteur : la conversation n'oppose jamais que deux
-- personnes, et une table d'auteurs laisserait croire à une généralité qui
-- n'existe pas.
CREATE TABLE "MessageCliente" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "deZelia" BOOLEAN NOT NULL,
    "texte" TEXT NOT NULL,
    "luLe" TIMESTAMP(3),
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageCliente_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MessageCliente_clienteId_creeLe_idx" ON "MessageCliente"("clienteId", "creeLe");
-- Sert la pastille de l'espace gérante : les messages de clientes non lus.
CREATE INDEX "MessageCliente_deZelia_luLe_idx" ON "MessageCliente"("deZelia", "luLe");

ALTER TABLE "MessageCliente" ADD CONSTRAINT "MessageCliente_clienteId_fkey"
    FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
