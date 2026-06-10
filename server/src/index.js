// Nebula Conquest server entry point.
// - Express for the REST API (accounts, shop, payments) and static client.
// - Socket.IO for the realtime match protocol.

import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import express from 'express';
import { Server as SocketServer } from 'socket.io';

import { MSG } from '@nebula/shared/constants.js';
import { COSMETICS, CRYSTAL_BUNDLES } from '@nebula/shared/cosmetics.js';
import * as accounts from './store/accounts.js';
import { createPaymentsProvider } from './store/payments.js';
import { RoomManager } from './net/RoomManager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const app = express();
app.use(express.json());

const payments = createPaymentsProvider();

// ---------- REST API ----------
const api = express.Router();

// Create or resume a guest account. Client stores the returned token.
api.post('/auth/guest', (req, res) => {
  const { token, name } = req.body || {};
  const acc = accounts.getOrCreate(token, name);
  res.json({ token: acc.token, account: accounts.publicAccount(acc) });
});

api.get('/me', (req, res) => {
  const acc = accounts.getByToken(req.header('x-token'));
  if (!acc) return res.status(401).json({ error: 'no_account' });
  res.json({ account: accounts.publicAccount(acc) });
});

api.post('/me/name', (req, res) => {
  const acc = accounts.setName(req.header('x-token'), req.body?.name);
  if (!acc) return res.status(401).json({ error: 'no_account' });
  res.json({ account: accounts.publicAccount(acc) });
});

// Shop catalog (cosmetics + crystal bundles). Public.
api.get('/shop', (_req, res) => {
  res.json({ cosmetics: COSMETICS, bundles: CRYSTAL_BUNDLES });
});

api.post('/shop/buy', (req, res) => {
  const token = req.header('x-token');
  const result = accounts.purchaseCosmetic(token, req.body?.cosmeticId);
  if (!result.ok) return res.status(400).json(result);
  res.json(result);
});

api.post('/me/loadout', (req, res) => {
  const token = req.header('x-token');
  const { slot, cosmeticId } = req.body || {};
  const result = accounts.setLoadout(token, slot, cosmeticId);
  if (!result.ok) return res.status(400).json(result);
  res.json(result);
});

// Payments: create a checkout for a crystal bundle...
api.post('/pay/checkout', async (req, res) => {
  const token = req.header('x-token');
  if (!accounts.getByToken(token)) return res.status(401).json({ error: 'no_account' });
  const result = await payments.createCheckout({ bundleId: req.body?.bundleId, token });
  if (!result.ok) return res.status(400).json(result);
  res.json(result);
});

// ...and confirm it (sandbox completes instantly; Stripe would use a webhook).
api.post('/pay/confirm', async (req, res) => {
  const token = req.header('x-token');
  if (!accounts.getByToken(token)) return res.status(401).json({ error: 'no_account' });
  const { checkoutId, bundleId } = req.body || {};
  const result = await payments.confirm({ checkoutId, bundleId, token });
  if (!result.ok) return res.status(400).json(result);
  res.json(result);
});

app.use('/api', api);
app.get('/api/health', (_req, res) => res.json({ ok: true, ...roomManager.stats() }));

// ---------- Static client (production) ----------
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA fallback for client-side routing.
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ---------- HTTP + Socket.IO ----------
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: { origin: true, methods: ['GET', 'POST'] },
  // Keep payloads small; perMessageDeflate off for low-latency small msgs.
  perMessageDeflate: false,
});

const roomManager = new RoomManager(io);

io.on('connection', (socket) => {
  // The client authenticates the socket with its account token.
  socket.on(MSG.JOIN, (data, ack) => {
    const acc = accounts.getByToken(data?.token);
    if (!acc) {
      socket.emit(MSG.ERROR, { error: 'no_account' });
      if (typeof ack === 'function') ack({ ok: false, error: 'no_account' });
      return;
    }
    // Don't allow joining two rooms at once.
    const existing = roomManager.getBySocket(socket);
    if (existing) existing.removeHuman(socket.id);

    const mode = data?.mode === 'quick' ? 'quick' : 'online';
    const room = mode === 'quick'
      ? roomManager.createQuick(socket, acc)
      : roomManager.joinOnline(socket, acc);

    if (typeof ack === 'function') ack({ ok: true, roomId: room.id, mode });
  });

  socket.on(MSG.SEND_FLEET, (d) => {
    const room = roomManager.getBySocket(socket);
    if (room) room.handleFleet(socket.id, d?.from, d?.to, d?.ratio);
  });

  socket.on(MSG.ALLY, (d) => {
    const room = roomManager.getBySocket(socket);
    if (room) room.handleAlly(socket.id, d?.slot, d?.accept !== false);
  });

  socket.on(MSG.BREAK_ALLY, (d) => {
    const room = roomManager.getBySocket(socket);
    if (room) room.handleAlly(socket.id, d?.slot, false);
  });

  socket.on(MSG.CHAT, (d) => {
    const room = roomManager.getBySocket(socket);
    if (room) room.handleChat(socket.id, d?.text);
  });

  socket.on('disconnect', () => {
    roomManager.handleDisconnect(socket);
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`🌌 Nebula Conquest server listening on :${PORT}`);
});
