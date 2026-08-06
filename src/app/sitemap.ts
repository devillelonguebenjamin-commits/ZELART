import type { MetadataRoute } from "next";
import { urlSite } from "@/lib/site";

// Seules les pages publiques et stables ont leur place ici : ni l'espace
// gérante, ni les pages personnelles (confirmation, mon espace connecté) qui
// n'ont aucun intérêt à être indexées.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = urlSite();
  const page = (
    chemin: string,
    priority: number,
    changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>
  ) => ({ url: `${base}${chemin}`, lastModified: new Date(), changeFrequency, priority });

  return [
    page("/", 1, "weekly"),
    page("/reserver", 0.9, "weekly"),
    page("/press-on", 0.8, "weekly"),
    page("/mentions-legales", 0.3, "yearly"),
    page("/confidentialite", 0.3, "yearly"),
  ];
}
