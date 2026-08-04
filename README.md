# Zelart Nails — réservation en ligne

Application de prise de rendez-vous et de suivi client pour **Zélia (Zelart)**, prothésiste
ongulaire et nail artist à Saint-Nazaire (L'Atelier du Regard, 108 avenue de la République).

## Stack

- [Next.js](https://nextjs.org) 16 (App Router, Server Actions) + TypeScript
- [Tailwind CSS](https://tailwindcss.com) v4
- [Prisma](https://www.prisma.io) 7 + PostgreSQL

## Démarrage

```bash
# 1. Dépendances (génère aussi le client Prisma)
npm install

# 2. Configuration : renseigner DATABASE_URL
cp .env.example .env

# 3. Base de données : migrations + données initiales (prestations, horaires)
npm run db:migrate
npm run db:seed

# 4. Lancer le serveur de développement
npm run dev
```

## Modèle de données

| Entité | Rôle |
| --- | --- |
| `Cliente` | Coordonnées + notes de suivi (allergies, préférences…) |
| `Prestation` | Catalogue avec catégorie, durée indicative, prix en centimes, prix « à partir de » |
| `Disponibilite` | Fenêtres d'ouverture récurrentes — lundi à samedi, 9h et 14h (une cliente par fenêtre) |
| `Indisponibilite` | Exceptions ponctuelles : congés, jours fériés… |
| `RendezVous` | Créneau réservé, statut `EN_ATTENTE` par défaut (Zélia confirme à la main) |
| `LignePrestation` | Prestations d'une demande : la cliente peut en cocher plusieurs, la dépose imposée s'y ajoute avec `automatique = true` |
| `InspirationImage` | Photos d'inspiration jointes par la cliente à sa demande |

Les créneaux libres sont **calculés à la volée** (`src/lib/creneaux.ts`) : fenêtres récurrentes,
moins les indisponibilités et les rendez-vous actifs. Les horaires sont interprétés dans le
fuseau `Europe/Paris` quel que soit le fuseau du serveur.

## Parcours de réservation

1. `/` — page d'accueil publique : présentation, prestations & tarifs, infos pratiques.
2. `/reserver` — tunnel en 3 étapes : prestation → créneau → coordonnées.
3. `/confirmation/[id]` — récapitulatif ; la demande reste **en attente** jusqu'à la confirmation
   par Zélia (acompte de 15 € via SumUp pour les nouvelles clientes, cf. CGV).

### Règles selon l'état des ongles

La première étape demande ce que la cliente porte à son arrivée, puis le catalogue est filtré
(`src/lib/regles.ts`, revalidé côté serveur car le formulaire est contournable) :

La cliente peut **cocher plusieurs prestations** dans une même demande ; le prix et la durée sont
cumulés.

**Une pose existante ne se recouvre pas** : elle est soit remplie, soit retirée. Dès lors que la
sélection ne comporte ni remplissage ni dépose, la dépose correspondante est ajoutée d'office —
une seule fois, quel que soit le nombre de poses cochées.

| État à l'arrivée | Remplissage | Dépose |
| --- | --- | --- |
| Ongles nus | non proposé | non proposée |
| Pose faite ailleurs | jamais — Zélia ne reprend pas le travail d'une autre | ajoutée si nouvelle pose |
| Pose Zelart, gainage ou Pop-it | proposé, dans la même technique | ajoutée si nouvelle pose |
| Pose Zelart, Gel X | jamais — les capsules se retirent | ajoutée si nouvelle pose |
| Pose Zelart, vernis semi-permanent | aucun remplissage au tarif | ajoutée si nouvelle pose |

La dépose ajoutée correspond à la technique déclarée et s'ajoute au prix comme à la durée. Les
déposes proposées à la carte sont elles aussi restreintes à cette technique — les tarifs diffèrent
de l'une à l'autre — et une dépose seule n'en déclenche pas une seconde.

La dernière étape comporte une section **inspiration** : la cliente décrit ses envies et joint
jusqu'à 3 photos, que Zélia retrouve sur la demande dans son agenda. La route d'envoi
`/api/inspirations/upload` est publique par nécessité — elle est donc bornée par le type MIME, un
poids de 2 Mo et le nombre d'images ; les URL soumises avec le formulaire sont revalidées côté
serveur pour n'accepter que celles de notre propre stockage.

## Espace gérante (`/admin`)

Protégé par la variable d'environnement `ADMIN_PASSWORD` (session par cookie signé, 30 jours) :

- **Agenda** : demandes à confirmer, rendez-vous à venir, historique — changement de statut en un clic.
- **Clientes** : liste complète avec recherche, nombre de poses honorées, total dépensé et état du
  consentement ; ajout manuel d'une fiche, export CSV (`/api/clientes/export`, séparateur
  point-virgule et BOM UTF-8 pour Excel en français), fiche détaillée avec historique, notes
  privées, accord aux offres et suppression définitive.
- **Prestations** : édition des prix, durées, visibilité.
- **Congés** : blocage de périodes, immédiatement retirées des créneaux publics.
- **Galerie** : upload de photos affichées sur l'accueil.

### Stockage des photos

Les images vivent dans un magasin Vercel Blob. Deux modes d'authentification coexistent et sont
tous deux pris en charge (voir `src/lib/blob.ts`) : le jeton statique `BLOB_READ_WRITE_TOKEN`
— éventuellement préfixé du nom du magasin — ou l'authentification OIDC automatique, où seul
`BLOB_STORE_ID` est exposé.

L'envoi passe par la route `POST /api/galerie/upload` plutôt que par une Server Action, dont le
corps de requête est plafonné à 1 Mo. Le navigateur réduit l'image avant l'envoi (côté max
1600 px, JPEG 82 %) : une photo de téléphone de 5 Mo est transmise en environ 0,5 Mo.

## Notifications e-mail

Deux services sont pris en charge, `BREVO_API_KEY` étant prioritaire sur `RESEND_API_KEY` :

- `NOTIFY_EMAIL` — adresse qui reçoit les nouvelles demandes de rendez-vous.
- `EMAIL_FROM` — adresse expéditrice.

À la confirmation d'un rendez-vous depuis l'espace gérante, la cliente reçoit un e-mail
récapitulatif. Sans clé configurée, le site fonctionne normalement, sans e-mails : aucune
réservation n'est perdue, elles restent visibles dans l'agenda de `/admin`.

La page `/admin/reglages` affiche l'état de cette configuration et permet d'envoyer un e-mail de
test en affichant l'erreur exacte du service.

## Acompte des nouvelles clientes

Zélia colle dans `/admin/reglages` un **lien de paiement SumUp réutilisable** (créé depuis
l'application SumUp : *Paiements par lien* → montant fixe → *Activer lien réutilisable*). Toute
cliente sans autre rendez-vous actif reçoit alors automatiquement, à sa réservation, un e-mail
contenant ce lien et le rappel des conditions.

Le lien réutilisable est préféré à l'API SumUp : les `hosted_checkout_url` créés par l'API
n'ont qu'une validité de 30 minutes, incompatible avec un lien envoyé par e-mail.

L'agenda signale les nouvelles clientes, l'état de l'acompte (`acompteDemandeLe`,
`acompteRegleLe`) et permet de renvoyer le lien ou de marquer l'acompte reçu. Sans lien
configuré, rien n'est envoyé : la demande reste manuelle.

## Campagnes de fidélisation

L'onglet **Campagnes** de l'espace gérante permet de composer un e-mail, de choisir un groupe de
destinataires, de s'envoyer un test puis de diffuser.

Le cadre légal est respecté par construction : seules les clientes ayant explicitement coché la case
de consentement à la réservation (`consentementMarketing`) et ne s'étant pas désinscrites sont
contactables. Chaque message porte l'identité de l'entreprise et un lien de désinscription en un
clic (`/desabonnement/[jeton]`), sans authentification. Les pages `/mentions-legales` et
`/confidentialite` complètent le dispositif.

Les segments sont définis dans `src/lib/segments.ts` : toutes, clientes à relancer (aucun rendez-vous
depuis 3 mois), nouvelles clientes (moins de 60 jours), clientes fidèles (3 rendez-vous honorés).

L'envoi est **découpé en lots** appelés en boucle par le navigateur (`POST /api/campagnes/envoyer`) :
la progression est visible, aucune requête ne dépasse le temps d'exécution autorisé, et une
campagne interrompue reprend là où elle s'était arrêtée — chaque destinataire n'étant traité
qu'une fois grâce à la contrainte d'unicité sur `EnvoiCampagne`.

## À FAIRE : nom de domaine et adresse e-mail de Zélia

Configuration actuelle (provisoire) : Resend sans domaine vérifié, ce qui impose deux limites —
expéditeur figé à `onboarding@resend.dev`, et envoi possible uniquement vers l'adresse du compte
Resend. Les notifications ne peuvent donc pas encore partir vers la boîte de Zélia.

Marche à suivre le jour de l'achat du domaine (ex. `zelart.fr`, ~10 €/an chez OVH ou Gandi,
~15 €/an directement dans Vercel — cette dernière option évite toute manipulation DNS) :

1. **Brancher le domaine au site** — Vercel → Settings → Domains → *Add*. Vercel affiche alors les
   enregistrements DNS **propres à ce projet** : les recopier tels quels chez le registrar (ne pas
   réutiliser des valeurs trouvées ailleurs, elles varient d'un projet à l'autre). Le certificat
   HTTPS est automatique une fois la propagation faite.
2. **Vérifier le domaine chez Resend** — resend.com → *Domains* → *Add Domain* → ajouter les
   enregistrements DKIM/SPF fournis chez le registrar → attendre la validation.
3. **Mettre à jour les variables Vercel** :
   - `EMAIL_FROM` = `Zelart Nails <contact@zelart.fr>`
   - `NOTIFY_EMAIL` = `Zelia.barreteaupro@outlook.fr`
   - `SITE_URL` n'a pas à être renseignée : les liens des e-mails suivent automatiquement le
     domaine de production (`src/lib/site.ts`).
4. **Redéployer**, puis vérifier via `/admin/reglages` (test d'envoi vers l'adresse de Zélia) et
   par une réservation réelle de bout en bout.

Alternative sans achat de domaine : basculer sur [Brevo](https://brevo.com) (`BREVO_API_KEY`), qui
autorise l'envoi vers n'importe quel destinataire ; l'adresse expéditrice se valide en cliquant un
lien reçu dans la boîte concernée.

## Prochaines étapes envisagées

- Commandes de press-on nails (sets personnalisés et collections).
- Rappels automatiques avant le rendez-vous (e-mail/SMS).
- Compression automatique des photos à l'envoi dans la galerie.
