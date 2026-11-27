// Service worker de l'application gérante Zelart : il reçoit les
// notifications et ouvre la bonne page quand Zélia les touche.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let donnees = {};
  try {
    donnees = event.data ? event.data.json() : {};
  } catch {
    donnees = { titre: "Zelart", corps: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(donnees.titre || "Zelart", {
      body: donnees.corps || "",
      icon: "/gerante/icone-192.png",
      badge: "/gerante/icone-192.png",
      tag: donnees.tag,
      data: { url: donnees.url || "/admin" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/admin", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((fenetres) => {
      for (const fenetre of fenetres) {
        if (fenetre.url.startsWith(self.location.origin + "/admin") && "focus" in fenetre) {
          fenetre.navigate(url);
          return fenetre.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
