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

### Horizon de réservation

Les créneaux sont proposés sur **deux mois** (`HORIZON_JOURS`). Quatre semaines suffisaient tant
que l'agenda se libérait vite ; sur un agenda qui se remplit, elles donnaient l'impression qu'il ne
restait plus rien alors que le mois suivant était entièrement libre. Les jours en question
n'étaient pas perdus par le calcul — vérifié jour par jour — ils étaient hors champ.

Une limite à connaître si l'horizon devait encore s'allonger : l'affichage regroupe les créneaux
par libellé de jour **sans année** (« lundi 10 août »). Au-delà d'un an, deux dates se
confondraient. Deux mois en restent très loin.

### Une cliente par fenêtre

Un rendez-vous, même court, occupe **toute la fenêtre d'ouverture** où il tombe : un rendez-vous
de 16 h retire le créneau de 14 h de la liste, alors que l'après-midi est libre jusque-là. C'est
voulu — Zélia ne reçoit qu'une cliente à la fois et garde de la marge — mais c'est la première
chose qui surprend en regardant un agenda presque vide dont peu de créneaux sont proposés. Les
trois créneaux quotidiens d'octobre atténuent l'effet en découpant la journée plus finement.

**Une prestation longue peut déborder sur la fenêtre suivante.** Les créneaux d'une journée se
touchent (9h–13h, 13h–16h, 16h–19h) : les traiter comme des boîtes étanches refusait des
rendez-vous parfaitement tenables — un nail art niveau 3 avec dépose dépasse trois heures et
n'était réservable qu'au premier créneau du jour. La limite est donc la **fin de la plage
continue** (`finPlageContinue`), pas la fin de la fenêtre choisie : un trou dans la journée (pause
déjeuner) l'arrête, la fermeture aussi. Le rendez-vous enregistré s'étend alors jusqu'à la fin
réelle des prestations, ce qui fait disparaître le créneau suivant de la liste tout seul.

Ce qui reste refusé, et c'est voulu : une demande qui finirait après la fermeture. À partir du
créneau de 16 h, une pose Gel X ou Pop-it de niveau 3 **avec dépose** (3h15 à 3h30) dépasserait
19 h — le message invite alors à prendre un créneau plus tôt ou à écrire par SMS.

### Jours d'ouverture et jours de repos

Ouverture du **lundi au samedi** (9h–12h30 et 14h–18h) jusqu'au 30 septembre 2026, puis du
**mardi au samedi** (9h–13h, 13h–16h, 16h–19h). Le dimanche est fermé de longue date ; le
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

La phrase « À savoir avant de réserver » qui les annonce sur la page d'accueil est **lue dans cette
même table** (`src/lib/horaires.ts`), jamais recopiée : « du lundi au samedi, à 9h ou 14h » y est
restée affichée après que le régime eut changé, et une phrase figée survit toujours au changement
qu'elle décrit. Comme deux régimes datés coexistent, elle en donne deux — celui du jour, et celui
qui prendra le relais avec sa date. C'est aussi ce qu'une cliente veut savoir en réservant à deux
mois.

## La voix du site

**Tout ce qu'une cliente lit est écrit à la première personne.** « Zélia vous confirme le niveau »
est devenu « je vous confirme le niveau », « prévenez Zélia par SMS » est devenu « prévenez-moi ».
Le site n'est pas une vitrine qui parle *de* Zélia : c'est Zélia qui parle. Une prothésiste seule
qui se désigne à la troisième personne sonne comme une enseigne, et c'est précisément ce qu'elle
n'est pas.

La règle vaut pour les pages publiques, l'espace cliente, les messages d'erreur des formulaires et
le corps des e-mails. Quatre exceptions, chacune pour une raison :

- **les mentions légales et l'identification RGPD** (« Zélia Barreteau — Zelart, SIRET… ») : la loi
  attend un nom, pas un « moi » ;
- **la revendication de droit d'auteur** sur les photos, pour la même raison ;
- **la description destinée aux moteurs de recherche** et la ligne du pied de page : une personne
  qui découvre le site dans Google ne sait pas encore qui parle ;
- **l'espace gérante**, qui s'adresse à Zélia et non à une cliente — « 3 doublons à vérifier » n'a
  pas à devenir « mes doublons ».

Les commentaires du code, eux, parlent de Zélia à la troisième personne : ils s'adressent à qui
reprendra le projet, pas à une cliente.

## Ponctuation

**Pas de tiret cadratin dans ce que lisent les clientes.** Il était devenu un tic, présent dans
presque chaque paragraphe, et une incise entre tirets sonne « écrit par une machine » avant même
qu'on en lise le contenu. Les 150 occurrences ont été reprises une à une, et la règle vaut aussi
pour l'espace gérante.

Ce n'est pas un remplacement mécanique : chaque phrase a été rejouée avec la ponctuation qui
convient à ce qu'elle fait.

| Ce que le tiret faisait | Ce qui le remplace |
| --- | --- |
| une incise explicative | des parenthèses, ou une virgule |
| l'annonce d'une cause ou d'une précision | deux-points |
| deux idées collées | un point, et deux phrases |
| séparer un libellé de sa valeur (`Gainage — 45 €`) | deux-points |
| séparer deux données de même rang (titre d'onglet, nom et adresse) | un point médian `·` |
| marquer une case vide dans un tableau | le mot qui convient (`sans légende`, `jamais venue`) |

Restent en place, parce que ce sont d'autres caractères et d'autres usages : le trait d'union des
mots composés (`rendez-vous`, `press-on`, `sur-mesure`), le tiret demi-cadratin des plages horaires
(`9h–13h`) et le signe moins des remises (`−15 %`). Les commentaires du code gardent les leurs :
ils s'adressent à qui reprendra le projet.

## Acquisition et mesure

Le site suivait parfaitement ses clientes une fois qu'elles étaient là, et ne savait rien de la
façon dont elles arrivaient. Cinq manques comblés, du plus structurant au plus discret.

**La mesure d'audience.** `@vercel/analytics` dans le `layout`, sans cookie donc sans bandeau de
consentement. Sans elle, on optimisait à l'aveugle : impossible de savoir combien de personnes
atteignent `/reserver` ni à quelle étape elles renoncent.

**L'image de partage.** `src/app/opengraph-image.tsx` la dessine en code plutôt qu'en fichier
déposé : rien à produire ni à maintenir, et **aucune photo de cliente ne part chez Meta** sans
qu'on l'ait décidé. Sans elle, un lien collé dans une story Instagram ou un message WhatsApp
s'affichait en texte gris, alors que c'est le premier contact de quelqu'un à qui on recommande le
salon.

**Les disponibilités réelles sur l'accueil** (`ProchainsCreneaux`). La disponibilité est le premier
argument d'un salon et elle était cachée derrière un clic. Trois créneaux affichés, pas trente :
une longue liste dirait « personne ne vient ici ».

**Les avis là où l'on hésite** (`AvisRassurance`). Ils vivaient en bas de l'accueil ; deux d'entre
eux passent au-dessus du formulaire de réservation, choisis parmi les plus courts pour ne pas
repousser le formulaire hors de l'écran, et repris tels quels comme Google l'impose.

**« Comment m'avez-vous connue ? »** (`src/lib/provenance.ts`). Facultative, posée une seule fois à
la première réservation, sur une liste fermée pour que les réponses se comptent. La valeur ne
s'écrase jamais : elle raconte la première venue, pas la dernière. Le résultat s'affiche en
proportions dans la page Chiffres, avec le rappel que ce sont des proportions et non un décompte.

## Questions fréquentes (`/questions`)

Combien de temps ça tient, est-ce que ça fait mal, que se passe-t-il en cas de retard : ces
questions partaient en SMS, et chacune coûtait du temps. Elles sont répondues une fois pour toutes
dans `src/lib/faq.ts`, d'où sortent à la fois la page et le balisage `FAQPage` que Google peut
afficher dans ses résultats.

Celles qui touchent aux allergies et à la grossesse renvoient explicitement vers un échange **avant**
le rendez-vous plutôt que de trancher à la place de Zélia.

## SMS (`src/lib/sms.ts`)

Tout le salon fonctionne par SMS ; le site ne parlait que par e-mail. Une cliente qui relève
rarement sa boîte ratait sa confirmation, son rappel et sa demande d'acompte.

Quatre messages seulement le doublent : **confirmation**, **rappel de la veille**, **demande
d'acompte** et **demande d'avis**. Trois principes le tiennent :

- il **ne remplace jamais l'e-mail**, qui porte le détail, les liens et la trace écrite ;
- **rien de commercial n'y passe** : ce sont des messages liés à un rendez-vous demandé, ce qui
  évite d'avoir à recueillir un consentement distinct. Une offre par SMS n'aurait pas sa place ici.
  La demande d'avis est le cas limite : elle ne vend rien, elle suit une prestation reçue, et elle
  respecte la désinscription comme l'e-mail qu'elle double ;
- **un échec ne casse rien** : sans `BREVO_SMS_SENDER` la fonction ne fait rien, et une erreur
  d'envoi n'empêche jamais la confirmation d'exister.

Un numéro fixe ou incomplet est écarté **avant** tout appel à Brevo (`numeroInternational`) plutôt
que d'être envoyé au jugé. La page Réglages indique si le canal est actif et sous quel nom
d'expéditeur (onze caractères au maximum, contrainte de l'opérateur).

