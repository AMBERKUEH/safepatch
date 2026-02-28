# SafePath AI – Emergency Evacuation System

Real-time intelligent emergency evacuation with navigation (2D + AR + gesture SOS), AI companion, and responder dashboard.

## Features
- **Real-Time Navigation**: 2D and AR indoor routing to safety.
- **AI Companion**: Gemini-powered conversational AI for emergency guidance.
- **Responder Dashboard**: Live monitoring of occupants, hazards, and SOS signals.
- **Gesture SOS**: Hands-free distress signaling.

## Running the app (frontend + backend)

1. **Install dependencies**
   - Root (frontend): `npm i`
   - Backend: `cd server && npm i`

2. **Start the backend** (required for live dashboard, AI API, and real-time updates)
   ```bash
   cd server && npm run dev
   ```
   Server runs at `http://localhost:3001`.

3. **Start the frontend**
   ```bash
   npm run dev
   ```
   App runs at `http://localhost:5173`. Vite proxies `/api` and `/socket.io` to the backend.

## Environment Variables

To use the full Gemini AI capabilities, configure your API key in `server/.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3001
```

## Project structure

- `src/app/` – React app (pages, components, hooks, utils)
- `src/app/api/client.ts` – API client (e.g. `/api/ai/chat`)
- `src/app/hooks/useSocket.ts` – Socket.io hook (occupants, hazards, position, SOS)
- `server/` – Node.js backend (Express + Socket.io, Gemini integration)

## Future Roadmap

- [ ] **Offline Mode Capability**: Allowing basic navigation and emergency instructions even when network connectivity is lost.
- [ ] **Wearable Integration**: Syncing with smartwatches for haptic feedback during navigation and biometric monitoring.
- [ ] **Multi-Building Support**: Expanding the indoor mapping system to handle complex campus environments and multi-floor synchronized routing.
- [ ] **Predictive Hazard AI**: Analyzing sensor data to predict fire spread or structural risks before they escalate.
- [ ] **Multi-Language Support**: Real-time translation of AI instructions for diverse populations.
