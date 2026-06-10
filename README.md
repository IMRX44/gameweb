# 🌌 Nebula Conquest

A real-time, multiplayer **space strategy** game that runs in the browser.
Capture planets, grow your fleets, forge and break alliances, and dominate the galaxy.

Inspired by OpenFront / Galcon — but in space, with a neon look and a
**fair, cosmetics-only monetization model (no pay-to-win)**.

## ✨ Features

- ⚡ **Real-time multiplayer** with an authoritative server (anti-cheat by design).
- 🪐 **Procedural galaxies** — every match is on a freshly generated star map.
- 🤖 **Bots** fill empty seats so a match is always playable solo.
- 🎨 **PixiJS neon rendering** — glowing planets, animated fleets, parallax starfield.
- 💎 **Cosmetics-only shop** — ship skins, planet themes, trails, nameplates. Zero gameplay advantage.
- 📈 **Optimized netcode** — compact state snapshots at a fixed tick rate.

## 🧱 Tech stack

| Layer      | Tech                                        |
| ---------- | ------------------------------------------- |
| Frontend   | React + Vite + TypeScript + **PixiJS**      |
| Realtime   | **Socket.IO** (WebSocket)                   |
| Backend    | Node.js (authoritative game loop)           |
| Shared     | Pure-JS game constants & helpers            |

## 🚀 Getting started

```bash
npm install          # installs all workspaces
npm run dev          # runs server (:3001) + client (:5173)
```

Then open http://localhost:5173

### Production

```bash
npm run build        # builds the client into client/dist
npm start            # serves the game + API on PORT (default 3001)
```

## 🗂️ Project layout

```
nebula-conquest/
├── shared/      # constants + pure helpers used by client & server
├── server/      # authoritative simulation + Socket.IO
└── client/      # React UI + PixiJS renderer
```

## 💸 Monetization design (fair by default)

Everything purchasable is **purely visual**:

- Ship/fleet skins & trails
- Planet & nebula color themes
- Animated nameplates and victory emotes
- Cosmetic season pass

No stat boosts, no faster production, no extra starting ships — skill decides matches.
The store is wired to a pluggable `payments` provider (Stripe-ready) but ships with a
sandbox provider so you can run it locally with fake currency.
