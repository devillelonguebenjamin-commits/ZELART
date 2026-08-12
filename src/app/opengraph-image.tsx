import { ImageResponse } from "next/og";

// L'image qui s'affiche quand le lien du site est partagé : Instagram, WhatsApp,
// Facebook, Messenger, iMessage.
//
// Elle est dessinée en code plutôt que déposée en fichier, pour deux raisons :
// aucun visuel à produire et à maintenir, et surtout aucune photo de cliente ne
// part sur les serveurs de Meta sans que personne l'ait décidé. Les rubans roses
// reprennent le motif du site.

export const alt = "Zelart Nails, prothésiste ongulaire à Saint-Nazaire";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 90px",
          background: "linear-gradient(135deg, #fff5f9 0%, #ffe4f0 55%, #fbcfe8 100%)",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Rubans : la signature graphique du site, réduite à deux courbes. */}
        <svg
          width="1200"
          height="630"
          viewBox="0 0 1200 630"
          style={{ position: "absolute", top: 0, left: 0 }}
        >
          <path
            d="M0 470 C 220 380, 420 560, 660 470 S 1010 360, 1200 430 L1200 630 L0 630 Z"
            fill="#f9a8d4"
            opacity="0.55"
          />
          <path
            d="M0 545 C 260 470, 470 620, 720 540 S 1030 450, 1200 510 L1200 630 L0 630 Z"
            fill="#ec4899"
            opacity="0.45"
          />
        </svg>

        <div style={{ display: "flex", flexDirection: "column", position: "relative" }}>
          <div
            style={{
              fontSize: 26,
              letterSpacing: 10,
              textTransform: "uppercase",
              color: "#be185d",
            }}
          >
            Saint-Nazaire
          </div>
          <div style={{ fontSize: 104, fontWeight: 700, color: "#9d174d", marginTop: 14 }}>
            Zelart Nails
          </div>
          <div style={{ fontSize: 40, color: "#7c2d4a", marginTop: 18, maxWidth: 860 }}>
            Prothésiste ongulaire et nail artist certifiée
          </div>
          <div style={{ fontSize: 31, color: "#a1587a", marginTop: 26 }}>
            Gainage · Gel X · Pop-it · vernis semi-permanent · nail art
          </div>
          <div
            style={{
              marginTop: 40,
              display: "flex",
              alignSelf: "flex-start",
              background: "#ec4899",
              color: "#fff",
              fontSize: 30,
              fontWeight: 600,
              padding: "18px 42px",
              borderRadius: 999,
            }}
          >
            Réserver en ligne
          </div>
        </div>
      </div>
    ),
    size
  );
}
