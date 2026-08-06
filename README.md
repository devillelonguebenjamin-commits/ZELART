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
| `LignePrestation` | Prestations d'une demande : la cliente peut en cocher plusieurs, la dépose imposée s'y ajoute avec `automatique = true` ; `prixCents` fige le tarif du jour |
| `InspirationImage` | Photos d'inspiration jointes par la cliente à sa demande |
| `ModelePressOn` | Catalogue des press-on : sets sur-mesure et collections déjà dessinées |
| `CommandePressOn` | Commande d'un set : mode de remise, frais de port, statut de fabrication |
| `ImagePressOn` | Photos jointes par la cliente à sa commande de press-on |

Les créneaux libres sont **calculés à la volée** (`src/lib/creneaux.ts`) : fenêtres récurrentes,
moins les indisponibilités et les rendez-vous actifs. Les horaires sont interprétés dans le
fuseau `Europe/Paris` quel que soit le fuseau du serveur.

## Parcours de réservation

1. `/` — page d'accueil publique : présentation, prestations & tarifs, infos pratiques.
2. `/reserver` — tunnel en 4 étapes : état des ongles → prestation → créneau → coordonnées.
   Faute de créneau convenable, la cliente peut s'inscrire en liste d'attente ou proposer son
   propre horaire.
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

## Espace cliente (`/mon-espace`)

Entièrement **facultatif** : aucune inscription, aucun mot de passe. La cliente saisit l'adresse
utilisée lors de sa réservation et reçoit un lien de connexion valable 30 minutes et à usage
unique (`JetonConnexion`). La session tient ensuite 60 jours dans un cookie signé.

Elle y retrouve ses rendez-vous à venir avec le détail des prestations, l'historique de ses poses,
son **code de parrainage** et la liste de celles venues grâce à elle, ainsi qu'un interrupteur pour
recevoir ou non les offres — ce qui la rend autonome et décharge Zélia des désinscriptions.

Le parrainage se saisit facultativement à la réservation (champ insensible à la casse) : le
rattachement n'a lieu qu'une fois et jamais vers soi-même. La fiche cliente de l'espace gérante
affiche la marraine et les filleules, à charge pour Zélia d'accorder la contrepartie de son choix.

Pour ne pas révéler qui est cliente, la demande de lien répond toujours la même chose, que
l'adresse existe ou non, et un envoi n'est possible qu'une fois par minute.

### Roue de fidélité

Une pose marquée `TERMINE` fait progresser la jauge de la cliente ; à chaque palier (réglable,
3 par défaut) elle gagne un tour depuis son espace. Chaque gain produit un code à présenter au
salon, que la gérante marque comme honoré depuis la fiche cliente.

Le tirage a lieu **côté serveur** (`src/lib/roue.ts`), dans une transaction sérialisable qui
revérifie la jauge : l'animation ne fait qu'afficher un résultat déjà décidé, et deux clics
simultanés ne peuvent pas produire deux lots.

Les lots vivent en base (`LotFidelite`) et se gèrent depuis `/admin/roue` : libellé, texte affiché
sur le quartier, couleur, activation, et **chance exprimée en poids** — la part réelle est calculée
sur le total des lots actifs, si bien qu'aucune saisie ne peut rendre la roue incohérente. La même
page permet des tirages d'essai, sans gain enregistré ni jauge consommée. Un lot déjà gagné est
désactivé plutôt que supprimé, pour ne pas rompre l'historique des récompenses.

## Espace gérante (`/admin`)

Protégé par la variable d'environnement `ADMIN_PASSWORD` (session par cookie signé, 30 jours) :

- **Agenda** : demandes à confirmer, rendez-vous à venir, historique — changement de statut en un clic.
- **Chiffres** : chiffre d'affaires mois par mois (poses honorées + press-on remis), panier moyen,
  prestations les plus demandées, taux de remplissage sur 30 jours, part de clientes qui reviennent
  et créneaux perdus. Le prix est figé sur chaque ligne de prestation au moment de la demande
  (`LignePrestation.prixCents`) : modifier un tarif ne réécrit pas l'historique.
- **Clientes** : liste complète avec recherche, nombre de poses honorées, total dépensé et état du
  consentement ; ajout manuel d'une fiche, export CSV (`/api/clientes/export`, séparateur
  point-virgule et BOM UTF-8 pour Excel en français), fiche détaillée avec historique, notes
  privées, accord aux offres et suppression définitive.
