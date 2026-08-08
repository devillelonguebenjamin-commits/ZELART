-- Trois créneaux par jour à partir d'octobre 2026 : 9h, 13h, 16h.
--
-- L'ancien calendrier (9h–12h30 et 14h–18h) n'est pas supprimé mais arrêté au
-- 30 septembre : les rendez-vous déjà pris en août et septembre doivent rester
-- valides, et le taux de remplissage de ces mois-là doit continuer de se
-- calculer sur les horaires qui avaient alors cours.
--
-- Le dimanche et le lundi restent fermés : les nouvelles lignes ne couvrent que
-- le mardi (2) au samedi (6).

UPDATE "Disponibilite"
   SET "actifJusquau" = TIMESTAMP '2026-09-30 00:00:00'
 WHERE "actifJusquau" IS NULL;

INSERT INTO "Disponibilite" ("id", "jourSemaine", "heureDebut", "heureFin", "actifDu")
SELECT
  'dispo-oct-' || j || '-' || replace(h.debut, ':', ''),
  j,
  h.debut,
  h.fin,
  TIMESTAMP '2026-10-01 00:00:00'
FROM generate_series(2, 6) AS j
CROSS JOIN (VALUES ('09:00', '13:00'), ('13:00', '16:00'), ('16:00', '19:00')) AS h(debut, fin);
