import "dotenv/config";
import { defineConfig } from "prisma/config";

// Le CLI (migrations, seed) a besoin d'une connexion directe : si l'URL fournie
// passe par le pooler Neon (hôte "-pooler"), on la convertit automatiquement.
const urlDirecte = (process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"])?.replace(
  "-pooler.",
  "."
);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: urlDirecte,
  },
});
