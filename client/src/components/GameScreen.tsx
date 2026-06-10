import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { net } from '../net';
import { Renderer } from '../game/Renderer';
import type { GameResults, LobbyState, PlayerInfo, Snapshot, StartPayload } from '../types';
import { HUD, type Standing } from './HUD';
import { GameOver } from './GameOver';

type Phase = 'searching' | 'lobby' | 'playing' | 'over';

interface Props {
  mode: 'quick' | 'online';
  onExit: () => void;
}

export function GameScreen({ mode, onExit }: Props) {
  const { t } = useI18n();

  const [phase, setPhase] = useState<Phase>('searching');
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [results, setResults] = useState<GameResults | null>(null);
  const [connected, setConnected] = useState(false);
  const [selected, setSelected] = useState<{ id: number; ships: number; ownerSlot: number } | null>(null);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [mine, setMine] = useState({ planets: 0, ships: 0 });
  const [alliedSlots, setAlliedSlots] = useState<number[]>([]);
  const [chat, setChat] = useState<{ from: string; slot: number; text: string }[]>([]);
  const [ratio, setRatio] = useState(0.5);

  const rendererRef = useRef<Renderer | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const startRef = useRef<StartPayload | null>(null);
  const playersRef = useRef<PlayerInfo[]>([]);
  const youSlotRef = useRef(-1);
  const youIdRef = useRef('');
  const ratioRef = useRef(0.5);
  const pendingSnapRef = useRef<Snapshot | null>(null);
  const mountingRef = useRef(false);

  ratioRef.current = ratio;

  // Recompute leaderboard + personal totals + alliances from a snapshot.
  const ingestSnapshot = useCallback((snap: Snapshot) => {
    const bySlot = new Map<number, { planets: number; ships: number }>();
    for (const [, ownerSlot, ships] of snap.p) {
      if (ownerSlot < 0) continue;
      const cur = bySlot.get(ownerSlot) || { planets: 0, ships: 0 };
      cur.planets += 1;
      cur.ships += ships;
      bySlot.set(ownerSlot, cur);
    }
    const list: Standing[] = playersRef.current.map((p) => ({
      slot: p.slot,
      name: p.name,
      isBot: p.isBot,
      planets: bySlot.get(p.slot)?.planets || 0,
      ships: bySlot.get(p.slot)?.ships || 0,
    }));
    list.sort((a, b) => b.planets - a.planets || b.ships - a.ships);
    setStandings(list);
    const me = bySlot.get(youSlotRef.current);
    setMine({ planets: me?.planets || 0, ships: me?.ships || 0 });

    // Alliances involving me.
    const allied: number[] = [];
    const idToSlot = new Map(playersRef.current.map((p) => [p.id, p.slot]));
    for (const key of snap.a) {
      const [a, b] = key.split('|');
      if (a === youIdRef.current || b === youIdRef.current) {
        const other = a === youIdRef.current ? b : a;
        const s = idToSlot.get(other);
        if (s != null) allied.push(s);
      }
    }
    setAlliedSlots(allied);
  }, []);

  const mountRenderer = useCallback(async () => {
    if (mountingRef.current || rendererRef.current || !canvasRef.current || !startRef.current) return;
    mountingRef.current = true;
    const r = new Renderer();
    await r.mount(canvasRef.current);
    r.getRatio = () => ratioRef.current;
    r.onSend = (from, to, rat) => net.sendFleet(from, to, rat);
    r.onSelect = (id, info) => setSelected(id != null && info ? { id, ...info } : null);
    r.setStart(startRef.current);
    if (pendingSnapRef.current) {
      r.applySnapshot(pendingSnapRef.current);
      ingestSnapshot(pendingSnapRef.current);
    }
    rendererRef.current = r;
    mountingRef.current = false;
  }, [ingestSnapshot]);

  // Wire socket handlers + join. Runs once per mount.
  useEffect(() => {
    let joined = false;

    net.setHandlers({
      onConnectionChange: (c) => {
        setConnected(c);
        if (c && !joined) {
          joined = true;
          net.join(mode);
        }
      },
      onLobby: (s) => {
        setLobby(s);
        if (s.phase === 'lobby' || s.phase === 'countdown') setPhase('lobby');
      },
      onStart: (s) => {
        startRef.current = s;
        playersRef.current = s.players;
        youIdRef.current = s.youId;
        youSlotRef.current = s.players.find((p) => p.id === s.youId)?.slot ?? -1;
        setPhase('playing');
      },
      onSnapshot: (snap) => {
        if (rendererRef.current) {
          rendererRef.current.applySnapshot(snap);
          ingestSnapshot(snap);
        } else {
          pendingSnapRef.current = snap;
        }
      },
      onEvent: (e) => rendererRef.current?.pushEvent(e),
      onGameOver: (r) => {
        setResults(r);
        setPhase('over');
      },
      onChat: (c) => setChat((prev) => [...prev.slice(-40), c]),
      onError: () => {},
    });

    net.connect();
    // If already connected (socket reused), join now.
    net.join(mode).then((ack) => {
      if (ack.ok) joined = true;
    });

    return () => {
      net.setHandlers({});
      rendererRef.current?.destroy();
      rendererRef.current = null;
      net.leave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Mount the Pixi renderer once we're playing and the canvas div exists.
  useEffect(() => {
    if (phase === 'playing') void mountRenderer();
  }, [phase, mountRenderer]);

  const onAlly = (slot: number, allied: boolean) => {
    if (allied) net.breakAlly(slot);
    else net.proposeAlly(slot);
  };

  const sendChat = (text: string) => net.chat(text);

  const showCanvas = phase === 'playing' || phase === 'over';

  return (
    <div className="game-screen">
      {showCanvas && <div className="pixi-host" ref={canvasRef} />}

      {(phase === 'searching' || phase === 'lobby') && (
        <div className="lobby-overlay">
          <div className="lobby-card">
            <h2>{t(mode === 'quick' ? 'lobby.mode.quick' : 'lobby.mode.online')}</h2>
            {!connected && <p className="muted">{t('net.connecting')}</p>}
            {connected && lobby?.countdown != null ? (
              <div className="countdown">{t('lobby.startingIn', { n: lobby.countdown })}</div>
            ) : (
              <p className="muted">{t('net.searching')}</p>
            )}
            {lobby && (
              <div className="lobby-players">
                <div className="lobby-players-head">{t('lobby.players', { n: lobby.players.length })}</div>
                <ul>
                  {lobby.players.map((p) => (
                    <li key={p.slot}>🧑‍🚀 {p.name}</li>
                  ))}
                </ul>
              </div>
            )}
            <button className="btn ghost" onClick={onExit}>
              {t('lobby.leave')}
            </button>
          </div>
        </div>
      )}

      {phase === 'playing' && (
        <HUD
          standings={standings}
          mine={mine}
          selected={selected}
          ratio={ratio}
          setRatio={setRatio}
          youSlot={youSlotRef.current}
          alliedSlots={alliedSlots}
          chat={chat}
          onAlly={onAlly}
          onChat={sendChat}
          onLeave={onExit}
          connected={connected}
        />
      )}

      {phase === 'over' && results && (
        <GameOver
          results={results}
          youId={youIdRef.current}
          onMenu={onExit}
        />
      )}
    </div>
  );
}
