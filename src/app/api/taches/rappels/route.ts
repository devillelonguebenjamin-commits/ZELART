import { NextResponse } from "next/server";
import { executerRappels } from "@/lib/rappels";

// Déclenchée une fois par jour par la planification Vercel (voir vercel.json).
// Le secret évite que n'importe qui puisse provoquer des envois.
export async function GET(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET n'est pas configuré : la tâche est désactivée par sécurité." },
      { status: 503 }
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 401 });
  }

  const bilan = await executerRappels();
  console.log("Rappels quotidiens", JSON.stringify(bilan));
  return NextResponse.json(bilan);
}
