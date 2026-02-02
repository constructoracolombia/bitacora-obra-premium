export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const perm = await Notification.requestPermission();
  return perm === "granted";
}

export function showNotification(
  title: string,
  options?: NotificationOptions
): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  new Notification(title, {
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    ...options,
  });
}

export async function notifyPedidoAprobado(item: string): Promise<void> {
  const ok = await requestNotificationPermission();
  if (ok) {
    showNotification("Pedido aprobado", {
      body: `El pedido "${item}" ha sido aprobado.`,
      tag: "pedido-aprobado",
    });
  }
}

export async function notifyProyectoRetrasado(cliente: string): Promise<void> {
  const ok = await requestNotificationPermission();
  if (ok) {
    showNotification("Proyecto retrasado", {
      body: `El proyecto "${cliente}" está retrasado respecto al cronograma.`,
      tag: "proyecto-retrasado",
    });
  }
}