La demande d'avis est horodatée dès qu'**un** des deux canaux a fonctionné. Sans cela, un e-mail en
échec laisserait la demande « à faire » et le SMS repartirait le lendemain, puis le surlendemain, à
quelqu'un qui l'a déjà reçu.

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

- les tarifs et les définitions viennent des `Prestation` actives ;
- « remplissage possible » se lit sur l'existence d'une prestation de remplissage dans la
  catégorie, pas sur une liste écrite en dur — c'est la même vérité que celle appliquée par
  `regles.ts` au moment de réserver ;
- le retour conseillé reprend le délai de relance configuré dans les réglages ;
- le supplément de chaque niveau de nail art est **mesuré** : écart de prix entre la prestation
  décorée et la même sans décor, rendu sous forme de fourchette si les catégories divergent.

Le sens des niveaux (ce qui sépare un niveau 2 d'un niveau 3) ne vit nulle part dans le système :
seule Zélia en juge, à la lecture d'une inspiration. La page s'en tient donc à ce qui est
vérifiable — le supplément tarifaire — et renvoie vers la photo d'inspiration pour le reste.
Inventer des définitions que le salon ne suivrait pas serait pire que de ne rien dire.

### La fenêtre de comparaison des niveaux

« Niveau 2 » ne veut rien dire tant qu'on n'a pas vu. Un lien ouvre donc une fenêtre comparant les
trois côte à côte — photo, description, supplément mesuré — depuis la page des prestations **et**
depuis l'étape « choisissez vos prestations » de la réservation, pour que la question se règle sans
quitter le formulaire en cours.

Photos et textes se pilotent depuis `/admin/prestations`. Les textes livrés sont un point de
départ délibérément prudent : ils parlent de complexité et de temps de dessin, jamais de motifs
précis que le salon ne suivrait pas. Vider un champ fait revenir la formulation par défaut plutôt
qu'un blanc, et une carte sans photo affiche « Photo à venir » — mieux qu'un cadre vide qui
passerait pour une image en échec.

Détail d'implémentation qui a coûté un aller-retour : le `<dialog>` était rendu **dans un `<p>`**,
ce que l'analyseur HTML corrige en le sortant du paragraphe — l'hydratation ne retrouvait plus son
arbre. Il vit désormais dans un `<div>`. Les boutons intérieurs sont tous `type="button"` : la
fenêtre de `/reserver` est à l'intérieur du `<form>` de réservation, un `submit` égaré l'aurait
envoyé.

**Aucune durée n'est annoncée aux clientes**, ni sur cette page ni dans le parcours de réservation.
Les durées restent indispensables au calcul des créneaux et Zélia les voit à la saisie manuelle,
mais afficher « comptez 2h30 » engage à la minute près : un ongle abîmé, une hésitation sur la
couleur, et le chiffre devient un reproche.

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

Entièrement **facultatif** : aucun mot de passe obligatoire. La cliente saisit l'adresse de son
compte et reçoit un lien de connexion valable 30 minutes et à usage unique (`JetonConnexion`). La
session tient ensuite 60 jours dans un cookie signé.

### Ouvrir un compte sans réserver (`/mon-espace/inscription`)

Jusqu'ici, la seule façon d'exister dans le site était de réserver : l'espace n'accueillait que
celles qui avaient déjà franchi le pas. Une personne qui découvre le salon, veut noter son code de
parrainage ou préparer sa venue n'avait aucune porte.

Cette porte-là est **silencieuse** : à la différence d'une demande de rendez-vous, rien ne passe
ensuite sous les yeux de Zélia. Trois précautions en découlent, et une abstention.

- **La réponse ne dit jamais si l'adresse était déjà connue.** Elle est mot pour mot la même dans
  les deux cas, sinon le formulaire deviendrait un moyen de vérifier qui est cliente chez Zélia,
  une adresse à la fois.
- **Une fiche existante n'est pas touchée.** Ni nom, ni téléphone, ni mot de passe : le lien de
  connexion part chez sa titulaire, et elle seule le reçoit. S'inscrire avec l'adresse d'une autre
  ne prend rien à personne.
- **Pas de rapprochement par téléphone** (`rapprocherParTelephone: false`). La réservation se
  l'autorise parce qu'elle est relue ; ici, un numéro deviné donnerait accès à l'historique d'une
  habituée enregistrée de vive voix. Une deuxième fiche vaut mieux : elle apparaît dans
  « Doublons », où Zélia tranche.
- **Aucun mot de passe ne se choisit à l'inscription.** La règle « il faut déjà être entrée pour en
  créer un » garantit que la possession de l'adresse a été prouvée ; un mot de passe posé ici la
  briserait, puisqu'il suffirait de s'inscrire avec l'adresse d'une autre pour garder une clé de la
  fiche qu'elle utilisera plus tard.

L'envoi du lien de connexion est sorti dans `src/lib/lien-connexion.ts` : deux portes y mènent
désormais, et les laisser écrire chacune leur version aurait donné deux e-mails différents, deux
durées de validité, et un jour un verrou anti-renvoi appliqué d'un seul côté.

Un compte ouvert de cette façon n'est **pas** dispensé d'acompte : sans cela, s'inscrire suffirait
à contourner l'acompte des nouvelles clientes.

Elle y retrouve ses rendez-vous à venir avec le détail des prestations, l'historique de ses poses,
son **code de parrainage** et la liste de celles venues grâce à elle, ainsi qu'un interrupteur pour
recevoir ou non les offres — ce qui la rend autonome et décharge Zélia des désinscriptions.

Le parrainage se saisit facultativement à la réservation (champ insensible à la casse) : le
rattachement n'a lieu qu'une fois et jamais vers soi-même. La fiche cliente de l'espace gérante
affiche la marraine et les filleules, à charge pour Zélia d'accorder la contrepartie de son choix.

Pour ne pas révéler qui est cliente, la demande de lien répond toujours la même chose, que
l'adresse existe ou non, et un envoi n'est possible qu'une fois par minute.

### Mot de passe facultatif

Le lien par e-mail reste la voie normale, et la seule pour qui ne veut rien créer ni retenir.
Celles qui reviennent souvent peuvent se définir un mot de passe **depuis leur espace connecté** —
le seul endroit où il se choisit. La conséquence est voulue : il faut déjà être entrée pour en
créer un, et l'on n'entre que par le lien reçu sur sa propre boîte. **La possession de l'adresse
est donc toujours prouvée avant qu'un mot de passe existe**, sans écran de validation
supplémentaire à traverser.

Sur la page de connexion, l'entrée « J'ai un mot de passe » est repliée : la mettre à côté du
formulaire habituel obligerait chaque visiteuse à choisir, alors que la plupart n'ont pas de mot
de passe et n'en veulent pas. Oublié, il ne bloque personne : le lien par e-mail connecte sans
lui, et un nouveau se définit depuis l'espace.

Hachage par **`scrypt`** (`src/lib/mot-de-passe.ts`), présent dans Node : lent et gourmand en
mémoire par construction, donc coûteux à attaquer, et sans dépendance native à installer sur
l'hébergement. Sel tiré au hasard pour chacune — deux clientes ayant choisi le même mot de passe
n'ont pas la même empreinte. La comparaison passe par `timingSafeEqual`, et une empreinte abîmée
refuse l'accès au lieu de rendre une erreur 500.

Le refus dit toujours « adresse ou mot de passe incorrect », que l'adresse soit inconnue, sans mot
de passe, ou le mot de passe faux : distinguer révélerait qui est cliente. Les tentatives sont
freinées par adresse (8 sur 10 minutes), en mémoire donc par instance — un garde-fou contre
l'essai répété à la main, pas contre une attaque distribuée.

> Les bornes (`LONGUEUR_MIN`) vivent dans `mot-de-passe-bornes.ts`, sans dépendance. Importées
> depuis `mot-de-passe.ts`, elles entraînaient `crypto` et `util.promisify` dans le paquet du
> navigateur, où `scrypt` n'existe pas : `promisify` échouait au chargement et **toute la page
> cessait de s'afficher**. Même précaution que pour `creneaux-bornes.ts`.

**Contrepartie de cette neutralité** : un envoi raté ressemblait trait pour trait à un envoi
réussi. Le résultat de `envoyerEmail` était ignoré, la cliente lisait « un lien vient d'être
envoyé » et attendait un e-mail jamais parti — sans que personne l'apprenne. C'est le scénario
« je n'arrive plus à me connecter » sans cause visible.

Désormais, un échec d'envoi : retire le jeton créé (sans quoi le verrou d'une minute
considérerait qu'un lien vient de partir et refuserait la nouvelle tentative), et s'inscrit dans
les réglages, où il s'affiche en alerte avec l'adresse concernée et le motif. Le message
disparaît au premier envoi réussi. La réponse faite à la cliente, elle, ne change pas : elle
révélerait sinon quelles adresses sont connues.

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

Une cliente sans autre rendez-vous actif reçoit automatiquement, à sa réservation, un e-mail
contenant un lien de paiement et le rappel des conditions — sauf sur un horaire proposé, où la
demande attend l'accord de Zélia (cf. *Horaire proposé par la cliente*).

### Qui en est dispensée

`acompteADemander()` pose deux questions, et la dispense passe avant le décompte : ce que Zélia
sait de sa cliente l'emporte sur ce que la base a eu le temps d'enregistrer.

L'acompte protège d'une inconnue qui ne vient pas. La règle initiale, « aucun autre rendez-vous
enregistré, donc cliente nouvelle », se trompait sur tout un pan de la clientèle : les habituées
saisies à la main n'ont, dans le site, aucun rendez-vous passé. Elles étaient traitées en
inconnues et se voyaient réclamer quinze euros après un an de fidélité.

Le drapeau `Cliente.acompteDispense` vaut donc pour :

- **toutes les fiches existant à la migration**, qui sont par définition celles de clientes déjà
  connues ;
- **celles que Zélia saisit elle-même**, à la main ou en enregistrant un rendez-vous pris de vive
  voix : si elle vous inscrit, c'est qu'elle vous connaît ;
- **celles auxquelles elle l'accorde** depuis la fiche cliente, où l'interrupteur se trouve.

Il ne vaut **pas** pour les fiches nées en ligne, réservation ou inscription : sans cela, créer un
compte suffirait à contourner l'acompte et il ne servirait plus à rien. La dispense survit à une
fusion de doublons, comme le blocage.

**Deux liens possibles, et la différence n'est pas cosmétique :**

- **un paiement créé pour ce rendez-vous** (API SumUp configurée), qui porte une référence à
  nous — `acompte-<id du rendez-vous>-<horodatage>`, conservée dans `acompteReference` ;
- **le lien réutilisable collé dans `/admin/reglages`**, à défaut. Il fonctionne, mais reste
  anonyme.

Sans aucun des deux, rien n'est envoyé : la demande reste manuelle.

### Constater le règlement sans rien saisir

C'est la référence, et elle seule, qui rend le constat possible. **Une transaction SumUp ne porte
aucune identité de payeuse** : ni nom, ni e-mail, ni téléphone, sur aucun des trois écrans de
l'API (historique, détail d'une transaction, reçu). Vérifié sur la spécification officielle — les
seuls champs disponibles sont le montant, l'horodatage, le statut, le code de transaction et
`product_summary`, recopié de la description du paiement. Le champ `user` d'une transaction est
l'adresse de **la marchande**, pas de la cliente. Un paiement de 15 € y est rigoureusement
indiscernable d'un autre paiement de 15 €.

