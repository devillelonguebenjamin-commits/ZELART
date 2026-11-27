-- Abonnements aux notifications de l'application gérante.
CREATE TABLE "AbonnementPush" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "appareil" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dernierEnvoiLe" TIMESTAMP(3),

    CONSTRAINT "AbonnementPush_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AbonnementPush_endpoint_key" ON "AbonnementPush"("endpoint");
