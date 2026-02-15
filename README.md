
  # SafePath AI – Emergency Evacuation System

  Real-time intelligent emergency evacuation with navigation, gesture control, AI companion, and responder dashboard.

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

  ## Optional: OpenAI for AI companion

  To use real AI instead of built-in fallback responses, set in `server/.env`:
  ```env
  OPENAI_API_KEY=sk-...
  ```

  ## Project structure

  - `src/app/` – React app (pages, components, hooks, utils)
  - `src/app/api/client.ts` – API client (e.g. `/api/ai/chat`)
  - `src/app/hooks/useSocket.ts` – Socket.io hook (occupants, hazards, position, SOS)
  - `server/` – Node.js backend (Express + Socket.io, optional OpenAI route)
  