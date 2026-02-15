# Cursor Prompts for SafePath AI (Adapted to This Codebase)

Use these in Cursor chat: copy a block, paste, and let Cursor apply changes. Paths and file names match this project.

**This project uses:** `src/app/`, TypeScript (`.ts`/`.tsx`), Vite, MediaPipe (`useGestureRecognition.ts`), Socket.io (backend in `server/`), Web Speech API (`useVoiceGuidance.ts`), A* in `src/app/utils/pathfinding.ts`.

---

## Quick reference: existing files

| Purpose | File |
|--------|------|
| Gesture detection | `src/app/hooks/useGestureRecognition.ts` |
| Gesture UI | `src/app/components/GestureControl.tsx` |
| Voice (TTS) | `src/app/hooks/useVoiceGuidance.ts` |
| Pathfinding | `src/app/utils/pathfinding.ts` |
| Real-time (Socket.io) | `src/app/hooks/useSocket.ts`, `server/index.js` |
| AI chat API | `src/app/api/client.ts`, `server/routes/ai.js` |
| Dashboard | `src/app/components/ResponderDashboard.tsx`, `src/app/components/pages/DashboardPage.tsx` |
| Floor plan | `src/app/components/FloorPlan.tsx` |

---

## Gesture & emergency

### Fist gesture: SOS + sound + vibration + screen flash

```
When the user makes a CLOSED_FIST gesture, trigger full emergency SOS in this app.

1. In src/app/components/GestureControl.tsx (or wherever onGesture(gesture) is handled), when gesture === 'closed_fist':
   - Call the existing sendSOS() from useSocket() (already used on GesturePage).
   - Play a short emergency alarm sound (use Audio with a data URL or public asset like /sounds/sos.mp3).
   - If navigator.vibrate exists, vibrate SOS pattern: [200,100,200,100,200, 500,100,500,100,500, 200,100,200,100,200] (morse ... --- ...).
   - Flash the screen red 3–6 times (e.g. add a full-screen overlay that toggles opacity).
2. Show a small confirmation: "SOS sent - Help is on the way" (toast or inline message).
3. Keep using the existing Socket.io emit('sos') so the responder dashboard still updates.

Do not add Firebase unless we add it later; keep using Socket.io for real-time.
```

### SOS vibration utility

```
Add a small utility for SOS haptic feedback in this project.

Create src/app/utils/hapticFeedback.ts:

- Function: sosVibrationPattern(): void
- Use navigator.vibrate([200,100,200,100,200, 500,100,500,100,500, 200,100,200,100,200]) for SOS (... --- ...).
- If vibrate is not supported, no-op.
- Optional: export startSOSVibrationLoop() that repeats every 5 seconds until stopSOSVibrationLoop() is called (clear interval on stop).

Use TypeScript. No dependencies.
```

### Change gesture sensitivity

```
In src/app/hooks/useGestureRecognition.ts, adjust gesture detection sensitivity.

Currently the recognizer is created with createFromOptions and results use a score check (e.g. > 0.7).

1. Find where gesture score/categoryName is used (e.g. detectedGesture.score > 0.7).
2. Change the threshold to 0.5 (more sensitive) or 0.85 (less sensitive). Expose this as a constant at the top of the file so it's easy to tune.
3. If there are other confidence/minDetectionConfidence options in the MediaPipe GestureRecognizer options, add a comment listing the current value so we can adjust later.
```

---

## Voice guidance

### Change voice speed

```
In src/app/hooks/useVoiceGuidance.ts, make the voice speed configurable.

Currently utterance.rate is set to message.urgent ? 1.1 : 0.95.

1. Add an optional rate parameter to VoiceMessage (e.g. rate?: number).
2. If provided, use it; otherwise keep current behavior (urgent 1.1, normal 0.95).
3. Add a short comment at the top of the file: "To make all guidance slower use rate 0.85; faster use 1.1."
```

### Repeat last message on open palm

