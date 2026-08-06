import type { MetadataRoute } from "next";
import { urlSite } from "@/lib/site";

// Les liens de connexion et de changement d'e-mail portent un jeton à usage
// unique dans l'URL : un robot qui les visiterait le consommerait pour rien.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api/",
        "/mon-espace/connexion/",
        "/mon-espace/email/",
        "/desabonnement/",
        "/confirmation/",
        "/press-on/confirmation/",
      ],
    },
    sitemap: `${urlSite()}/sitemap.xml`,
  };
}
