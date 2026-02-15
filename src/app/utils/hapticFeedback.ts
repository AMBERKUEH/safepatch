/**
 * SOS morse pattern: ... --- ...
 * 3 short (200ms), 3 long (500ms), 3 short (200ms)
 * Gaps: 100ms between pulses
 */
const SOS_PATTERN = [
  200, 100, 200, 100, 200, 100, // ...
  500, 100, 500, 100, 500, 100, // ---
  200, 100, 200, 100, 200,
];

let sosIntervalId: ReturnType<typeof setInterval> | null = null;

export function sosVibrationPattern(): void {
  if (!navigator.vibrate) return;
  navigator.vibrate(SOS_PATTERN);
}

/**
 * Repeat SOS pattern every 5 seconds until stopped.
 * Call stopSOSVibrationLoop() to cancel.
 */
export function startSOSVibrationLoop(): void {
  sosVibrationPattern();
  if (sosIntervalId) clearInterval(sosIntervalId);
  sosIntervalId = setInterval(sosVibrationPattern, 5000);
}

export function stopSOSVibrationLoop(): void {
  if (sosIntervalId) {
    clearInterval(sosIntervalId);
    sosIntervalId = null;
  }
  if (navigator.vibrate) navigator.vibrate(0);
}
