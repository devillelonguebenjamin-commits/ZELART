import { prisma } from "@/lib/prisma";
import { filtreDestinataires, seuilFidelite } from "@/lib/segments";

export type Destinataire = {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  jetonDesabonnement: string;
};

export function urlSite(): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}

export async function destinataires(segment: string): Promise<Destinataire[]> {
  const clientes = await prisma.cliente.findMany({
    where: filtreDestinataires(segment),
    select: {
      id: true,
      prenom: true,
      nom: true,
      email: true,
      jetonDesabonnement: true,
      _count: { select: { rendezVous: { where: { statut: "TERMINE" } } } },
    },
    orderBy: { creeLe: "asc" },
  });

  const seuil = seuilFidelite(segment);
  return clientes
    .filter((c) => c._count.rendezVous >= seuil)
    .map(({ _count, ...cliente }) => {
      void _count;
      return cliente;
    });
}

const echapper = (texte: string) =>
  texte
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Le contenu est saisi en texte simple : {{prenom}} est personnalisé, les
// paragraphes sont conservés, et le pied de page légal est ajouté.
export function corpsHtml(contenu: string, destinataire: Destinataire | null): string {
  const prenom = destinataire?.prenom ?? "Camille";
  const texte = echapper(contenu).replace(/\{\{\s*prenom\s*\}\}/gi, echapper(prenom));
  const paragraphes = texte
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");

  const lienDesabo = destinataire
    ? `${urlSite()}/desabonnement/${destinataire.jetonDesabonnement}`
    : `${urlSite()}/desabonnement/apercu`;

  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#43242f;max-width:560px">
  <p style="font-size:22px;font-weight:700;color:#ec4899;margin:0 0 20px">Zelart Nails</p>
  ${paragraphes}
  <p style="margin:24px 0 0">Zélia ✨</p>
  <hr style="border:none;border-top:1px solid #f6d9e7;margin:28px 0 12px">
  <p style="font-size:12px;color:#8a6274;margin:0">
    Zelart — Zélia Barreteau, prothésiste ongulaire, 108 avenue de la République, 44600 Saint-Nazaire.<br>
    Vous recevez ce message parce que vous avez accepté de recevoir les offres de Zelart Nails.<br>
    <a href="${lienDesabo}" style="color:#8a6274">Se désinscrire en un clic</a>
  </p>
</div>`;
}
