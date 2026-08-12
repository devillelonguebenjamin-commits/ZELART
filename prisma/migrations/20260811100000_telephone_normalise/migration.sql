-- Numéro de téléphone réduit à ses chiffres, pour reconnaître une cliente déjà
-- enregistrée qui réserve avec une autre adresse e-mail.
ALTER TABLE "Cliente" ADD COLUMN "telephoneNormalise" TEXT;

-- Reprise de l'existant. Même règle que src/lib/telephone.ts : chiffres seuls,
-- indicatif +33 ramené à 0, et rien en dessous de neuf chiffres — un numéro
-- tronqué rapprocherait des clientes sans lien.
UPDATE "Cliente"
SET "telephoneNormalise" = CASE
  WHEN regexp_replace("telephone", '\D', '', 'g') LIKE '0033%'
    THEN '0' || substring(regexp_replace("telephone", '\D', '', 'g') FROM 5)
  WHEN regexp_replace("telephone", '\D', '', 'g') LIKE '33%'
    THEN '0' || substring(regexp_replace("telephone", '\D', '', 'g') FROM 3)
  ELSE regexp_replace("telephone", '\D', '', 'g')
END;

UPDATE "Cliente"
SET "telephoneNormalise" = NULL
WHERE length("telephoneNormalise") < 9;

CREATE INDEX "Cliente_telephoneNormalise_idx" ON "Cliente"("telephoneNormalise");
