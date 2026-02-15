# SafePath AI – Requirements vs Implementation

## ✅ Fully implemented

| Requirement | Status | Where |
|-------------|--------|--------|
| **Real-time evacuation navigation** | ✅ | NavigationPage: A* pathfinding, floor plan, tap-to-set position, distance/direction |
| **Dynamic pathfinding (A*)** | ✅ | `src/app/utils/pathfinding.ts` – recalculates when position/obstacles change |
| **Floor plan visualization** | ✅ | FloorPlan.tsx – 2D map, obstacles (fire/smoke/walls), path line |
| **Voice guidance (TTS)** | ✅ | useVoiceGuidance.ts – Web Speech API, used by AICompanion |
| **AI emergency companion** | ✅ | AICompanion, FloatingAIAssistant – backend API + local fallback, calming replies |
| **Touchless gesture control (MediaPipe)** | ✅ | useGestureRecognition.ts + GestureControl.tsx – Thumbs up, Palm, Fist, Point, Victory |
| **Emergency responder dashboard** | ✅ | ResponderDashboard + DashboardPage – live occupants, hazards, status (Socket.io) |
| **Backend integration** | ✅ | Express + Socket.io – position, SOS, hazards, AI chat API |
| **SOS to responders** | ✅ | EmergencyPage “Send SOS” + socket; Dashboard shows SOS users |
| **CPR / first-aid steps** | ✅ | EmergencyPage (inline CPR steps) + CPRGuide component (compression counter, BPM) |

## ⚠️ Implemented but not wired in the UI

| Feature | Status | What to do |
|---------|--------|------------|
| **Real gesture control on Gesture page** | ⚠️ | GesturePage shows static list only; it does **not** use `GestureControl` (MediaPipe). Wire GesturePage to use `<GestureControl>` and connect gestures (e.g. fist → SOS). |
| **CPRGuide component** | ⚠️ | CPRGuide has full steps + compression counter but is **not** used in the app. EmergencyPage has its own inline CPR. Either use CPRGuide on Emergency page or keep current flow. |

## ❌ Not implemented (optional / hackathon stretch)

| Requirement | Doc reference | Notes |
|-------------|----------------|--------|
| **AR overlay (camera + arrows)** | “AR overlay” / “React Three Fiber” | 2D map only; no WebXR/AR. Optional for demo. |
| **Wave gesture** | “Wave – Signal visibility to rescuers” | MediaPipe gesture set has Victory, not Wave. Could add custom wave detection if needed. |
| **Pinch (zoom map)** | “Pinch – Zoom map” | Not in current gesture set. |
| **Accessibility modes** | “Wheelchair: avoid stairs; Elderly: slower/louder; Visually impaired: audio+haptic” | No profile or routing adaptations yet. |
| **Indoor positioning (beacons/sensors)** | “WiFi/Bluetooth beacons or smartphone sensors” | Simulated with tap-to-set position only. |
| **Congestion avoidance** | “Routes away from crowded exits” | Pathfinding ignores other occupants; single-user routing only. |
| **CPR hand-placement verification (MediaPipe)** | “Motion tracking to verify hand position” | CPR steps and BPM only; no hand overlay/verification. |

## What you should do next

1. **Wire real gestures on the Gesture page**  
   Use `GestureControl` on GesturePage and connect:
   - **Closed fist** → send SOS (and e.g. show “SOS sent”).
   - **Thumbs up** → confirm route / continue.
   - **Open palm** → repeat instruction (e.g. re-speak last step).
   So the “Gesture” tab actually runs MediaPipe and drives actions.

2. **Optional**  
   - Use `CPRGuide` on the Emergency page instead of (or in addition to) the inline CPR for a single, consistent CPR flow.
   - Add a short “Accessibility” note or toggle (e.g. “Wheelchair / reduced mobility” with “prefer ramps” in the narrative) for the pitch; full routing can stay post-hackathon.
   - If judges care about “wave to rescuers”, add a short note that it’s a planned gesture or implement a simple wave detection.

After wiring GesturePage to GestureControl and SOS, the main hackathon features (navigation, gestures, AI, dashboard, CPR, backend) are covered; the rest are stretch/optional.