- **Prestations** : édition des prix, durées, visibilité.
- **Réglages → Mes réseaux** : liens Instagram, TikTok et un lien libre (Linktree, Pinterest…),
  saisis au choix sous forme de pseudo (`@zelart`) ou d'adresse complète. Ils apparaissent dans le
  pied de page, dans un bloc de l'accueil et au bas de l'e-mail de confirmation ; un champ vide
  n'affiche rien.
- **Press-on** : commandes reçues (chiffrage des frais d'envoi, envoi de la demande de règlement,
  avancement de la fabrication, note interne) et catalogue des sets affichés sur `/press-on`.
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
contenant ce lien et le rappel des conditions — sauf sur un horaire proposé, où la demande
attend l'accord de Zélia (cf. *Horaire proposé par la cliente*).

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

`EMAIL_FROM` s'écrit indifféremment `zelia@exemple.fr` ou `Zelart Nails <zelia@exemple.fr>` : Brevo
exige l'adresse et le nom séparément, la conversion est faite à l'envoi. L'onglet **Réglages**
interroge la liste des expéditeurs validés chez Brevo et signale une adresse qui ne l'est pas
encore, plutôt que de laisser surgir un refus au premier envoi réel.

## Commandes de press-on (`/press-on`)

La vente de press-on est une activité à part entière, distincte des rendez-vous : elle a donc son
propre parcours, sans créneau ni agenda.

1. La cliente choisit un set — sur-mesure (tarifé au niveau de nail art) ou modèle de collection —
   décrit ses envies, joint des photos, indique la forme, la longueur et ses mesures.
2. Elle choisit la remise **en main propre** ou **par la poste** ; l'adresse devient alors
   obligatoire, les frais d'envoi restant à sa charge (cf. CGV).
3. Zélia reçoit la commande dans `/admin/press-on`, chiffre les frais d'envoi le cas échéant, puis
   envoie la demande de règlement (lien SumUp des réglages).
4. Les press-on étant personnalisés, **le règlement précède la fabrication** : le parcours de statuts
   suit cet ordre (demande → à régler → réglée → en fabrication → prête → remise). Le passage à
   « prête » prévient la cliente par e-mail.

La cliente suit l'avancement de sa commande depuis `/mon-espace`.

## Direction artistique

Le motif de la marque — de larges rubans roses qui ondulent — est dessiné en SVG dans
`src/components/Vagues.tsx`, jamais en image : rien à télécharger, net sur tous les écrans,
teinte pilotée par les classes Tailwind. Trois échelles, une seule signature :

| Composant | Où | Rôle |
| --- | --- | --- |
| `<Vagues variante="hero" />` | accueil, pages de confirmation | grand fond de page |
| `<Vagues variante="bandeau" />` | en-têtes de `/reserver`, `/press-on`, `/mon-espace` | bandeau plat |
| `<Vagues variante="bloc" />` | encart « L'institut » | angle d'une carte |
| `<CreteVagues />` | haut du pied de page | séparation ondulée |
| `<TraitVagues />` | sous les titres de section | petit trait |

Le fond s'attend à un parent `relative isolate overflow-hidden` : `isolate` crée le contexte
d'empilement sans lequel le `-z-10` du motif l'enverrait derrière la page entière, et
`overflow-hidden` le recadre. Le motif est `aria-hidden`, non cliquable, et masqué à
l'impression.

Pour l'ajuster : `SCENES` décrit chaque scène (hauteur, rubans, dégradé de fondu), et
l'opacité globale se règle sur le `<svg>`. Les rubans restent opaques entre eux — les rendre
translucides un par un ferait ressortir chaque croisement en rose plus soutenu.

## Carrousel de la galerie

`src/components/CarrouselGalerie.tsx` remplace l'ancienne grille de vignettes. Le défilement
reste natif — donc fluide au doigt, au pavé tactile, à la molette et au clavier — et le
composant n'ajoute que ce que le navigateur ne fait pas seul :

- **flèches** et **indicateur de position** (largeur et place calquées sur une barre de
  défilement), affichés seulement s'il y a de quoi défiler ;
- **glissement à la souris**, que le défilement natif ne propose pas. L'accrochage est
  suspendu pendant la prise puis rétabli, ce qui repose la vignette la plus proche en place.
  Les images sont `draggable={false}`, sans quoi le navigateur lance son propre
  glisser-déposer ;
- **défilement automatique** en aller-retour toutes les 4,5 s, suspendu au survol, au focus
  et quand l'onglet passe à l'arrière-plan, arrêté net dès la première manipulation, et
  pilotable par le bouton pause.

