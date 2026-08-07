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
| `Disponibilite` | Fenêtres d'ouverture récurrentes, avec période de validité facultative (une cliente par fenêtre) |
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

### Jours d'ouverture et jours de repos

Ouverture du **mardi au samedi**, 9h–12h30 et 14h–18h. Le dimanche est fermé de longue date ; le
**lundi l'est depuis le 1er octobre 2026**.

Cette bascule a demandé une période de validité sur `Disponibilite` (`actifDu` / `actifJusquau`,
bornes comprises, vides = de tout temps). Sans elle, un changement d'horaires n'aurait pu se faire
qu'au présent : supprimer la ligne du lundi aurait fermé **aussi** les lundis de septembre, et
retiré de l'agenda ceux qui y étaient déjà réservés. La ligne est donc conservée avec une date de
fin plutôt que supprimée.

La comparaison se fait sur la **clé de jour parisienne** (`2026-10-05`), jamais sur les instants :
deux dates du même jour peuvent différer de plusieurs heures selon l'heure enregistrée, et un
`<=` sur les instants ouvrirait ou fermerait un jour de trop selon la saison.

Trois endroits lisent ces bornes, et les trois doivent le faire : les créneaux proposés à la
cliente, le taux de remplissage des statistiques, et surtout `fenetrePourDebut` — seul contrôle
qui décide si une réservation passe. Un formulaire resté ouvert la veille d'une fermeture
proposerait sinon un créneau devenu invalide. Le calendrier de l'espace gérante hachure les jours
de repos, l'absence de rendez-vous ne distinguant pas un jour fermé d'un jour creux.

> Les horaires n'ont pas d'interface d'administration : ils vivent dans le seed et se modifient
> par migration. C'est une limite connue, pas un oubli de cette évolution.

## Parcours de réservation

1. `/` — page d'accueil publique : présentation, prestations & tarifs, infos pratiques.
2. `/reserver` — tunnel en 4 étapes : état des ongles → prestation → créneau → coordonnées.
   Faute de créneau convenable, la cliente peut s'inscrire en liste d'attente ou proposer son
   propre horaire.
3. `/confirmation/[id]` — récapitulatif ; la demande reste **en attente** jusqu'à la confirmation
   par Zélia (acompte de 15 € via SumUp pour les nouvelles clientes, cf. CGV).

## Les prestations expliquées (`/prestations`)

Page publique destinée à celles pour qui « gainage », « Gel X » ou « Pop-it » ne veulent rien
dire. Elle explique les quatre techniques, les trois mots qui reviennent (pose, remplissage,
dépose), la règle de la pose qui ne se recouvre pas, et ce que chaque niveau de nail art ajoute.

**Tout y est déduit du catalogue et des règles, jamais recopié à côté** (`src/lib/explications.ts`) :

- les tarifs, durées et définitions viennent des `Prestation` actives ;
- « remplissage possible » se lit sur l'existence d'une prestation de remplissage dans la
  catégorie, pas sur une liste écrite en dur — c'est la même vérité que celle appliquée par
  `regles.ts` au moment de réserver ;
- le retour conseillé reprend le délai de relance configuré dans les réglages ;
- le supplément de chaque niveau de nail art est **mesuré** : écart de prix et de durée entre la
  prestation décorée et la même sans décor, rendu sous forme de fourchette si les catégories
  divergent.

Le sens des niveaux (ce qui sépare un niveau 2 d'un niveau 3) ne vit nulle part dans le système :
seule Zélia en juge, à la lecture d'une inspiration. La page s'en tient donc à ce qui est
vérifiable — le supplément et le temps — et renvoie vers la photo d'inspiration pour le reste.
Inventer des définitions que le salon ne suivrait pas serait pire que de ne rien dire.

Une prestation modifiée, retirée ou reprisée se répercute donc sans que personne pense à cette
page. La description affichée est celle d'une **pose** de la catégorie : prise au premier venu,
c'était celle de la dépose (la moins chère), et le semi-permanent se définissait comme « dépose
seule de votre vernis semi-permanent ».

**Accès** : entrée « Prestations » de l'en-tête (qui remplace le lien vers l'ancre des tarifs —
la page porte les tarifs en lien, l'inverse n'était pas vrai), lien dans la section tarifs de
l'accueil et dans le pied de page, tous deux visibles sur téléphone où l'en-tête masque ses
entrées secondaires, et lien depuis le tunnel de réservation, ouvert dans un onglet à part pour
ne pas faire perdre la sélection en cours.

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
- **Agenda** : un **calendrier mensuel** en tête de page — rendez-vous colorés par statut, congés
  posés sur chaque journée qu'ils recouvrent, jour courant marqué —, puis les listes habituelles.
  La navigation passe par `?mois=2026-08` : sans paramètre, la page retombe sur le mois en cours,
  ce qui donne le bouton « Aujourd'hui » sans calcul supplémentaire. Naviguer dans le calendrier
  ne touche pas aux listes, qui restent centrées sur l'actualité.
