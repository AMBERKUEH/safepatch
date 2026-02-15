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

## AR? **Not yet**

Right now there is **no AR** (no camera overlay, no WebXR, no 3D arrows in the real world).

- **Navigate** tab = **2D map only**: top‑down floor plan, tap to set your position, blue path + arrows on the map, distance and “Turn left/right” text.
- So: **you can run the app and use it, but AR is not implemented.**

---

## What you see when you run (current stuff)

### 1. **Home**
- SafePath AI hero, stats (Response Time, Users Protected, Success Rate).
- Feature cards: Smart Navigation, Gesture Control, AI Assistant, Emergency Aid.
- “Start Emergency Mode” button.

### 2. **Navigate**
- **2D floor plan** (canvas):
  - Gray grid, walls (gray), fire zone (orange with 🔥).
  - **Green square** = exit (🚪).
  - **Orange dot (👤)** = your position (tap anywhere to move it).
  - **Blue dashed path** with small arrows = safe route from you to exit.
- Cards: Distance (meters), Direction (e.g. “Turn Right →”).
- “Fire Detected” alert, “Next Step” instruction, “Active Hazards”.
- Tip: “Tap anywhere to update your position.”

### 3. **Gestures**
- “Enable Gesture Control” → turns on **camera + MediaPipe**.
- Live hand tracking; gestures: 👍 Confirm, ✋ Repeat, ✊ **SOS**, ☝️ Next step, ✌️ Victory.
- **Closed fist** sends SOS to the responder dashboard (if backend is running).

### 4. **Emergency**
- Quick actions: CPR Guide, Call 911, **Send SOS**, First Aid.
- CPR steps (Check responsiveness → Call 911 → Position hands → Compressions).
- Emergency contacts, safety tips.

### 5. **Dashboard** (needs backend)
- “Responder Dashboard” with Live / Connecting.
- If backend is running: list of occupants, hazards, building area, stats (Total, Evacuating, SOS, Safe).
- If backend is off: message to run `cd server && npm run dev`.

### 6. **Floating AI** (bottom-right)
- Chat with SafePath AI; quick replies (“I’m scared”, “Where is exit?”, etc.).
- Uses backend AI when available, else built‑in replies.

---

## Summary

| Feature            | Status   | What you see |
|--------------------|----------|--------------|
| Run app            | ✅       | Frontend + backend as above |
| 2D navigation map  | ✅       | Floor plan, path, tap to move |
| AR (camera + 3D)   | ❌       | Not implemented yet |
| Gestures + SOS     | ✅       | Camera, fist = SOS to dashboard |
| AI companion       | ✅       | Floating chat + optional backend |
| Responder dashboard | ✅       | When server running |

To **add AR later**: we’d add a “Vision” or “AR” mode (e.g. camera view + arrow overlay or WebXR) and keep the current 2D map as “Mapped” mode.