La mise en avant de la vignette centrée (échelle et opacité) est en CSS pur, calée sur le
défilement via `animation-timeline: view(x)` : elle tourne hors du fil principal, et les
navigateurs qui l'ignorent affichent simplement des vignettes toutes égales.

`prefers-reduced-motion: reduce` désactive le défilement automatique, l'animation de
glissement et la mise en avant. La préférence est lue par `useSyncExternalStore` : le rendu
serveur suppose l'animation permise et l'hydratation rétablit la vérité.

## Avis Google

Le bas de la page d'accueil reprend les avis de la fiche Google, dans le même carrousel que la
galerie. Deux limites tiennent à la plateforme, pas au site :

- **Google ne transmet que cinq avis**, et c'est lui qui les choisit. L'API n'offre aucun moyen
  d'en obtenir davantage ni de trier.
- Ses conditions imposent de **reprendre les avis tels quels** — pas de coupe, pas de retouche —
  avec l'auteur crédité et un lien vers Google. C'est ce que fait `AvisGoogle.tsx`.

**Mise en place.** Créer une clé d'API Places (New) dans la console Google Cloud (facturation
activée, quota mensuel offert largement suffisant ici) et la poser dans `GOOGLE_PLACES_API_KEY`
sur Vercel. Zélia connecte ensuite son établissement depuis **Réglages → Avis Google** : elle
tape le nom de sa fiche — ou colle le lien de sa page Google, dont le champ extrait ce qu'il
faut — choisit dans la liste, c'est fini. Le `placeId` est conservé en base, personne n'a besoin
d'aller le chercher dans la console.

Les liens de *recherche* Google ne contiennent pas d'identifiant d'établissement, seulement le
terme recherché : c'est donc lui qui sert de requête, orientée vers la région de Saint-Nazaire
pour qu'un nom aussi court que « ZELART » ne ramène pas des salons du monde entier. Les liens
Maps et les identifiants `ChIJ…` sont reconnus directement.

**Cache.** `fetch` n'est pas mis en cache par défaut en Next 16 sans `cacheComponents`, et un
cache en mémoire ne survivrait pas d'une instance à l'autre. Les avis sont donc stockés en base
(`Parametre.avisGoogleCache`), rafraîchis au bout de six heures — soit quatre appels par jour
quelle que soit la fréquentation. Si Google tombe, le dernier état connu reste affiché plutôt
que de vider la section.

Sans clé ou sans établissement connecté, la section n'apparaît pas et Réglages indique ce qui
manque.

## Envois automatiques quotidiens

La planification Vercel (`vercel.json`) appelle `/api/taches/rappels` chaque matin à 7 h,
protégée par `CRON_SECRET`. Quatre envois y sont regroupés, chacun horodaté sur le
rendez-vous pour ne jamais partir deux fois :

| Envoi | Déclencheur | Champ témoin |
| --- | --- | --- |
| Rappel de rendez-vous | La veille d'un rendez-vous confirmé | `rappelEnvoyeLe` |
| Relance de repousse | Délai propre à la technique posée | `relanceEnvoyeeLe` |
| Demande d'avis Google | 3 jours après une pose terminée | `demandeAvisEnvoyeeLe` |
| Relance d'acompte | 24 h après l'envoi du lien, si non réglé | `acompteRelanceEnvoyeeLe` |
| Reconquête | 90 jours sans venir | `Cliente.reconqueteEnvoyeeLe` |

Tous dépendent du réglage *Activer les envois automatiques*, **sauf la relance d'acompte** :
comme l'envoi initial du lien, elle s'active dès qu'un lien SumUp est configuré — c'est le
fonctionnement attendu de l'acompte, pas un rappel de confort.

La tâche tournant à 7 h, le rappel de rendez-vous part la veille au matin, soit 24 à 32 h
avant selon l'heure du créneau.

La demande d'avis n'est envoyée **qu'une fois par cliente**, jamais à chaque visite, et
seulement si un établissement Google est connecté.

La reconquête vise les clientes dont la dernière pose honorée remonte à plus de 90 jours et
qui n'ont aucun rendez-vous à venir. Le témoin étant porté par la fiche cliente et non par un
rendez-vous, il est comparé à la dernière venue : une cliente qui revient puis s'éclipse de
nouveau pourra le recevoir une seconde fois, sans jamais être relancée deux fois pour la même
absence.

Ni la reconquête ni la demande d'avis ne partent à une cliente désinscrite ; la reconquête
épargne en plus les clientes bloquées.

