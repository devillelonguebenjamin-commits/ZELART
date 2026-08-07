-- Règlement d'une commande de press-on.
--
-- Le lien envoyé jusqu'ici était celui des réglages, c'est-à-dire l'acompte de
-- 15 € des rendez-vous : une cliente devant 65 € arrivait sur une page à 15 €.
-- Chaque commande porte désormais son propre lien, au bon montant, et garde la
-- trace de ce qui a été demandé — total pour un envoi postal, acompte pour un
-- retrait au salon où le solde se règle en espèces.

ALTER TABLE "CommandePressOn"
  ADD COLUMN "lienPaiement" TEXT,
  ADD COLUMN "montantDemandeCents" INTEGER;
