import { NextResponse } from "next/server";
import { estAdmin } from "@/lib/auth";
import { listerClientes } from "@/lib/clientes";
import { formatJour } from "@/lib/creneaux";

const COLONNES = [
  "Prénom",
  "Nom",
  "E-mail",
  "Téléphone",
  "Rendez-vous honorés",
  "Dernier rendez-vous",
  "Total dépensé (€)",
  "Accepte les offres",
  "Désinscrite le",
  "Cliente depuis",
  "Commentaire",
];

// Excel en configuration française attend le point-virgule comme séparateur ;
// le BOM UTF-8 lui fait afficher correctement les accents.
const cellule = (valeur: string | number | null) =>
  `"${String(valeur ?? "").replace(/"/g, '""')}"`;

export async function GET(): Promise<NextResponse> {
  if (!(await estAdmin())) {
    return NextResponse.json({ error: "Session gérante requise." }, { status: 401 });
  }

  const clientes = await listerClientes();
  const lignes = clientes.map((c) =>
    [
      c.prenom,
      c.nom,
      c.email,
      c.telephone,
      c.nbHonores,
      c.dernierRdv ? formatJour(c.dernierRdv) : "",
      (c.totalCents / 100).toFixed(2).replace(".", ","),
      c.consentementMarketing ? "oui" : "non",
      c.desabonneLe ? formatJour(c.desabonneLe) : "",
      formatJour(c.creeLe),
      c.notes ?? "",
    ]
      .map(cellule)
      .join(";")
  );

  const csv = `﻿${COLONNES.map(cellule).join(";")}\r\n${lignes.join("\r\n")}\r\n`;
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clientes-zelart-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
