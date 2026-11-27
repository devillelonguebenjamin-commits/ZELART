// Manifeste de l'application gérante : ce qui permet à Zélia d'« ajouter à
// l'écran d'accueil » son espace, qui s'ouvre alors en plein écran avec
// l'icône Zelart. Il ne concerne que /admin : le site public n'est pas
// installable (pas encore).

export function GET(): Response {
  return Response.json(
    {
      name: "Zelart · Espace gérante",
      short_name: "Zelart Pro",
      description: "Agenda, demandes et clientes de Zelart Nails.",
      start_url: "/admin",
      scope: "/admin",
      display: "standalone",
      background_color: "#fdf2f8",
      theme_color: "#ec4899",
      icons: [
        { src: "/gerante/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/gerante/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json" } }
  );
}
