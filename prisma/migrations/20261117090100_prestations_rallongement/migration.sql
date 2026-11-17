-- La cliente ne choisit plus entre Gel X et Pop-it : elle réserve un
-- rallongement, et Zélia décide sur place de la technique la mieux adaptée.
-- Chaque tarif part du moins cher des deux, chaque durée retient la plus longue
-- (un créneau trop court coûte plus cher qu'un créneau trop large).
--
-- Les anciennes prestations sont masquées, pas supprimées : les rendez-vous
-- passés et à venir qui les portent gardent leur libellé et leur prix.

UPDATE "Prestation"
SET "active" = false, "choixCliente" = false, "ordre" = "ordre" + 100
WHERE "typePose" IN ('GEL_X', 'POP_IT');

INSERT INTO "Prestation"
  ("id", "ordre", "categorie", "nom", "description", "prixCents", "dureeMin", "aPartirDe", "active", "choixCliente", "typeActe", "typePose")
VALUES
  ('rallongement-pose',               14, 'Rallongement', 'Rallongement + VSP simple',                    'Pour rallonger vos ongles. La technique, Gel X (capsules) ou Pop-it (gel), se choisit ensemble sur place, selon vos ongles et vos envies.', 4500, 120, true,  true, true,  'POSE',        'RALLONGEMENT'),
  ('rallongement-pose-na',            15, 'Rallongement', 'Rallongement + nail art',                      'Pour rallonger vos ongles. La technique, Gel X (capsules) ou Pop-it (gel), se choisit ensemble sur place, selon vos ongles et vos envies.', 5000, 150, true,  true, true,  'POSE',        'RALLONGEMENT'),
  ('rallongement-pose-na1',           16, 'Rallongement', 'Rallongement + nail art niveau 1',             'Pour rallonger vos ongles. La technique, Gel X (capsules) ou Pop-it (gel), se choisit ensemble sur place, selon vos ongles et vos envies.', 5000, 135, false, true, false, 'POSE',        'RALLONGEMENT'),
  ('rallongement-pose-na2',           17, 'Rallongement', 'Rallongement + nail art niveau 2',             'Pour rallonger vos ongles. La technique, Gel X (capsules) ou Pop-it (gel), se choisit ensemble sur place, selon vos ongles et vos envies.', 5500, 150, false, true, false, 'POSE',        'RALLONGEMENT'),
  ('rallongement-pose-na3',           18, 'Rallongement', 'Rallongement + nail art niveau 3',             'Pour rallonger vos ongles. La technique, Gel X (capsules) ou Pop-it (gel), se choisit ensemble sur place, selon vos ongles et vos envies.', 6000, 165, true,  true, false, 'POSE',        'RALLONGEMENT'),
  ('rallongement-remplissage',        19, 'Rallongement', 'Remplissage rallongement',                     NULL, 5000, 105, true,  true, true,  'REMPLISSAGE', 'RALLONGEMENT'),
  ('rallongement-remplissage-na',     20, 'Rallongement', 'Remplissage rallongement + nail art',          NULL, 5500, 135, true,  true, true,  'REMPLISSAGE', 'RALLONGEMENT'),
  ('rallongement-remplissage-na1',    21, 'Rallongement', 'Remplissage rallongement + nail art niveau 1', NULL, 5500, 120, false, true, false, 'REMPLISSAGE', 'RALLONGEMENT'),
  ('rallongement-remplissage-na2',    22, 'Rallongement', 'Remplissage rallongement + nail art niveau 2', NULL, 6000, 135, false, true, false, 'REMPLISSAGE', 'RALLONGEMENT'),
  ('rallongement-remplissage-na3',    23, 'Rallongement', 'Remplissage rallongement + nail art niveau 3', NULL, 6500, 150, true,  true, false, 'REMPLISSAGE', 'RALLONGEMENT'),
  ('rallongement-depose',             24, 'Rallongement', 'Dépose rallongement',                          'Entre 30 € et 35 € selon la technique et la longueur.', 3000, 45, true, true, true, 'DEPOSE', 'RALLONGEMENT')
ON CONFLICT ("id") DO NOTHING;