## Programme de parrainage « Squad »

La filleule saisit le code de sa marraine à sa première réservation : elle obtient **−15 % sur
sa première prestation**, cumulables avec les autres offres. La marraine gravit des paliers.

| Palier | Filleules venues | Avantage |
| --- | --- | --- |
| Bestie 💕 | 1 | −15 % sur une prestation |
| Squad 🌟 | 3 | Une manucure offerte |
| Icône 👑 | 5 | Un nail art niveau 2 ou un set de press-on, au choix |
| DIVA 💎 | 10 | Statut Ambassadrice : une pose offerte par an, dépose offerte |

**Une filleule ne compte que lorsqu'elle est venue** (rendez-vous passé en *Terminé*). Sans
cette règle, trois inscriptions jamais honorées offriraient une manucure.

**Le code n'est accepté qu'à une première réservation.** Une filleule comptant dès qu'elle a une
pose honorée, sans cette condition une habituée pourrait saisir le code d'une amie et la faire
monter d'un palier sur-le-champ, sans amener personne. Le champ est d'ailleurs masqué aux
clientes connectées, à qui l'offre de bienvenue ne s'adresse plus.

**Validation de la venue.** Le bouton *Elle est bien venue* de l'agenda remplace l'ancien
« Terminé » : il ouvre un champ de commentaire, signale le cas échéant que la cliente est une
filleule, et **annonce en retour le palier débloqué chez la marraine** — sinon Zélia offrirait
une manucure sans le savoir. Le commentaire se retrouve dans l'historique de la fiche cliente,
distinct de la fiche technique : celle-ci décrit la pose, celui-là raconte la visite.

Ce retour impose une contrainte de rendu : les sections de l'agenda sont découpées **par date
seule, jamais par statut**. Un composant qui changerait de section à la validation serait
démonté puis remonté, et le message disparaîtrait avant d'être lu. Ce découpage corrige au
passage un défaut plus ancien — un rendez-vous futur annulé par erreur devenait introuvable,
son bouton *Réactiver* hors d'atteinte.

Le palier n'est **jamais stocké** : il se recalcule à chaque lecture depuis les filleules
venues, si bien qu'un rendez-vous repassé en annulé ajuste le décompte tout seul. Seuls les
avantages accordés sont conservés, puisqu'ils se consomment.

L'attribution se déclenche au passage d'un rendez-vous en *Terminé*, et à nouveau chaque matin
pour renouveler la pose annuelle des Ambassadrices — un changement d'année ne touche aucun
rendez-vous et ne déclencherait rien sans ce passage. Elle est **idempotente** : la contrainte
d'unicité `(cliente, type, période)` garantit qu'un avantage n'est jamais accordé deux fois,
même si les deux déclencheurs se croisent. Tous les paliers franchis sont attribués, pas
seulement le dernier : trois filleules d'un coup rapportent Bestie *et* Squad.

**Maintien du statut Ambassadrice** — sans filleule venue depuis douze mois, le statut redescend
à Icône jusqu'à réactivation. Les avantages déjà gagnés restent acquis ; seuls la pose annuelle
et la dépose offerte sont suspendues. C'est pourquoi la dépose n'est **jamais annoncée « à
vie »** aux clientes : promettre puis reprendre serait pire que de ne rien promettre.

Le site n'encaisse pas : les remises sont **affichées** à la cliente et **rappelées à Zélia** sur
la carte du rendez-vous, sous « À déduire à l'encaissement », avec un bouton *Utilisé* qui
consomme l'avantage — sans quoi le même code pourrait resservir à chaque venue.

## Blocage de clientes (`/admin/bouffonnes`)

Une cliente bloquée depuis cet onglet ne peut plus ni réserver ni commander de press-on. Le
contrôle porte sur **l'adresse e-mail et sur le numéro de téléphone** : la fiche étant unique
par e-mail, réserver avec une autre adresse créerait une fiche neuve et contournerait le
blocage. Les numéros sont comparés après normalisation, `+33` et `0` désignant le même abonné.

Le message affiché ne dit jamais « vous êtes bloquée » : il renvoie vers Zélia par SMS. Rien
ne sert d'humilier quelqu'un sur une page publique, et un refus explicite invite surtout à
recommencer avec d'autres coordonnées.

Bloquer **n'annule pas** les rendez-vous déjà pris : ce serait irréversible, et Zélia peut
vouloir honorer celui de la semaine avant de fermer la porte. Ils sont signalés dans l'onglet,
à elle de les annuler depuis l'agenda.