- **Chiffres** : chiffre d'affaires mois par mois (poses honorées + press-on remis), panier moyen,
  prestations les plus demandées, taux de remplissage sur 30 jours, part de clientes qui reviennent
  et créneaux perdus. Le prix est figé sur chaque ligne de prestation au moment de la demande
  (`LignePrestation.prixCents`) : modifier un tarif ne réécrit pas l'historique.
- **Clientes** : liste complète avec recherche, nombre de poses honorées, total dépensé et état du
  consentement ; ajout manuel d'une fiche, suppression directe par la croix en bout de ligne —
  en deux temps, la confirmation rappelant combien de rendez-vous disparaîtraient avec la fiche —,
  export CSV (`/api/clientes/export`, séparateur
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
- **Parrainage** : avantages à honorer (pastille de rappel dans la navigation), classement des
  marraines et rappel des paliers — cf. *Programme de parrainage « Squad »*.

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

## Paiement des press-on

Le lien « Régler ma commande » pointait vers le **lien réutilisable des réglages**, c'est-à-dire
l'acompte de 15 € des rendez-vous : une cliente devant 65 € arrivait sur une page à 15 €, alors
que l'e-mail annonçait le bon total. Chaque commande porte désormais son propre lien, au bon
montant.

**Ce qui est réclamé en ligne dépend du mode de remise** (`montantARegler`, `lib/press-on.ts`) :

| Mode | Demandé d'avance | Solde |
| --- | --- | --- |
| Envoi postal | la totalité, port compris | — |
| Retrait au salon | l'acompte configuré dans les réglages | en espèces ou par carte à la remise |

Le set part de chez Zélia dans un cas, la cliente revient dans l'autre : d'où la différence. Mais
quelque chose est réglé avant fabrication dans les deux cas — un set sur-mesure jamais récupéré
est de la matière et des heures perdues. La case « conditions de vente » du formulaire annonce
l'un ou l'autre selon le mode choisi : promettre un « paiement intégral » à qui ne réglera qu'un
acompte serait faux, et c'est une case qui engage.

### D'où vient le lien

Trois sources, dans cet ordre : le lien **collé à la main** sur la commande (Zélia a tranché
elle-même), puis l'**API SumUp** si `SUMUP_API_KEY` et `SUMUP_MERCHANT_CODE` sont renseignés.
Sans l'une ni l'autre, rien n'est envoyé et Zélia est invitée à coller un lien — le site ne
devine jamais un montant.

`lib/sumup.ts` crée un *checkout* hébergé (`hosted_checkout.enabled`) et récupère
`hosted_checkout_url`. **`valid_until` est volontairement omis** : la spécification officielle de
SumUp le décrit comme facultatif — « si omis, le checkout n'a pas de date d'expiration
explicite ». Le lien envoyé par e-mail reste donc valable, ce qui n'allait pas de soi : les
30 minutes souvent citées concernent la session de paiement une fois la page ouverte, pas la
durée de vie du lien. La référence porte l'identifiant de commande suivi d'un horodatage, pour
qu'une seconde demande — un montant corrigé — ne soit pas refusée en doublon.

`SUMUP_API_URL` permet de détourner les appels, comme `BREVO_API_URL` et `RESEND_API_URL` : c'est
ce qui rend ce chemin éprouvable sans compte marchand.

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

Formes proposées : Amande, Arrondi, Ballerine, Carré, Stiletto. Longueurs : Courte, Moyenne,
Longue. Ce sont des suggestions (`datalist`), pas une contrainte : le champ reste libre.

Un **guide de mesure** dépliable (`GuideTailles`) explique où mesurer — la largeur, jamais la
longueur —, propose la méthode de la bande de papier à défaut de réglet, et reporte les dix
valeurs saisies dans le champ « mesures » de la commande. Ses champs n'ont **aucun attribut
`name`** : ils vivent dans le `<form>` de commande et seraient sinon envoyés avec elle. Le report
passe par un bouton et non par la frappe, pour ne pas effacer une précision écrite à la main ; le
texte composé est tronqué à 300 caractères, la limite du champ d'arrivée.


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

La filleule saisit le code de sa marraine à sa première réservation : elle obtient **−10 % sur
sa première prestation**, cumulables avec les autres offres. La marraine gravit des paliers.

| Palier | Filleules venues | Avantage |
| --- | --- | --- |
| Bestie 💕 | 1 | Une huile à cuticule offerte |
| Squad 🌟 | 3 | −10 % sur une prestation |
| Icône 👑 | 5 | Un nail art niveau 2 offert |
| DIVA 💎 | 10 | Statut Ambassadrice : une pose offerte par an |

### Changer le barème sans trahir ce qui a été promis

Le barème a déjà évolué une fois, et deux précautions en découlent.

Les anciennes valeurs de `TypeAvantage` (`BESTIE_REMISE`, `SQUAD_MANUCURE`, `ICONE_CHOIX`) sont
**conservées** avec leurs libellés d'origine, suffixés « ancien barème ». Réutiliser les mêmes
valeurs pour de nouvelles récompenses aurait transformé rétroactivement un « −15 % » gagné en
« huile à cuticule » : la cliente aurait vu changer, dans son espace, ce qui lui avait été promis.

La remise filleule était un simple drapeau, le pourcentage vivant dans le code : passer de 15 à
10 aurait réduit après coup la remise annoncée aux demandes déjà envoyées. Le taux est désormais
**figé sur le rendez-vous** (`remiseFilleulePourcent`), au même titre que le prix de chaque ligne
de prestation, et l'existant a été rattrapé à 15 % par la migration.

Le taux vit dans `lib/parrainage-bareme.ts`, un module **sans dépendance d'exécution** : les
composants qui l'affichent tournent dans le navigateur, et importer `parrainage.ts` y
entraînerait Prisma. Il y était jusqu'ici recopié en dur dans trois composants — il a suffi d'en
changer un pour que les autres mentent.

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
à Icône jusqu'à réactivation. Les avantages déjà gagnés restent acquis ; seule la pose annuelle
est suspendue.

Le site n'encaisse pas : les remises sont **affichées** à la cliente et **rappelées à Zélia** sur
la carte du rendez-vous, sous « À déduire à l'encaissement », avec un bouton *Utilisé* qui
consomme l'avantage — sans quoi le même code pourrait resservir à chaque venue.

### Codes de parrainage

Un code par cliente, tiré à sa création (`nouveauCodeUnique`) : `ZEL-` suivi de 5 lettres d'un
alphabet sans caractères ambigus (`0/O`, `1/I` écartés), ces codes se lisant à voix haute au
salon. La colonne porte une contrainte d'unicité, et le tirage est **vérifié en base avant
insertion** : la contrainte seule transformerait un tirage malheureux en « une erreur est
survenue » au milieu d'une réservation. Après trois échecs le code s'allonge d'une lettre —
signe que le fichier client est dense, pas que la chance manque. Les codes d'avantage
(`SQUAD-…`) suivent les mêmes règles ; leur création distingue les deux échecs possibles, l'avantage
déjà accordé — le cas normal — d'une collision de code, qu'il faut retirer sous peine de perdre
sans bruit un avantage mérité.

### Onglet `/admin/parrainage`

- **Avantages à honorer** : ce qui reste dû, avec le code à présenter et un bouton *Honoré*. Le
  compte s'affiche en pastille sur l'onglet depuis n'importe quelle page — un avantage gagné se
  perdrait dans un e-mail lu en vitesse.
- **La squad** : les marraines classées par filleules venues, avec palier, distance au palier
  suivant, statut Ambassadrice en sommeil le cas échéant, et le nombre de filleules inscrites
  mais pas encore venues — qui explique un palier en apparence en retard.
- **Derniers avantages honorés**, pour retrouver un code présenté deux fois.

Zélia reçoit un e-mail à chaque palier atteint, en plus de celui envoyé à la marraine : c'est
elle qui honore l'avantage au salon et doit pouvoir le préparer. Cet envoi a lieu même si la
marraine est bloquée ou désinscrite — ce sont ses messages à elle qui s'arrêtent, pas le suivi
de la gérante.

Le classement charge toutes les marraines en **une requête** plutôt qu'un `statutParrainage` par
cliente, et les règles de palier vivent dans une fonction unique (`statutDepuisDecompte`)
partagée avec l'espace cliente : deux décomptes séparés finiraient par ne plus dire la même
chose.

## Rendez-vous pris de vive voix

Toutes les clientes ne passeront pas par le site : une habituée appelle, une autre prend rendez-vous
au salon en repartant. Le bouton **« Noter un rendez-vous »** de l'agenda les enregistre.

Trois différences assumées avec une réservation en ligne :

- il naît **confirmé** — l'accord a été pris de vive voix, demander à Zélia de confirmer ce
  qu'elle vient de décider n'aurait pas de sens ;
- **aucun e-mail ne part**, ni demande d'acompte ni notification : elle était dans la conversation ;
- **aucune contrainte de créneau**, ni préavis ni fenêtre d'ouverture. Le calendrier récurrent
  existe pour que les clientes ne réservent pas n'importe quand ; Zélia dispose de son agenda.

Le contrôle de chevauchement, lui, demeure : une double réservation en reste une, qu'elle vienne
du site ou du carnet. **Fiche cliente et rendez-vous sont créés dans la même transaction** — créer
la fiche d'abord laissait, sur un créneau déjà pris, une cliente sans rendez-vous à nettoyer à la
main.

### Clientes sans adresse e-mail

`Cliente.email` est obligatoire et unique, ce qui bloquait la saisie d'une habituée qui n'a pas
d'e-mail. Une **adresse de complaisance** est alors attribuée, sous le domaine `zelart.invalid` —
réservé par la RFC 2606, il ne peut atteindre aucune boîte réelle, ni aujourd'hui ni jamais.
`envoyerEmail` refuse ces adresses **à la source** plutôt que chez chaque appelant : rappels,
avantages, relances, il aurait suffi d'en oublier un pour accumuler les rejets chez le fournisseur
d'envoi.

## Ce qui attend Zélia

`lib/en-attente.ts` compte, en un seul endroit, ce qui réclame un geste : demandes de rendez-vous
à confirmer, commandes de press-on à chiffrer, avantages de parrainage à honorer. Deux
consommateurs s'en servent — les **pastilles** de la barre de navigation, visibles depuis
n'importe quel onglet, et le **récapitulatif quotidien**. Un décompte par consommateur finirait
par ne pas dire la même chose, et c'est exactement ce qui fait cesser de regarder une pastille.

Une pastille ne s'affiche que là où une action est possible : un compteur purement informatif
deviendrait un décor.

Une demande de rendez-vous et une commande déclenchent **déjà** un e-mail sur-le-champ
(`creerReservation`, `commanderPressOn`, vers `NOTIFY_EMAIL`). Le récapitulatif ne les remplace
pas : il rattrape ceux qu'on n'a pas vus passer, faute de quoi un message manqué le mardi ne se
rappelle plus à personne pendant qu'une cliente attend. Il ne part **que** les jours où quelque
chose est en attente — un envoi quotidien vide finirait par se lire sans être ouvert, et celui
qui compte avec.

Comme la relance d'acompte, il ne dépend **pas** du réglage « envois automatiques » : celui-ci
gouverne ce que reçoivent les clientes, pas ce que la gérante se doit de traiter.

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

## Sécurité et robustesse

Points non évidents, issus d'un audit du code — chacun corrigeait un défaut reproduit, pas une
inquiétude théorique.

**Comparaison des cookies de session.** `auth.ts` et `cliente-auth.ts` comparent des octets avec
`timingSafeEqual` : la longueur doit donc se mesurer en octets elle aussi. Mesurée en caractères,
un cookie forgé de 64 caractères accentués passait le contrôle et faisait lever la comparaison —
une erreur 500 sur l'espace gérante, l'espace cliente **et la page de réservation**, qui lit la
session pour se pré-remplir.

**Échappement des e-mails.** Les pages sont protégées par React ; les e-mails sont construits par
concaténation et ne le sont pas. Toute donnée saisie par une cliente passe par `echapperHtml`
(`lib/email.ts`) avant d'entrer dans un corps HTML — sans quoi le champ « message » d'une
réservation place le lien de son choix dans la boîte de Zélia. Les **objets** d'e-mail et les
messages rendus par React ne sont pas échappés : ils afficheraient les entités en clair.

**Délais sur les appels sortants.** Brevo, Resend et Google Places sont bornés par
`AbortSignal.timeout`. Sans cela, un fournisseur qui ne répond pas fige la tâche quotidienne, qui
enchaîne les envois en boucle, jusqu'à ce que la fonction meure sur sa limite de temps sans
laisser de bilan. Un dépassement est signalé comme tel, pas confondu avec un refus.

**Isolation des étapes quotidiennes.** Les six étapes de `executerRappels` sont indépendantes :
une exception dans l'une n'empêche plus les suivantes, elle est consignée et le bilan continue.
La fenêtre de rappel part désormais de *maintenant* et non de *dans 24 h*, pour rattraper une
exécution manquée — le libellé s'adapte (« aujourd'hui » / « demain » / la date).

