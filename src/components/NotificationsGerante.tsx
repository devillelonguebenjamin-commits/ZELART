"use client";

import { useEffect, useState } from "react";
import { abonnerAppareil, desabonnerAppareil, notificationTest } from "@/actions/push";

// Installer l'application gérante et activer les notifications sur cet
// appareil. Sur iPhone, les notifications ne sont proposées qu'une fois
// l'espace ajouté à l'écran d'accueil (iOS 16.4 et plus) : l'écran le dit et
// montre comment faire.

type Etat =
  | "chargement"
  | "incompatible"
  | "a-installer"
  | "refuse"
  | "inactif"
  | "actif";

function versCle(base64: string): Uint8Array {
  const rembourre = "=".repeat((4 - (base64.length % 4)) % 4);
  const brut = atob((base64 + rembourre).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(brut, (c) => c.charCodeAt(0));
}

async function enregistrement() {
  return navigator.serviceWorker.register("/sw-gerante.js", { scope: "/admin/" });
}

export default function NotificationsGerante({ clePublique }: { clePublique: string }) {
  const [etat, setEtat] = useState<Etat>("chargement");
  const [message, setMessage] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    (async () => {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      const installee =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setEtat(ios && !installee ? "a-installer" : "incompatible");
        return;
      }
      if (ios && !installee) {
        setEtat("a-installer");
        return;
      }
      if (Notification.permission === "denied") {
        setEtat("refuse");
        return;
      }
      const reg = await enregistrement();
      const abonnement = await reg.pushManager.getSubscription();
      setEtat(abonnement ? "actif" : "inactif");
    })().catch(() => setEtat("incompatible"));
  }, []);

  async function activer() {
    setEnCours(true);
    setMessage(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setEtat(permission === "denied" ? "refuse" : "inactif");
        return;
      }
      const reg = await enregistrement();
      const abonnement =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: versCle(clePublique) as BufferSource,
        }));
      const resultat = await abonnerAppareil(abonnement.toJSON(), navigator.userAgent);
      if (resultat.ok) {
        setEtat("actif");
        setMessage("Notifications activées sur cet appareil.");
      } else {
        setMessage(resultat.message ?? "L'activation a échoué.");
      }
    } catch (erreur) {
      setMessage(`L'activation a échoué : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
    } finally {
      setEnCours(false);
    }
  }

  async function desactiver() {
    setEnCours(true);
    const reg = await enregistrement();
    const abonnement = await reg.pushManager.getSubscription();
    if (abonnement) {
      await desabonnerAppareil(abonnement.endpoint);
      await abonnement.unsubscribe();
    }
    setEtat("inactif");
    setMessage("Notifications désactivées sur cet appareil.");
    setEnCours(false);
  }

  async function tester() {
    setEnCours(true);
    const resultat = await notificationTest();
    setMessage(resultat.message);
    setEnCours(false);
  }

  const bouton =
    "rounded-full px-5 py-2 text-sm font-medium transition disabled:opacity-50";

  return (
    <div className="space-y-3 text-sm">
      {etat === "chargement" && <p className="text-foreground/60">Vérification…</p>}

      {etat === "a-installer" && (
        <div className="rounded-xl bg-pink-50 px-4 py-3">
          <p className="font-medium">D&rsquo;abord, installez l&rsquo;application sur l&rsquo;iPhone :</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>ouvrez cette page dans <strong>Safari</strong> ;</li>
            <li>touchez le bouton <strong>Partager</strong> (le carré avec une flèche) ;</li>
            <li>choisissez <strong>« Sur l&rsquo;écran d&rsquo;accueil »</strong>, puis « Ajouter » ;</li>
            <li>ouvrez <strong>Zelart Pro</strong> depuis l&rsquo;écran d&rsquo;accueil et revenez ici.</li>
          </ol>
        </div>
      )}

      {etat === "incompatible" && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-amber-900">
          Ce navigateur ne permet pas les notifications. Sur iPhone, utilisez Safari (iOS 16.4 ou
          plus récent) ; sur Android, Chrome.
        </p>
      )}

      {etat === "refuse" && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-amber-900">
          Les notifications ont été refusées pour Zelart. Réautorisez-les dans les réglages du
          téléphone (Réglages → Notifications → Zelart Pro), puis revenez ici.
        </p>
      )}

      {etat === "inactif" && (
        <button type="button" onClick={activer} disabled={enCours} className={`${bouton} bg-pink-500 text-white hover:bg-pink-600`}>
          {enCours ? "Activation…" : "🔔 Activer les notifications sur cet appareil"}
        </button>
      )}

      {etat === "actif" && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-emerald-50 px-4 py-2 font-medium text-emerald-800">
            🔔 Notifications actives sur cet appareil
          </span>
          <button type="button" onClick={tester} disabled={enCours} className={`${bouton} border border-pink-200 text-pink-600 hover:bg-pink-50`}>
            Envoyer un test
          </button>
          <button type="button" onClick={desactiver} disabled={enCours} className={`${bouton} text-foreground/50 underline`}>
            Désactiver
          </button>
        </div>
      )}

      {message && <p role="status" className="text-foreground/70">{message}</p>}
    </div>
  );
}
