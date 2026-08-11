-- « Set personnalisé — VSP simple » était le seul des quatre sets sur-mesure à
-- porter un tiret là où ses voisins portent un « + ». Il s'aligne, et le
-- catalogue cesse d'exposer une ponctuation que les autres textes ont perdue.
UPDATE "ModelePressOn"
SET "nom" = 'Set personnalisé + VSP simple'
WHERE "nom" = 'Set personnalisé — VSP simple';