**Réservation d'un destinataire avant l'envoi.** Les campagnes créent la ligne `EnvoiCampagne`
*avant* d'expédier : c'est la contrainte `(campagne, cliente)` qui arbitre entre deux appels
simultanés. Enregistrée après coup, elle laissait deux onglets envoyer chacun leur copie avant
qu'une des écritures n'échoue en 500 au milieu du lot.

**Durée contre plage d'ouverture.** La fenêtre servait au seul contrôle de chevauchement : six
prestations cumulées débordaient l'heure de fermeture sans alerte (9 h → 14 h pour une fermeture
à 12 h 30). La réservation est refusée avec un message qui renvoie vers Zélia — une séance
exceptionnellement longue reste possible, elle se convient de vive voix.

**Liste d'attente.** Formulaire public : contrôle de blocage (une cliente bloquée s'y inscrivait
et recevait les annonces), une seule inscription active par adresse, et une heure entre deux
réinscriptions. La réponse est la même dans tous les cas — une réponse différenciée dirait qui
figure sur la liste. `notifieeLe` est marqué **avant** chaque envoi et une par une : le
`updateMany` final laissait, si la fonction expirait en cours de boucle, des personnes prévenues
mais non marquées, renotifiées à l'annulation suivante.

**Envoi d'images public.** `/api/inspirations/upload` n'a pas d'authentification par nécessité —
elle sert avant que la cliente existe. Ses bornes de type, poids et nombre valent par requête ;
un compteur en mémoire limite désormais le nombre de requêtes par IP. Ce compteur vit **par
instance** : c'est un garde-fou contre l'abus ordinaire, pas contre un adversaire déterminé.

