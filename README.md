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

## Prochaines étapes envisagées

- Espace admin (`/admin`) : agenda, fiches clientes, gestion des prestations, congés.
- Notifications (e-mail/SMS) à la réservation et à la confirmation.
- Commandes de press-on nails (sets personnalisés et collections).
