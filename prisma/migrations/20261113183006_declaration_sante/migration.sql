-- Registre des déclarations santé (cf. schema.prisma, DeclarationSante).
-- CreateEnum
CREATE TYPE "SourceDeclaration" AS ENUM ('EN_LIGNE', 'AU_SALON');

-- CreateTable
CREATE TABLE "DeclarationSante" (
    "id" TEXT NOT NULL,
    "rendezVousId" TEXT,
    "clienteId" TEXT,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "rendezVousLe" TIMESTAMP(3) NOT NULL,
    "prestations" TEXT NOT NULL,
    "noteCliente" TEXT,
    "version" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "majeure" BOOLEAN NOT NULL,
    "source" "SourceDeclaration" NOT NULL,
    "accepteeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "navigateur" TEXT,

    CONSTRAINT "DeclarationSante_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeclarationSante_rendezVousId_idx" ON "DeclarationSante"("rendezVousId");

-- CreateIndex
CREATE INDEX "DeclarationSante_clienteId_idx" ON "DeclarationSante"("clienteId");

-- AddForeignKey
ALTER TABLE "DeclarationSante" ADD CONSTRAINT "DeclarationSante_rendezVousId_fkey" FOREIGN KEY ("rendezVousId") REFERENCES "RendezVous"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeclarationSante" ADD CONSTRAINT "DeclarationSante_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