```
When the user shows OPEN_PALM gesture, repeat the last spoken instruction.

1. In useVoiceGuidance.ts, add a way to get and re-speak the last message (e.g. store lastSpokenText in a ref and export a function repeatLast() that calls speak with that text).
2. In the place where gestures are handled (e.g. GesturePage or GestureControl's onGesture), when gesture === 'open_palm', call this repeat function.
3. Ensure we only repeat if there was a previous message (no-op if none).
```

---

## Navigation & pathfinding

### Turn-by-turn directions from path

```
Generate short turn-by-turn direction strings from the path used in NavigationPage.

1. Create src/app/utils/directionsGenerator.ts (TypeScript).
2. Function: getDirectionText(segmentStart: Point, segmentEnd: Point, nextPoint?: Point): string
   - Given two consecutive path points (and optionally the next), return strings like "Walk straight for 15 meters", "Turn left at the next corridor", "Turn right", "Exit ahead on your right".
   - Use simple angle/direction logic (e.g. dot product or atan2) to classify straight / left / right.
3. Export a function that takes the full path (array of Point from pathfinding) and returns an array of { distanceMeters: number, instruction: string } for each segment.
4. Use the existing Point type from src/app/utils/pathfinding.ts.
```

### Dynamic rerouting when hazards change

```
When hazards change (e.g. from Socket.io or local state), recalculate the route in the navigation screen.

1. In src/app/components/pages/NavigationPage.tsx, hazards are currently the static OBSTACLES array.
2. Use the existing useSocket() hook to get hazards from the server (or merge server hazards with local OBSTACLES).
3. When hazards (or userPosition) change, recompute the path with findPath from src/app/utils/pathfinding.ts (already used there).
4. Optionally trigger a short voice line via useVoiceGuidance: "Route updated. New hazard ahead." when the path actually changes (compare previous path to new path).
```

---

## Mode switching (Mapped vs Vision)

### Building / mode indicator component

```
Add a small component that shows the current navigation mode.

Create src/app/components/ModeIndicator.tsx (TypeScript):

- Props: mode: 'MAPPED' | 'VISION'
- When MAPPED: show text "Building recognized – optimal routing" with a map icon, green styling.
- When VISION: show text "Vision AI mode – point camera for exit signs" with a camera icon, blue styling.
- Use a simple animated transition (e.g. fade or slide) when mode changes.
- Use existing UI primitives from src/app/components/ui/ (e.g. Card, Badge) and Tailwind.
```

### Simple mode switch (no backend yet)

```
Add a manual toggle between "Mapped" and "Vision" mode for the navigation screen.

1. In App.tsx or NavigationPage, add local state: navigationMode: 'MAPPED' | 'VISION'.
2. When MAPPED, show the existing NavigationPage (floor plan + pathfinding).
3. When VISION, show a placeholder component (e.g. a card saying "Vision mode – exit sign detection coming soon" and maybe a camera placeholder).
4. Add a toggle or tab so the user can switch. Use the ModeIndicator component if it exists.
```

---

## Position & manual selection

### Manual position selector

```
Add a way for users to set their position manually on the map.

1. Create src/app/components/PositionSelector.tsx (TypeScript).
2. Show a list or dropdown of "areas" or predefined points (e.g. Room A, Hallway B, Lobby) that map to {x, y} on the existing floor plan (use same coordinates as in NavigationPage: BUILDING_WIDTH 600, BUILDING_HEIGHT 400).
3. On "Set position" or "Start here", call an onSelect(position: Point) callback with the chosen point.
4. In NavigationPage, add a button or modal that opens PositionSelector; when user selects, set userPosition and close. Use existing Point type from pathfinding.
```

---

## Responder dashboard

### Priority list for emergencies

```
On the responder dashboard, show occupants sorted by priority.

1. In src/app/components/ResponderDashboard.tsx, we already receive users (occupants) and hazards.
2. Sort the displayed list so that status 'sos' is first, then 'evacuating', then 'safe', then 'offline'.
3. Optionally add a short label like "Critical", "Evacuating", "Safe" next to each. For SOS, use a red badge and optional pulse animation.
4. Keep the rest of the dashboard layout the same; only change the order and optional labels.
```

