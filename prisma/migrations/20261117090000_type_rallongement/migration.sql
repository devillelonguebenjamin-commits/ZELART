-- Gel X et Pop-it réunis en une seule prestation de rallongement (la valeur
-- est ajoutée seule : PostgreSQL refuse d'employer une valeur d'énumération
-- dans la transaction qui la crée).
ALTER TYPE "TypePose" ADD VALUE 'RALLONGEMENT';
