# DrawRace — Human vs AI Drawing Game

One player draws, everyone else guesses — including an AI. Beat the AI to win!

## Quick Start (Local)

### Server
```bash
cd server
npm install
npm run dev
# Runs on http://localhost:3001
```

### Client
```bash
cd client
cp .env.example .env   # VITE_SERVER_URL=http://localhost:3001
npm install
npm run dev
# Runs on http://localhost:5173
```

Open two browser tabs at `http://localhost:5173` to test multiplayer.

---

## Deploy

### Server → Railway
1. Create a Railway project and link the `server/` directory
2. Set env var: `CLIENT_ORIGIN=https://your-vercel-url.vercel.app`
3. Deploy — Railway auto-detects Node.js

### Client → Vercel
1. Import the `client/` directory into Vercel
2. Set env var: `VITE_SERVER_URL=https://your-railway-url.railway.app`
3. Deploy

---

## How to Play
1. One player creates a room and shares the 6-character code
2. Others join with the code
3. Host picks 3–5 rounds and starts the game
4. Each round: the drawer gets a secret word and draws it on the canvas
5. All other players type guesses — so does the AI (TensorFlow.js)
6. First correct guess wins the round. Beat the AI for points!
7. Drawer rotates every round. Highest score after all rounds wins.

## Scoring
| Outcome | Guesser | Drawer |
|---|---|---|
| Human guesses BEFORE AI | +3 (1st) | +2 |
| Human guesses AFTER AI | +1 | +1 |
| AI guesses first | 0 | 0 |
| Nobody guesses | 0 | 0 |
