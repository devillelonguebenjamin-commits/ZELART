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

Les créneaux libres sont **calculés à la volée** (`src/lib/creneaux.ts`) : fenêtres récurrentes,
moins les indisponibilités et les rendez-vous actifs. Les horaires sont interprétés dans le
fuseau `Europe/Paris` quel que soit le fuseau du serveur.

## Parcours de réservation

1. `/` — page d'accueil publique : présentation, prestations & tarifs, infos pratiques.
2. `/reserver` — tunnel en 3 étapes : prestation → créneau → coordonnées.
3. `/confirmation/[id]` — récapitulatif ; la demande reste **en attente** jusqu'à la confirmation
   par Zélia (acompte de 15 € via SumUp pour les nouvelles clientes, cf. CGV).

## Espace gérante (`/admin`)

Protégé par la variable d'environnement `ADMIN_PASSWORD` (session par cookie signé, 30 jours) :

- **Agenda** : demandes à confirmer, rendez-vous à venir, historique — changement de statut en un clic.
- **Clientes** : liste, fiche avec historique et notes de suivi privées.
- **Prestations** : édition des prix, durées, visibilité.
- **Congés** : blocage de périodes, immédiatement retirées des créneaux publics.
- **Galerie** : upload de photos (Vercel Blob, variable `BLOB_READ_WRITE_TOKEN`) affichées sur l'accueil.

## Notifications e-mail (facultatif)

Via [Resend](https://resend.com) : renseigner `RESEND_API_KEY` et `NOTIFY_EMAIL` (adresse qui
reçoit les nouvelles demandes). À la confirmation d'un rendez-vous par la gérante, la cliente
reçoit un e-mail récapitulatif. `EMAIL_FROM` permet d'utiliser un expéditeur personnalisé après
vérification d'un domaine chez Resend. Sans ces variables, le site fonctionne sans e-mails.

## Prochaines étapes envisagées

- Commandes de press-on nails (sets personnalisés et collections).
- Rappels automatiques avant le rendez-vous (e-mail/SMS).