Rapprocher par nom, e-mail ou téléphone n'est donc pas *approximatif* : c'est impossible, faute de
données. D'où la règle : un lien par acompte, une référence par lien, et la question devient
exacte — `GET /v0.1/checkouts?checkout_reference=…` → `PENDING` · `PAID` · `FAILED` · `EXPIRED`.

Trois moments où la question est posée :

1. **au retour de paiement**, via `return_url` → `/api/sumup/retour` ;
2. **dans la tâche quotidienne de 7 h**, avant les relances — une cliente qui a réglé hier soir ne
   doit pas recevoir ce matin un « je n'ai pas reçu votre acompte » ;
3. **au bouton « Vérifier auprès de SumUp »** de l'agenda, pour trancher devant l'écran quand une
   cliente écrit « j'ai payé ».

> **La sonnette de SumUp n'est pas crue.** La spécification ne documente ni le format du message
> ni aucune signature : un inconnu pourrait poster « la référence untel est payée ». Du corps reçu
> on ne retient donc **que la référence**, uniquement pour savoir qui interroger ; l'état est
> redemandé à l'API, seule autorité. Le pire qu'un plaisantin obtienne, c'est que le site pose une
> question dont il connaît déjà la réponse. Vérifié : un faux `{"status":"PAID"}` ne coche rien.