## Horaire proposé par la cliente

Quand aucun créneau ne convient, la cliente a deux issues plutôt qu'une : s'inscrire en liste
d'attente, ou **proposer elle-même une date et une heure** (`PropositionCreneau`). Une
proposition ne correspond à aucune fenêtre d'ouverture : le calendrier récurrent ne peut donc
pas la valider, et c'est la durée des prestations qui délimite le créneau et sert au contrôle
de chevauchement. Deux bornes tout de même, annoncées par le champ (`min`/`max`) **et**
revérifiées côté serveur, seul contrôle qui compte : au moins 24 h de préavis, au plus
90 jours (`src/lib/creneaux-bornes.ts`).

Ces bornes vivent à part de `creneaux.ts`, qui importe Prisma : un composant client important
ce module entraînerait Prisma tout entier dans le bundle du navigateur.

Le rendez-vous est créé en attente avec `creneauPropose = true`. Zélia le repère à son badge
*Horaire proposé* dans l'agenda et répond par **Accepter l'horaire** ou **Refuser l'horaire** —
deux boutons dédiés, là où une demande ordinaire garde *Confirmer* / *Annuler*. Le refus
n'est pas une annulation ordinaire : il envoie un e-mail à la cliente, qui a demandé une heure
et attend une réponse, alors qu'une annulation muette suffit pour un créneau qu'elle avait
choisi elle-même dans la liste.

L'acompte suit la même logique : il n'est **pas** réclamé à la réservation d'un horaire
proposé — faire payer un rendez-vous que Zélia peut refuser n'aurait pas de sens — mais à
l'acceptation.

## Liste d'attente

Quand aucun créneau ne convient, la cliente laisse ses coordonnées à l'étape *Créneau*. À
chaque annulation — par la cliente depuis son espace, ou par Zélia depuis l'agenda — tout le
monde est prévenu d'un coup : pas de date à faire correspondre, la première à réserver garde
le créneau. Chacune n'est prévenue **qu'une fois** ; à elle de se réinscrire si l'annonce ne
débouche sur rien, plutôt que d'être relancée à chaque annulation suivante.

Le bloc s'affiche replié tant qu'il reste des créneaux, et déplié quand il n'y en a plus — sauf
si la cliente est en train de proposer un horaire, les deux chemins s'excluant.

> **Attention en cas de modification** : ce bloc vit à l'intérieur du `<form>` du parcours de
> réservation. Il n'a donc volontairement ni `<form>` à lui — imbriqué, il serait supprimé au
> parsage et son bouton enverrait la demande de rendez-vous — ni attribut `name` sur ses
> champs, qui entreraient en collision avec les `prenom`/`email` de la réservation. Les
> valeurs sont repérées par `data-champ`, invisible des formulaires.

## Référencement

`sitemap.ts` et `robots.ts` produisent `/sitemap.xml` et `/robots.txt` depuis l'adresse réelle
du site. Seules les pages publiques et stables sont listées ; les pages personnelles
(confirmation, espace cliente, désinscription) sont explicitement exclues de l'indexation —
leurs URL portent un jeton à usage unique qu'un robot consommerait pour rien.

L'accueil émet un bloc JSON-LD `NailSalon` (adresse, téléphone, horaires de prise de
rendez-vous), enrichi de la note moyenne dès que les avis Google sont connectés. Les valeurs
passent par `jsonLdSecurise()`, qui échappe les chevrons : un avis contenant `</script>`
casserait sinon la page.

## Ajout au calendrier

`/api/calendrier/[id]` sert un fichier `.ics` (RFC 5545) ouvert par Google Agenda, Apple
Calendrier ou Outlook. Le lien figure sur la page de confirmation, dans l'espace cliente et
dans les e-mails de confirmation et de rappel.

Un lien plutôt qu'une pièce jointe : Brevo et Resend ont des API de pièces jointes
différentes, et un lien fonctionne aussi depuis le site. L'identifiant du rendez-vous suffit à
y accéder, comme pour la page de confirmation.

## Prochaines étapes envisagées

- Envoi de SMS en complément des e-mails (rappels et campagnes) — payant, contrairement à
  l'e-mail : suppose de choisir un fournisseur et d'accepter un coût par message.
- Encaissement réellement automatique de l'acompte (webhook SumUp ou Stripe), pour se passer
  du pointage manuel « Acompte reçu ».
- Nom de domaine propre (cf. section dédiée plus haut).
