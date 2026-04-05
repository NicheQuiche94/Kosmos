export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return await Notification.requestPermission();
}

export function scheduleDebriefNotification(hour: number = 21, minute: number = 0) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const now = new Date();
  const todayKey = `kosmos_debrief_notified_${now.toISOString().slice(0, 10)}`;

  // Check if already notified today
  if (localStorage.getItem(todayKey)) return;

  // Check if current time is within a 5-minute window of target
  const targetMinutes = hour * 60 + minute;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const diff = currentMinutes - targetMinutes;

  if (diff >= 0 && diff < 5) {
    localStorage.setItem(todayKey, "true");

    const notification = new Notification("KosmOS Daily Debrief", {
      body: "Time to review your day. Let's see what needs logging.",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
    });

    notification.onclick = () => {
      window.focus();
      window.location.href = "/debrief";
      notification.close();
    };
  }
}

export async function initNotifications() {
  await requestNotificationPermission();
  scheduleDebriefNotification(21, 0);
}