Deux prudences dans `verifierAcompte` : une absence de réponse ne vaut **jamais** « impayé » —
sans quoi une coupure réseau relancerait une cliente qui a payé ; et un acompte déjà marqué réglé
n'est ni réinterrogé ni démarqué, Zélia ayant pu le cocher à la main pour un règlement en espèces.

Un renvoi réutilise le paiement déjà ouvert au lieu d'en créer un second : la cliente pourrait
régler l'ancien lien resté dans sa boîte, et ce règlement-là échapperait au constat.

**Ce qui reste manuel**, et le bouton « Acompte reçu » est là pour ça : les règlements en espèces
ou par virement, et les acomptes partis avec le lien réutilisable — ceux-là n'ont pas de
référence, rien ne peut les rattacher après coup.

### Libération automatique du créneau : la règle exacte

Passé **48 h** sans règlement, la tâche quotidienne peut annuler le rendez-vous et rendre le
créneau — mais **seulement** quand elle peut le vérifier. La règle tient en trois conditions,
toutes nécessaires :

1. le rendez-vous est **confirmé** (une demande non tranchée appartient à Zélia) ;
2. l'acompte porte une **référence SumUp** (créé par l'API), et SumUp, interrogé **à l'instant**,
   répond autre chose que « payé ». Pas de réponse vaut « on ne sait pas », jamais « impayé » ;
3. le rendez-vous est **à venir**.

Un acompte parti avec le **lien réutilisable** n'a pas de référence : le site ne l'annulera
**jamais** de lui-même. Il le signale sur l'agenda passé deux jours, et Zélia coche « Acompte
reçu » ou annule.

Cette règle a été durcie après un incident : une première version annulait dès 48 h sur le seul
état en base, sans distinguer les acomptes vérifiables des autres, et a annulé des clientes en
règle. Les annulations faites par le site portent depuis `annuleAutomatiquementLe`, et l'agenda
liste les « Annulations à vérifier » avec un bouton **Rétablir** qui revérifie le créneau et
prévient la cliente que l'annulation était une erreur — sans redemander d'acompte.

L'agenda signale les nouvelles clientes et l'état de l'acompte (`acompteDemandeLe`,
`acompteRegleLe`, `acompteVerifieLe`).

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

### Vérifier la connexion

La page Réglages porte une ligne **API SumUp** qui interroge `/v0.1/memberships` : la réponse
valide la clé **et révèle le code marchand auquel elle donne accès** (`resource_id` d'une adhésion
marchande). Zélia n'a donc pas à le chercher dans son tableau de bord ni à craindre une lettre de
travers — l'écran le lui affiche, et signale le cas échéant que le code saisi n'est pas celui de
la clé. Quatre états distincts, chacun avec sa conduite à tenir : non configurée, clé refusée,
code marchand incorrect, connectée.

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

## Nom de domaine (`zelart.fr`)

Le code n'a **rien à changer** le jour du branchement : `urlSite()` suit
`VERCEL_PROJECT_PRODUCTION_URL`, qui pointe automatiquement sur le domaine de production. Les
liens des e-mails, le sitemap, `robots.txt` et les fichiers `.ics` suivent donc tout seuls.
`SITE_URL` n'existe que pour forcer une autre adresse en développement.

**Où l'acheter.** Deux voies, le choix se fait sur le confort et non sur le résultat :

- **Depuis Vercel** (Settings → Domains → *Buy*) : le domaine est branché et le DNS configuré
  sans manipulation. Un peu plus cher, et le registrar est lié à l'hébergeur.
- **Chez un registrar** (OVHcloud, Gandi, Infomaniak…) : moins cher, indépendant de
  l'hébergement, mais il faut recopier chez lui les enregistrements DNS que Vercel affiche.

`.fr` est géré par l'AFNIC : il faut résider ou être établi dans l'UE — le SIRET de Zélia suffit.
Comptez une dizaine d'euros par an, à vérifier au moment de l'achat.

**Marche à suivre :**

1. **Brancher le domaine** — Vercel → Settings → Domains → *Add*. Vercel affiche les
   enregistrements DNS **propres à ce projet** : les recopier tels quels chez le registrar. Ne
   jamais réutiliser des valeurs trouvées ailleurs, elles varient d'un projet à l'autre. Le
   certificat HTTPS est automatique une fois la propagation faite.
2. **Authentifier le domaine chez Brevo** — brevo.com → *Expéditeurs, domaines* → ajouter
   `zelart.fr` → recopier les enregistrements DKIM et SPF chez le registrar. Sans cela, les
   e-mails partent quand même mais atterrissent plus volontiers en indésirables.
3. **Mettre à jour la variable Vercel** : `EMAIL_FROM` = `Zelart Nails <contact@zelart.fr>`.
   `NOTIFY_EMAIL` reste l'adresse que Zélia relève réellement.
4. **Redéployer**, puis vérifier dans `/admin/reglages` : la ligne « Adresse expéditrice » doit
   passer au vert, l'écran interrogeant la liste des expéditeurs validés chez Brevo.

> **Un domaine ne fournit pas de boîte aux lettres.** Brevo *envoie* depuis `contact@zelart.fr`
> sans qu'elle existe, mais une réponse de cliente se perdrait. Prévoir chez le registrar une
> **redirection** de `contact@zelart.fr` vers la boîte réelle de Zélia — gratuit chez la plupart —
> ou une vraie messagerie si elle en veut une.

### Zone DNS d'OVH : l'état visé

Le branchement est fait. La zone ne doit contenir que **deux** enregistrements pour le site — les
valeurs venant de *View DNS configuration* chez Vercel, qui varient d'un projet à l'autre :

```
@      A      216.198.79.1
www    CNAME  2b7d7a4c12b1a30f.vercel-dns-017.com.
```

Le reste de la zone (`NS`, `MX`, `SPF`, `ftp`) n'a rien à voir avec le site et se laisse tranquille.

### Quand Vercel affiche « Invalid Configuration »

Le message ne dit qu'une chose : *l'adresse annoncée par le DNS n'est pas la mienne*. Il ne nomme
pas la cause. Les cinq rencontrées au branchement, du plus fréquent au plus discret — les quatre
premières sont des vestiges qu'OVH pose lui-même :

1. **Le domaine n'est pas encore livré.** Un `.fr` fraîchement commandé reste quelques heures « en
   cours de création » : la zone existe dans le manager mais n'est pas déléguée, et le nom ne
   résout vers rien du tout. Rien à corriger, il faut attendre.
2. **Une redirection web d'OVH tient l'apex.** Elle se reconnaît à un `TXT` de la forme
   `"1|www.zelart.fr"`, avec un `A` sur `@` vers l'infrastructure de redirection. Tant qu'elle
   existe, supprimer le `A` ne tient pas : il faut d'abord retirer la redirection dans l'onglet
   **Redirection**, qui n'est pas la zone DNS. Aucune perte — c'est Vercel qui redirige ensuite
   `zelart.fr` vers `www` (le `308` visible dans son écran).
3. **Un `A` de parking subsiste**, ou cohabite avec celui de Vercel. Deux `A` sur `@`, c'est une
   réponse fausse une fois sur deux : un seul doit rester.
