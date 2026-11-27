"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigerAdmin } from "@/lib/auth";
import { notifierZelia } from "@/lib/push";

const abonnementSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

export async function abonnerAppareil(
  abonnement: unknown,
  appareil: string
): Promise<{ ok: boolean; message?: string }> {
  await exigerAdmin();
  const analyse = abonnementSchema.safeParse(abonnement);
  if (!analyse.success) return { ok: false, message: "Abonnement illisible." };
  const { endpoint, keys } = analyse.data;
  await prisma.abonnementPush.upsert({
    where: { endpoint },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, appareil: appareil.slice(0, 200) },
    update: { p256dh: keys.p256dh, auth: keys.auth, appareil: appareil.slice(0, 200) },
  });
  return { ok: true };
}

export async function desabonnerAppareil(endpoint: string): Promise<void> {
  await exigerAdmin();
  await prisma.abonnementPush.deleteMany({ where: { endpoint } });
}

export async function notificationTest(): Promise<{ ok: boolean; message: string }> {
  await exigerAdmin();
  const n = await notifierZelia({
    titre: "Zelart · notification de test",
    corps: "Les notifications arrivent bien sur cet appareil ✨",
    url: "/admin/reglages",
    tag: "test",
  });
  return n > 0
    ? { ok: true, message: `Notification envoyée à ${n} appareil${n > 1 ? "s" : ""}.` }
    : { ok: false, message: "Aucun appareil n'a pu être joint. Réactivez les notifications." };
}
