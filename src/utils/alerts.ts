let audioContext: AudioContext | null = null;

export function playChime(): void {
  try {
    audioContext ??= new AudioContext();
    const context = audioContext;
    const start = context.currentTime;

    [660, 880].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const noteStart = start + index * 0.18;
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.18, noteStart + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.32);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteStart + 0.34);
    });
  } catch (error) {
    console.warn("Unable to play alert sound.", error);
  }
}

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  return (await Notification.requestPermission()) === "granted";
}

export function showPostureNotification(body: string): void {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  try {
    new Notification("ErgoVision: поправьте посадку", { body, tag: "ergovision-posture", silent: true });
  } catch (error) {
    console.warn("Unable to show notification.", error);
  }
}