4. **Des `AAAA` d'OVH traînent** sur `@` et sur `www`. Ce sont les plus discrets, parce qu'un
   navigateur en IPv4 ne les voit jamais — mais l'IPv6 est prioritaire là où elle existe, donc une
   partie des visiteuses (mobile surtout) atterrirait chez OVH avec un `A` pourtant correct. À
   supprimer.
5. **`www` refuse le `CNAME`.** Un `CNAME` est le seul type qui ne cohabite avec **rien** sur le
   même nom : tant qu'un `A`, un `AAAA` ou un `TXT` (le `"3|welcome"` d'OVH) porte `www`, OVH
   rejette l'ajout. Vider `www` d'abord, créer le `CNAME` ensuite.

Trois pièges de forme, tous vérifiés sur place : l'apex se configure en `A`, **jamais** en `CNAME`
(la racine d'un `.fr` porte déjà ses `NS` et son `SOA`) ; le champ *Sous-domaine* du manager OVH
refuse le vide et attend **`@`** ; et la cible d'un `CNAME` se termine par un **point**, sans quoi
OVH la lit comme relative et fabrique `…vercel-dns-017.com.zelart.fr`. Copier la valeur au bouton
plutôt qu'à la main : c'est une suite hexadécimale où `0` et `O` se confondent.

Un `TXT` `v=spf1` est déjà présent (celui d'OVH). Le jour de Brevo il se **complète** ; on n'en crée
pas un second, deux SPF valent SPF cassé.

Compter de quelques minutes à quelques heures de propagation — et les deux serveurs d'OVH,
`dns106` et `ns106`, ne se synchronisent pas ensemble : pendant la transition ils répondent des
choses différentes et Vercel clignote rouge/vert sans que la zone soit en cause. Le bouton
*Refresh* force la vérification. Pendant ce temps le site reste servi par `zelart.vercel.app`.

### DMARC : `_dmarc.zelart.fr`

SPF et DKIM prouvent qu'un message est authentique. Ils ne disent pas **quoi faire de celui qui ne
l'est pas** : sans DMARC, chaque messagerie décide seule, et un message signé `contact@zelart.fr`
par n'importe qui reste livrable. DMARC comble ce trou, et ramène en prime des rapports sur qui
écrit au nom du domaine.

Enjeu concret ici : ce site n'envoie que des messages qui doivent arriver — confirmation de
rendez-vous, lien de connexion, lien de paiement d'acompte. Un rendez-vous confirmé qui finit en
indésirables est un fauteuil vide.

**Un seul enregistrement**, dans la zone DNS d'OVH :

```
_dmarc    TXT    v=DMARC1; p=none; rua=mailto:dmarc@zelart.fr
```

Le champ *Sous-domaine* prend **`_dmarc` seul** : OVH ajoute `.zelart.fr` lui-même, et le nom
complet y produirait `_dmarc.zelart.fr.zelart.fr`. Même piège que le `@` de l'apex.

**L'ordre des trois étapes n'est pas négociable :**

1. **DKIM Brevo au vert d'abord.** DMARC ne passe que si SPF **ou** DKIM est *aligné* — c'est-à-dire
   porte le domaine du `From:`, pas seulement un domaine valide. Brevo expédie sous son propre
   domaine d'enveloppe, donc SPF n'est en général **pas** aligné : DKIM porte tout. Poser une
   politique stricte avant que Brevo soit authentifié ferait disparaître les e-mails du site.
2. **`p=none` pendant trois à quatre semaines.** Rien n'est bloqué, on observe. C'est là qu'on
   découvre les expéditeurs oubliés — le webmail OVH si Zélia écrit à la main depuis
   `contact@zelart.fr`, un outil de newsletter, une ancienne intégration.
3. **Durcir seulement quand les rapports sont propres** : `p=quarantine`, puis `p=reject`.

**Le piège du `rua`.** Une adresse de rapport hors du domaine (`…@gmail.com`) exige que *ce*
domaine publie `zelart.fr._report._dmarc.gmail.com` — impossible chez Google. Les rapporteurs
sérieux vérifient et n'envoient rien : on croit DMARC inactif alors que seule l'adresse est en
cause. L'adresse doit donc être **en `@zelart.fr`** (avec une redirection vers la boîte réelle),
ou celle d'un service de lecture de rapports, qui publie l'autorisation pour vous.

Les rapports bruts sont des pièces jointes XML, plusieurs par jour, illisibles pour un humain. Un
lecteur de rapports (Postmark DMARC Digests, dmarcian, URIports ont des offres gratuites) les
transforme en résumé hebdomadaire ; sans lui, l'étape 2 ne sera pas faite.

Vérification après propagation : `mxtoolbox.com/dmarc.aspx`, ou tout inspecteur DMARC.

## Commandes de press-on (`/press-on`)

Formes proposées : Amande, Arrondi, Ballerine, Carré, Stiletto. Longueurs : Courte, Moyenne,
Longue. Ce sont des suggestions (`datalist`), pas une contrainte : le champ reste libre.

### Demande de mesures

Un **guide dépliable** (`GuideTailles`) propose deux méthodes, présentées côte à côte parce
qu'elles ne s'adressent pas aux mêmes personnes — une cliente qui bute sur l'une abandonnerait la
commande plutôt que d'essayer l'autre si on ne lui montrait pas les deux :

- **A · Ruban adhésif + règle** — un morceau de Scotch en travers de l'ongle à l'endroit le plus
  large, les deux bords marqués au stylo, le ruban décollé et mesuré à plat. Donne des
  millimètres exploitables directement, reportés dans le champ « mesures » par les dix cases de
  saisie.
- **B · Photo avec repère** — main à plat, un objet de taille connue à côté des ongles (une pièce
  de 2 € fait 25,75 mm), prise de vue à la verticale. Sans repère dans le cadre, une photo ne
  donne aucune échelle. Les photos se joignent à l'étape « Votre design », qui les transporte
  déjà ; cette étape le rappelle explicitement, faute de quoi la cliente arriverait dans une
  section qui ne parle que d'inspiration et n'oserait pas y joindre ses mains.

Une **troisième sortie** clôt le guide, parce que les deux méthodes supposent du matériel et de la
patience que tout le monde n'a pas : passer à l'institut, où Zélia mesure elle-même, sur simple SMS.
La cliente laisse alors le champ vide et le signale ; sa commande attend son passage. Sans cette
issue, celle qui ne s'en sort ni au ruban ni en photo n'a plus qu'à abandonner.

Les champs du guide n'ont **aucun attribut `name`** : ils vivent dans le `<form>` de commande et
seraient sinon envoyés avec elle. Le report passe par un bouton et non par la frappe, pour ne pas
effacer une précision écrite à la main ; le texte composé est tronqué à 300 caractères, la limite
du champ d'arrivée.


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

### La photo du set

On commande un press-on **à l'œil** : un nom de collection ne dit rien de ce qu'on recevra. Le
modèle portait déjà un champ `photoUrl`, mais rien ne permettait de le remplir — il restait vide.
Un clic sur la vignette d'un set, dans le catalogue de `/admin/press-on`, envoie ou remplace sa
photo (même trajet que la galerie : compression dans le navigateur, dépôt sur Vercel Blob, seule
l'adresse est conservée). Côté cliente, la vignette occupe assez de place pour qu'un motif se
distingue, et s'ouvre en grand.

Retirer une photo remet le champ à `null` sans effacer le fichier : une image orpheline coûte
quelques kilo-octets, une image effacée à tort casse l'affichage d'une commande passée.

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

**Le bouton n'apparaît qu'une fois l'heure de fin passée**, et le contrôle est aussi côté serveur :
un bouton caché reste atteignable. Un clic sur la mauvaise carte avait marqué « bien venue » une
cliente attendue un mois plus tard. Là où il ne s'affiche pas, une mention prend sa place, sinon
son absence passerait pour une panne. La retouche du commentaire échappe à la règle : elle ne
prétend rien sur la présence de la cliente.

**L'annulation** ramène le rendez-vous en « confirmé ». Ce qu'elle ne peut pas défaire, elle le dit :
si la cliente est une filleule, la validation a pu débloquer un palier chez sa marraine et l'e-mail
est parti. Le palier redescend seul, puisqu'il se recalcule ; l'avantage accordé reste, parce qu'un
avantage se consomme. D'où le bouton **Retirer** de l'écran Parrainage, limité aux avantages non
honorés : une fois la pose offerte réalisée, il n'y a plus rien à annuler.

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

## Annuler ou refuser en disant pourquoi

Une annulation par Zélia ne partait nulle part : la cliente découvrait le changement dans son
espace, ou ne le découvrait pas. Acceptable pour un rendez-vous qu'elle annule elle-même, pas pour
celui qu'on lui retire.

Le bouton *Annuler* (ou *Refuser* sur une demande) ouvre désormais un panneau avec **un mot pour
la cliente** et **une sélection de créneaux libres à lui proposer**, les deux facultatifs — le
libellé du bouton dit ce qui va se passer, « annuler sans message » ou « annuler et prévenir », pour
qu'on ne découvre pas après coup qu'un e-mail est parti. L'e-mail adapte son ouverture au cas :
rendez-vous confirmé annulé, demande refusée, ou proposition d'horaire non retenue.

Les créneaux cochés sont **revérifiés au moment de l'envoi** : celui qui était libre cinq minutes
plus tôt a pu être réservé entre-temps, et proposer un horaire déjà pris ferait revenir la cliente
sur un refus. Ceux qui ne le sont plus sont écartés, et le retour le dit.

La liste d'attente n'est prévenue que si le rendez-vous était **confirmé** : une demande jamais
confirmée n'occupait aucun créneau, il n'y a rien à libérer.

**La preuve de l'envoi est stockée** (`annulationNotifieeLe`), pas affichée à chaud. En passant à
« annulé », la carte change de section de l'agenda : le composant est démonté et son message
disparaît avant d'être lu — le piège déjà rencontré avec la validation de venue. La carte affiche
donc « Cliente prévenue le … » ou « Annulé sans message à la cliente », et la question « est-ce que
je l'ai prévenue ? » trouve encore sa réponse six mois plus tard.

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

### Bloquer un créneau personnel

Le bouton **« Bloquer un créneau »** de l'agenda pose un rendez-vous à soi : intitulé, date, heure,
durée. Rien d'autre — ce n'est pas un rendez-vous, il n'y a ni cliente ni tarif.

Il crée une `Indisponibilite`, **la même chose qu'un congé** : c'est elle que lisent déjà le calcul
des créneaux libres et le contrôle de réservation. Rien de nouveau à faire respecter, donc rien
à oublier de faire respecter. Les congés, eux, se posent en journées entières (`ajouterConge`) —
bloquer un rendez-vous de 14 h par ce biais aurait fermé la journée.

Deux garde-fous symétriques, parce que le double-booking peut venir des deux côtés :

- bloquer un créneau où une cliente a déjà rendez-vous est **refusé**, en nommant la cliente : le
  blocage ne l'aurait pas annulée, et Zélia se serait retrouvée avec les deux ;
- noter un rendez-vous sur un créneau bloqué est **refusé** aussi — ce contrôle manquait à la
  saisie manuelle, qui ne regardait que les rendez-vous.

Le calendrier affiche l'heure d'un créneau personnel et le pictogramme 🚫 d'un congé : l'heure ne
veut rien dire sur une absence de plusieurs jours, et c'est la seule chose utile sur un
rendez-vous de deux heures. Un clic mène à l'onglet Congés, d'où le blocage se retire.

### Clientes sans adresse e-mail

`Cliente.email` est obligatoire et unique, ce qui bloquait la saisie d'une habituée qui n'a pas
d'e-mail. Une **adresse de complaisance** est alors attribuée, sous le domaine `zelart.invalid` —
réservé par la RFC 2606, il ne peut atteindre aucune boîte réelle, ni aujourd'hui ni jamais.
`envoyerEmail` refuse ces adresses **à la source** plutôt que chez chaque appelant : rappels,
avantages, relances, il aurait suffi d'en oublier un pour accumuler les rejets chez le fournisseur
d'envoi.

## Une cliente, une fiche

Cette commodité avait un revers : la fiche du carnet n'a qu'un numéro et une adresse fictive, celle
du site a une vraie adresse. Le jour où l'habituée réserve en ligne, plus rien ne les relie —
même personne, deux historiques, deux comptages de fidélité, et un espace cliente qui ignore les
rendez-vous déjà pris.

Le **numéro de téléphone** sert donc de second identifiant. Il est stocké réduit à ses chiffres
(`Cliente.telephoneNormalise`, cf. `src/lib/telephone.ts`), indicatif `+33` ramené à `0`, en dessous
de neuf chiffres rien n'est retenu — un numéro tronqué rapprocherait des clientes sans lien. La
colonne n'est **pas unique** : un foyer partage parfois une ligne, et des doublons préexistaient.

`src/lib/fiche-cliente.ts` est le seul endroit qui décide, pour la réservation comme pour la
commande de press-on — auparavant chacune faisait son propre `upsert`, et la même personne pouvait
exister deux fois selon la porte qu'elle poussait. L'ordre suit le degré de certitude :

1. **l'e-mail**, identifiant réel de la fiche : aucune ambiguïté ;
2. **le numéro**, mais uniquement vers une fiche *sans adresse réelle* — celle du carnet, qui
   attendait précisément que sa cliente se connecte un jour. On lui donne son adresse.

Ce qui n'est **pas** fait : rapprocher deux fiches portant chacune une vraie adresse. Une mère
réserve pour sa fille, deux sœurs partagent un téléphone ; écraser l'adresse de l'une l'enfermerait
dehors de son espace. Ces cas sont signalés, pas tranchés.

### Fusionner (`/admin/clientes/doublons`)

L'écran réunit les fiches qui se ressemblent — même numéro (fiable), à défaut mêmes nom et prénom
(plus faible, mais c'est le seul indice qui reste quand un numéro manque). Un compteur apparaît sur
la liste des clientes dès qu'il y en a. Rien n'est fusionné sans Zélia : elle seule reconnaît ses
clientes.

La fusion (`src/lib/fusion.ts`, isolée de l'action pour être vérifiable sans session) tient dans une
transaction et penche toujours du côté de la conservation :

- **l'historique se cumule** : rendez-vous, commandes, lots gagnés, filleules ;
- **l'adresse réelle l'emporte** sur l'adresse de complaisance, quel que soit le sens choisi ;
- **les refus l'emportent sur les accords** : une désinscription ou un blocage d'un seul côté vaut
  pour la fiche fusionnée. Se réabonner est un geste de la cliente, jamais la conséquence d'un
  ménage interne ;
- **l'ancienneté est la plus vieille des deux** — c'est la date de la première venue qui compte ;
- les deux tables à contrainte d'unicité (envois de campagne, avantages de parrainage) ne peuvent
  pas être déplacées telles quelles : une ligne présente des deux côtés est supprimée plutôt que de
  faire échouer toute la fusion ;
- les liens de connexion de la fiche absorbée sont détruits : ils menaient à une adresse qui
  disparaît.

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

### Ce que la personne accepterait

L'agenda n'affichait qu'une phrase libre (« plutôt un samedi »), écrite seulement si la cliente y
avait pensé, et que rien ne pouvait exploiter. Le formulaire demande désormais **les jours qui
l'arrangent** et **le moment de la journée**, sous une forme comparable à un créneau
(`src/lib/attente-preferences.ts`), et l'agenda en affiche le résumé sur chaque ligne.

Cela corrige une injustice du fonctionnement précédent. L'annonce partait à tout le monde sans dire
de quel créneau il s'agissait : quelqu'un qui n'était libre que le samedi consommait son **unique**
notification pour un mardi matin, et n'entendait plus jamais parler de rien. Le créneau est
maintenant nommé dans le message, et une préférence explicite écarte l'annonce **sans la
consommer**. Ne rien cocher veut toujours dire « n'importe quand », et reste le cas le plus
fréquent : le silence ne filtre rien.

Le téléphone est enfin demandé. La colonne existait en base depuis le début et le formulaire ne l'a
jamais réclamée, alors que tout le salon marche par SMS.

Contrainte technique héritée : le formulaire vit dans le `<form>` de réservation, ses champs n'ont
donc aucun attribut `name`. Les libellés des jours vivent dans `attente-bornes.ts`, sans aucune
dépendance : les importer depuis le module de correspondance entraînait Prisma et le pilote
Postgres dans le paquet du navigateur.

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

L'accueil émet un bloc JSON-LD `NailSalon`, construit par `src/lib/donnees-structurees.ts` :
adresse, téléphone, horaires, comptes qui désignent la même personne ailleurs (`sameAs`), et un
`Service` par prestation avec son tarif. Les horaires sont lus dans la table des ouvertures,
comme la phrase affichée sur le site : les deux ne peuvent donc pas diverger, et une fiche qui
annoncerait le lundi alors que le lundi est fermé enverrait des clientes devant une porte close.
Un tarif « à partir de » passe par un `minPrice` plutôt que par un prix ferme, faute de quoi
Google annoncerait un prix qui n'a jamais été promis.

Deux absences sont volontaires et documentées dans le module : **pas de coordonnées
géographiques**, qu'il aurait fallu inventer (`hasMap` renvoie à la fiche Google, qui les connaît),
et **pas de zone desservie élargie** aux communes voisines, qui serait une déclaration
invérifiable.

La note moyenne y figure dès que les avis Google sont connectés, mais sans illusion : depuis 2019,
Google ne reprend pas dans ses résultats les avis qu'une entreprise publie sur son propre site à
son propre sujet. Le balisage ne nuit pas, il ne sert simplement pas au classement ; la note qui
compte reste celle de la fiche Google. Sur la page, en revanche, les avis rassurent et font
réserver.

Les valeurs passent par `jsonLdSecurise()`, qui échappe les chevrons : un avis contenant
`</script>` casserait sinon la page.

Les photos de la galerie sont décrites par `src/lib/galerie.ts`, à partir des prestations du
rendez-vous d'où sort la photo. Elles portaient toutes le même texte alternatif, ce qui ne servait
ni les lectrices d'écran ni Google Images. Une donnée déjà saisie décrit mieux qu'une case qu'on
oublie de remplir.

La page `/questions` émet un second bloc, `FAQPage`, construit à partir des mêmes questions que
celles affichées : Google peut alors les faire apparaître directement dans ses résultats, et il n'y
a pas deux versions à maintenir.

Les métadonnées de partage (`openGraph`, `twitter`) sont posées sur le `layout`, avec
`metadataBase` calé sur l'adresse réelle du site pour que les chemins relatifs se résolvent. L'image
est générée par `src/app/opengraph-image.tsx`.

## Partenariats et affiliation (`/pro`, `/admin/partenaires`)

Zélia est partenaire de marques du métier et dispose de liens d'affiliation nominatifs. Trois
décisions structurent la mise en œuvre.

**Le lien ne vit pas dans le code.** Il est nominatif, il se révoque, un contrat se termine et une
deuxième marque arrivera. Le modèle `Partenaire` le garde, et Zélia le colle elle-même depuis
`/admin/partenaires`.

**Chaque marque reçoit une adresse courte**, du type `zelart.fr/inaka`, servie par
`src/app/[partenaire]/route.ts`. Un lien d'affiliation brut ne se dicte pas dans une story et ne
s'imprime pas sur une carte ; surtout, il ne se compte pas. La redirection incrémente un compteur,
seul chiffre que le partenaire ne fournit pas et ne peut pas contredire. Le jour où la marque
change d'adresse, une ligne à corriger suffit et tout ce qui a été imprimé continue de fonctionner.

La redirection vit à la racine du site pour rester courte. Next.js sert toujours les vraies pages
en priorité, donc `/prestations` ou `/questions` ne passent jamais par là ; ne restent que les
adresses inconnues, qui reçoivent la page 404 habituelle. `SLUGS_RESERVES` refuse à la saisie un
slug qui heurterait une page existante, pour éviter un lien mort que personne ne comprendrait. La
réponse porte `X-Robots-Tag: noindex, nofollow`, et les liens de la page `/pro` portent
`rel="sponsored nofollow"` : un lien rémunéré ne transmet pas de popularité, c'est la règle de
Google et l'ignorer exposerait ce site, pas celui du partenaire.

**Le lien du partenaire est transmis tel quel**, sans paramètre ajouté. La tentation serait d'y
coller des UTM, mais un lien d'affiliation est souvent lui-même un redirecteur : un paramètre de
trop peut casser l'attribution, c'est-à-dire faire perdre la commission. Le comptage se fait de ce
côté-ci, là où rien ne risque d'être abîmé.

La page `/pro` s'adresse aux consœurs, pas aux clientes : une cliente venue prendre rendez-vous
n'achètera jamais une lampe ni une formation, et lui montrer du matériel professionnel brouillerait
son parcours sans rien rapporter. Elle n'est donc pas dans la navigation principale, seulement en
pied de page, et elle porte un bloc « vous êtes une marque » qui est le mécanisme par lequel
d'autres partenariats se proposent.

La mention **« Collaboration commerciale »** figure près des liens, lisible sans cliquer : c'est ce
qu'impose la loi du 9 juin 2023 sur l'influence commerciale. En pied de page et en petits
caractères, elle ne vaudrait rien.

## Liens courts

Deux adresses du domaine ne servent qu'à rediriger :

- `zelart.fr/<partenaire>` vers le lien d'affiliation, en comptant le clic ;
- `zelart.fr/avis` vers le formulaire d'avis Google.

Pour `/avis`, le motif est le SMS : l'adresse de Google fait plus de cent caractères, mange deux
segments à elle seule et se lit comme un lien suspect. Sur une carte glissée dans un sac, elle ne
se recopie pas. `notFound()` tant qu'aucun établissement Google n'est relié : mieux vaut une 404
franche qu'une redirection vers nulle part.

## Le niveau de nail art ne se choisit pas (réservation)

L'abus était constaté et coûteux : les clientes cochaient massivement le niveau 1, le moins cher,
puis décrivaient et envoyaient des photos d'un dessin qui relevait du niveau 2 ou 3. L'écart se
découvrait au fauteuil, une main déjà limée, quand il était trop tard pour en parler sereinement.

La cliente choisit donc **avec ou sans nail art**, et rien de plus. Une prestation « + nail art »
par technique et par nature d'acte est **dérivée** de celles des niveaux plutôt que recopiée, dans
la migration comme dans le seed : le tarif de départ est celui du niveau 1, puisque le nail art
commence là, et la durée celle du niveau 2, la plus demandée, parce qu'une durée calée sur le
niveau 1 ferait déborder une pose sur deux. Le prix s'annonce « à partir de » : le montant final
dépend du niveau retenu, et annoncer un prix ferme serait une promesse que la pose ne tiendra pas.

`Prestation.choixCliente` retire les trois niveaux du formulaire de réservation **sans les retirer
du catalogue** : ils servent à Zélia pour ajuster la ligne, et ils restent expliqués et chiffrés sur
le site public, dans la fenêtre de comparaison. Les effacer de la vue aurait laissé un « à partir
de » sans plafond visible, ce qui se lit comme une réserve plutôt que comme un tarif. Le drapeau se
décoche depuis l'écran Prestations, colonne « Au choix ».

**La description devient la contrepartie du choix qu'on ne demande plus.** Un nail art commandé sans
un mot ni une photo est refusé : Zélia détermine le niveau à la lecture de ce que la cliente décrit,
et sans description elle ne peut ni le fixer ni s'y préparer. Le champ n'est obligatoire que tant
qu'aucune photo n'est jointe, une image valant description.

Deux contrôles vivent côté serveur, parce qu'un identifiant se recopie : un niveau envoyé
directement est refusé, et l'absence de description aussi.

### Les press-on suivent la même règle

`ModelePressOn.choixCliente` fait pour la boutique ce que `Prestation.choixCliente` fait pour la
réservation : les niveaux sortent de la vitrine, un « Set personnalisé + nail art » les remplace, et
Zélia fixe le niveau depuis la commande. La description était déjà obligatoire pour un set
sur-mesure, ce qui lui donne de quoi juger.

Une différence change tout : **un set se paie avant d'être fabriqué**. Trois conséquences, toutes
dans `ajusterSetPressOn` :

- la fenêtre pour corriger se situe **entre la commande et le règlement**. Une commande réglée ou
  close ne se renchérit plus : revenir dessus reviendrait à changer un contrat exécuté, ce qui se
  règle de vive voix et pas par un formulaire ;
- si le règlement **a déjà été demandé**, le lien envoyé portait l'ancien montant. Le garder ferait
  payer le mauvais prix en toute discrétion : il est retiré, la cliente est prévenue qu'il n'est
  plus valable, et Zélia est invitée à en renvoyer un ;
- si **rien n'a encore été demandé**, aucun e-mail ne part. La demande de règlement portera le bon
  tarif, et un message de plus n'apprendrait rien à personne.

L'ajustement ne s'affiche que sur le sur-mesure : un modèle de collection est dessiné une fois pour
toutes, seules les mesures changent.

## Ajuster le niveau après coup (agenda)

C'est le pendant de ce qui précède : la cliente demande « avec nail art », Zélia lit, tranche, et
ajuste la ligne avant le rendez-vous.

Chaque ligne de rendez-vous propose donc **Ajuster le niveau**, qui remplace la prestation par une
autre **de même technique et de même nature d'acte**. Cette règle délimite exactement les variantes
comparables : les quatre niveaux d'une pose Gel X entre eux, les quatre d'un remplissage Pop-it
entre eux. Au-delà, on ne change plus le niveau mais la prestation, ce qui ne se règle pas d'un menu
déroulant.

Ce que l'ajustement entraîne :

- **le prix figé de la ligne suit la nouvelle prestation**, sinon un niveau 3 posé serait facturé
  au tarif du niveau 1 ;
- **l'heure de fin est recalculée** depuis la somme des durées ;
- **la cliente reçoit un e-mail** avec l'ancienne prestation barrée, la nouvelle, le nouveau total,
  la nouvelle heure de fin et, si Zélia en a laissé un, son mot d'explication.

Le bouton ne s'affiche que tant que le rendez-vous est en attente ou confirmé : ajuster une pose
déjà réalisée ne préviendrait plus personne à temps.

Un niveau supérieur allonge la pose et peut mordre sur le rendez-vous suivant. Le cas est
**appliqué puis signalé**, jamais refusé : refuser laisserait Zélia sans moyen d'enregistrer la
réalité, alors que le message lui dit quel rendez-vous est mordu et à quelle heure.

## Fil de discussion (`/mon-espace`, fiche cliente)

Tout passait par le SMS personnel de Zélia, où une question sur une pose se mêlait à sa vie privée,
se lisait entre deux clientes et se perdait. Le fil rattache le message à la fiche, à côté de
l'historique des poses et des notes techniques, c'est-à-dire là où la réponse se prépare.

`MessageCliente` porte un booléen `deZelia` plutôt qu'un auteur : la conversation n'oppose jamais
que deux personnes, et une table d'auteurs laisserait croire à une généralité qui n'existe pas.

`luLe` désigne la lecture **par le destinataire**. Ouvrir son espace marque comme lus les messages
de Zélia ; ouvrir la fiche marque comme lus ceux de la cliente. Les confondre ferait disparaître la
pastille de Zélia dès qu'une cliente consulte sa page, sans que rien n'ait été lu de son côté.

Un seul composant d'affichage pour les deux espaces : ce sont les mêmes messages, et deux rendus
finiraient par ne pas montrer la même chose. L'accusé de lecture ne s'affiche que sur ses propres
messages, savoir si l'on a lu ce qu'on a sous les yeux n'apprenant rien.

**Le fil s'ouvre avec le rendez-vous confirmé**, pas avant : une demande en attente n'engage
encore personne, et la messagerie n'est pas une boîte de contact ouverte à tous. Deux nuances
tiennent à des impasses évidentes. Si Zélia a écrit la première, la cliente peut répondre, sinon un
message de la gérante serait sans retour possible. Et un rendez-vous compte tant qu'il n'est pas
validé comme réalisé, ce qui laisse la conversation ouverte les jours suivant la pose, quand
arrivent justement les questions d'entretien. Le fil fermé reste **lisible** : faire disparaître une
conversation dont la cliente se souvient serait pire que de la laisser en lecture seule.

Trois choix qui méritent d'être dits :

- **Une cliente bloquée peut écrire.** Le blocage empêche de réserver, pas de parler : couper la
  parole à quelqu'un avec qui un différend est en cours ne fait que le déplacer vers le téléphone
  personnel de Zélia, ce que ce fil sert précisément à éviter.
- **La réponse part par e-mail même à une désinscrite.** Répondre à sa propre question n'est pas de
  la prospection, et se taire parce qu'elle refuse les nouveautés serait absurde.
- **Ce n'est pas un canal d'urgence**, et l'espace cliente le dit : pour un retard ou un
  empêchement le jour même, le SMS reste le plus sûr.

Les fiches sans réponse s'affichent en tête de `/admin/clientes`, **la plus ancienne d'abord** :
trier par message le plus récent ferait remonter celle qui vient d'écrire et laisserait en bas
celle qui attend depuis trois jours. Le compteur alimente la pastille de l'onglet Clientes.

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