**Hôte du stockage.** `urlImageValide` accepte le suffixe `.blob.vercel-storage.com`, ce qui
laisse passer n'importe quel magasin Vercel, y compris celui d'un tiers. Renseigner
`BLOB_HOSTNAME` avec l'hôte exact de nos propres envois ferme complètement la porte.

### Reste à faire

- **Purge des images orphelines** : une image envoyée puis abandonnée avant l'envoi du formulaire
  reste indéfiniment dans le magasin. Le nettoyage demande de lister les blobs et de les
  confronter aux `InspirationImage` — non implémenté, faute de pouvoir l'éprouver sans magasin
  réel.
- **Jeton gérante figé** : dérivé de `ADMIN_PASSWORD`, il est identique pour toutes les sessions
  et ne tourne jamais. Un cookie exfiltré reste valable jusqu'au changement de mot de passe.
  Acceptable pour une utilisatrice unique, à revoir si l'accès s'ouvre.
- **Aucun test automatisé dans le dépôt** : les vérifications passent par des scripts Playwright
  tenus hors dépôt, donc non rejoués en intégration continue.

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
Calendrier ou Outlook.

**Seulement une fois Zélia d'accord.** Une demande n'est pas un rendez-vous : l'inscrire au
calendrier de la cliente dès l'envoi du formulaire le lui ferait croire. La route ne répond
donc qu'aux rendez-vous `CONFIRME` ou `TERMINE` (`409` tant que la demande est en attente,
`404` si elle est annulée), et le contrôle est là plutôt que sur les seuls liens : une adresse
gardée de côté ou une page de confirmation restée ouverte contournerait un affichage
conditionnel. La page de confirmation et l'espace cliente masquent le lien en conséquence et
annoncent qu'il arrivera avec l'e-mail de confirmation ; ce sont les e-mails de confirmation
et de rappel, envoyés une fois le rendez-vous validé, qui le portent.

Un lien plutôt qu'une pièce jointe : Brevo et Resend ont des API de pièces jointes
différentes, et un lien fonctionne aussi depuis le site. L'identifiant du rendez-vous suffit à
y accéder, comme pour la page de confirmation.

## Prochaines étapes envisagées

- Envoi de SMS en complément des e-mails (rappels et campagnes) — payant, contrairement à
  l'e-mail : suppose de choisir un fournisseur et d'accepter un coût par message.
- Encaissement réellement automatique de l'acompte (webhook SumUp ou Stripe), pour se passer
  du pointage manuel « Acompte reçu ».
- Nom de domaine propre (cf. section dédiée plus haut).
