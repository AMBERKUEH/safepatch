# SafePath AI – What Runs & What You See

## Can run? **Yes**

1. **Backend** (for live dashboard, AI API, real-time):
   ```bash
   cd server
   npm install
   npm run dev
   ```
   → Runs at http://localhost:3001

2. **Frontend**:
   ```bash
   npm install
   npm run dev
   ```
   → App at http://localhost:5173

---

## AR? **Yes (camera view with AR overlay)**

The **Navigate** tab now has two modes:

- **Mapped** mode: top‑down 2D floor plan, tap to set your position, blue path + arrows on the map, distance and “Turn left/right” text.
- **Vision / AR** mode: camera view with AR arrows overlay, mini-map, and **gesture-based SOS** using MediaPipe hand tracking.

---

## What you see when you run (current stuff)

### 1. **Home**
- SafePath AI hero.
- Feature cards: Smart Navigation, AI Assistant, Emergency Aid.

### 2. **Navigate**
- **2D floor plan** (canvas):
  - Gray grid, walls (gray), fire zone (orange with 🔥).
  - **Green square** = exit (🚪).
  - **Orange dot (👤)** = your position (tap anywhere to move it).
  - **Blue dashed path** with small arrows = safe route from you to exit.
- Cards: Distance (meters), Direction (e.g. “Turn Right →”).
- “Fire Detected” alert, “Next Step” instruction, “Active Hazards”.
  - Tip: “Tap anywhere to update your position.”

- **Vision / AR mode**:
  - Camera feed with AR arrow overlay pointing to the next waypoint.
  - Mini-map in the corner with your location, route, and hazards.
  - Gesture-based SOS: 👍 Confirm / safe, ✊ **SOS**, etc., integrated into the AR HUD.

### 3. **Emergency**
- Quick actions: CPR Guide, Call 911, **Send SOS**, First Aid.
- CPR steps (Check responsiveness → Call 911 → Position hands → Compressions).
- Emergency contacts, safety tips.

### 4. **Dashboard** (needs backend)
- “Responder Dashboard” with Live / Connecting.
- If backend is running: list of occupants, hazards, building area, stats (Total, Evacuating, SOS, Safe).
- If backend is off: message to run `cd server && npm run dev`.

### 5. **Floating AI** (bottom-right)
- Chat with SafePath AI; quick replies (“I’m scared”, “Where is exit?”, etc.).
- Uses backend AI when available, else built‑in replies.

---

## Summary

| Feature            | Status   | What you see |
|--------------------|----------|--------------|
| Run app            | ✅       | Frontend + backend as above |
| 2D navigation map  | ✅       | Floor plan, path, tap to move |
| AR (camera + overlay) | ✅    | Camera + AR arrows + mini-map |
| Gestures + SOS     | ✅       | Integrated into AR Vision mode |
| AI companion       | ✅       | Floating chat + optional backend |
| Responder dashboard | ✅       | When server running |

To **add AR later**: we’d add a “Vision” or “AR” mode (e.g. camera view + arrow overlay or WebXR) and keep the current 2D map as “Mapped” mode.