### Live map with user dots

```
Show occupant positions on the floor plan in the responder dashboard.

1. In DashboardPage or ResponderDashboard, we have occupants (with position: {x, y}) and buildingArea.
2. Add a small canvas or overlay on top of the existing floor plan (or reuse FloorPlan with a prop to show user dots).
3. For each occupant, draw a dot at position (scaled to the map size). Color by status: green evacuating, yellow needs help, red SOS.
4. Use the same BUILDING_WIDTH/BUILDING_HEIGHT or buildingArea from useSocket so coordinates match.
```

---

## Vision AI (optional / future)

### Exit sign detection (placeholder + API shape)

```
Add a placeholder for exit sign detection that we can plug into later.

1. Create src/app/utils/exitSignDetection.ts (TypeScript).
2. Export an async function detectExitSign(imageOrVideoFrame: ImageData | HTMLVideoElement): Promise<{ found: boolean; direction?: 'left'|'right'|'straight'; boundingBox?: { x, y, width, height } }>.
3. For now, return { found: false } (no real Vision API). Add a comment: "TODO: integrate Google Cloud Vision or similar; look for text EXIT, 出口, KELUAR, sortie, salida."
4. So the rest of the app can call this and we can add real detection later without changing call sites.
```

---

## Integration prompts

### Connect thumbs up to “confirm route”

```
When the user shows THUMBS_UP gesture, confirm the current route and speak once.

1. In src/app/components/pages/GesturePage.tsx, handleGesture already receives gestures. Add a case for 'thumbs_up'.
2. When thumbs_up: call the speak function from useVoiceGuidance (you may need to pass it down or use the hook in a parent that can pass a callback). Say: "Route confirmed. Follow the path."
3. Do not start navigation; just one-time confirmation and voice feedback.
```

### Connect open palm to “repeat instruction”

```
When the user shows OPEN_PALM gesture, repeat the last navigation or AI instruction.

1. In useVoiceGuidance (src/app/hooks/useVoiceGuidance.ts), add support for repeating the last spoken message (e.g. store last text in a ref, export repeatLast()).
2. In GesturePage (or wherever onGesture is), when gesture === 'open_palm', call this repeat function.
3. If there was no previous message, either no-op or speak "No previous instruction."
```

---

## Quick fixes (exact locations)

### Gesture confidence

```
In src/app/hooks/useGestureRecognition.ts, find where we check detectedGesture.score (e.g. > 0.7). Change the threshold to 0.5 for more sensitivity or 0.9 for less. Define it as a constant GESTURE_CONFIDENCE_THRESHOLD at the top of the file.
```

### Voice rate

```
In src/app/hooks/useVoiceGuidance.ts, find utterance.rate = message.urgent ? 1.1 : 0.95. Change to 0.9 for slower, 1.0 for normal, or 1.2 for faster. Add a one-line comment above it.
```

---

## How to use in Cursor

1. Copy one full prompt block (from a `---` section or the whole block for one feature).
2. Open Cursor chat (Ctrl+L or Cmd+L).
3. Paste and send. Cursor will create or edit files.
4. Review the diff and run the app (`npm run dev` in root, `npm run dev` in `server/`) to test.
5. Iterate by re-pasting with small tweaks (e.g. "use 0.85 for voice rate" or "sort by distanceToExit for SOS first").

---

## Tech notes for this repo

- **Real-time:** Socket.io in `server/index.js` and `useSocket.ts`. No Firebase in the base setup.
- **Paths:** All app code under `src/app/` (components, hooks, utils, api).
- **Types:** Use `Point`, `Obstacle` from `src/app/utils/pathfinding.ts` where relevant.
- **UI:** Use existing components from `src/app/components/ui/` and Tailwind; keep mobile-friendly layout.

If you add Firebase later, you can replace or mirror Socket.io events with Firebase Realtime Database and keep the same UI components.
